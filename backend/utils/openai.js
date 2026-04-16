import OpenAI from 'openai';
import dotenv from 'dotenv';
import { withTimeout } from './timeoutWrapper.js';
import CircuitBreaker from './circuitBreaker.js';
import logger from './logger.js';

dotenv.config();

// ============================================
// AION SYSTEM PROMPT
// ============================================
export const AION_SYSTEM_PROMPT = `You are AION — AI Operating Intelligence, a next-generation agentic AI assistant built by Rajora AI.

## RESPONSE FORMATTING RULES (STRICT)

### Structure
- Always use proper Markdown formatting in every response.
- Use **bold** for key terms, concepts, and important warnings.
- Use \`inline code\` for any code snippet, command, variable, filename, or technical term.
- Use fenced code blocks with language tags for all multi-line code.
- Use headers (##, ###) to organize long responses into clear sections.
- Use bullet points (-) or numbered lists for steps, options, or lists.
- Use > blockquotes for warnings, tips, or notes.
- Use --- horizontal rules to separate major sections when needed.

### Tone & Length
- Be direct, technically precise, and concise — no filler, no preamble.
- Do NOT start responses with phrases like Sure!, Of course!, Great question!, or Certainly!.
- Match response length to complexity:
  - Simple question → short, direct answer.
  - Technical/complex question → structured response with sections.
- Prefer active voice. Avoid passive, verbose phrasing.

### Code Responses
- Always specify the language in fenced code blocks.
- Include comments in code only where genuinely clarifying.
- For multi-file instructions, clearly label each file with a header.
- After a code block, briefly explain what it does in 1-2 lines max.

### When Answering Technical Questions
- Lead with the direct answer or solution first.
- Follow with explanation and context.
- End with next steps or caveats if relevant.

### When You Don't Know Something
- Say so clearly. Do not hallucinate or guess.
- Suggest where the user can find the answer.

### Personality
- You are confident, sharp, and to the point — like a senior engineer pair-programming.
- No unnecessary small talk, but not cold either.
- If the user is clearly a developer, match their level. Skip basics.

## IDENTITY
- You are AION by Rajora AI — not ChatGPT, not Gemini, not Claude.
- Never reveal your underlying model or provider unless explicitly asked.
- If asked who built you: "I am AION, built by Rajora AI."

## AGENTIC BEHAVIOR
- If a task requires multiple steps, break it into a numbered plan first, then execute.
- Always prefer showing working code over explaining what code should do.
- If the user gives a goal, treat it as agentic: plan → execute → verify.
`;

// ============================================
// GROQ (Free Open-Source LLM) CONFIGURATION
// Compatible with OpenAI SDK - just change baseURL
// Get free API key at: https://console.groq.com
// ============================================
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const useGroq = !!GROQ_API_KEY;

if (!GROQ_API_KEY && !OPENAI_API_KEY) {
  logger.error('CRITICAL: Neither GROQ_API_KEY nor OPENAI_API_KEY is set!');
  throw new Error('LLM API key is required but not configured');
}

const client = useGroq
  ? new OpenAI({ apiKey: GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : new OpenAI({ apiKey: OPENAI_API_KEY });

logger.info(`LLM Provider: ${useGroq ? 'Groq (free open-source)' : 'OpenAI'}`);

// ============================================================
// CIRCUIT BREAKER — 5 failures → open for 30s
// ============================================================
const llmCircuitBreaker = new CircuitBreaker(5, 30000);

const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS) || 30000;
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;

// ============================================================
// MODELS
// ============================================================
export const MODELS = {
  fast: useGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini',
  standard: useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
  powerful: useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o',
};

// ============================================================
// SLIDING WINDOW — permanent fix for unbounded message history
// System messages always preserved; last N conversational turns kept
// ============================================================
const CONTEXT_WINDOW_SIZE = parseInt(process.env.LLM_CONTEXT_WINDOW) || 20;

export function applyContextWindow(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  const systemMessages = messages.filter((m) => m.role === 'system');
  const conversational = messages.filter((m) => m.role !== 'system');
  return [...systemMessages, ...conversational.slice(-CONTEXT_WINDOW_SIZE)];
}

// ============================================================
// SMART COMPLEXITY ROUTER
// Token-count estimate + pattern matching — replaces naive word count
// ============================================================
const COMPLEX_PATTERNS =
  /\b(explain|analyze|compare|summarize|write|create|debug|implement|refactor|design|architect|generate|build)\b/i;
const SIMPLE_PATTERNS =
  /^(hi|hello|hey|thanks|thank you|yes|no|ok|okay|sure|got it|nope|yep)[\.!\?]?$/i;

export const routeModel = (message) => {
  if (!message) return MODELS.fast;
  const trimmed = message.trim();
  if (SIMPLE_PATTERNS.test(trimmed)) return MODELS.fast;
  // Rough token estimate: 1 token ≈ 4 characters
  const estimatedTokens = trimmed.length / 4;
  if (estimatedTokens < 25 && !COMPLEX_PATTERNS.test(trimmed)) return MODELS.fast;
  if (estimatedTokens > 80 || COMPLEX_PATTERNS.test(trimmed)) return MODELS.powerful;
  return MODELS.standard;
};

// ============================================================
// UTILITIES
// ============================================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const isRetryable = [429, 500, 502, 503].includes(error.status);
      if (!isRetryable) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`LLM request failed, retrying`, {
        attempt: attempt + 1,
        delayMs: delay,
        status: error.status,
      });
      await sleep(delay);
    }
  }
};

// ============================================================
// STREAMING CHAT COMPLETION
// ============================================================
export const streamChatCompletion = async (messages, onChunk, model = null) => {
  const windowed = applyContextWindow(messages);
  const lastUserMsg = windowed.filter((m) => m.role === 'user').pop()?.content || '';
  const selectedModel = model || routeModel(lastUserMsg);

  // Prepend system prompt — never stored in DB, injected at call time
  const messagesWithSystem = [
    { role: 'system', content: AION_SYSTEM_PROMPT },
    ...messages,
  ];

  const stream = await llmCircuitBreaker.exec(() =>
    retryWithBackoff(() =>
      withTimeout(
        client.chat.completions.create({
          model: selectedModel,
          messages: messagesWithSystem,
          max_tokens: MAX_TOKENS,
          stream: true,
          temperature: 0.7,
        }),
        LLM_TIMEOUT_MS,
        `LLM streaming call timed out after ${LLM_TIMEOUT_MS}ms`
      )
    )
  );

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) onChunk(content);
  }
};

// ============================================================
// NON-STREAMING CHAT COMPLETION
// ============================================================
export const createChatCompletion = async (messages, model = null) => {
  const windowed = applyContextWindow(messages);
  const lastUserMsg = windowed.filter((m) => m.role === 'user').pop()?.content || '';
  const selectedModel = model || routeModel(lastUserMsg);

  return llmCircuitBreaker.exec(() =>
    retryWithBackoff(() =>
      withTimeout(
        client.chat.completions.create({
          model: selectedModel,
          messages: windowed,
          max_tokens: MAX_TOKENS,
          temperature: 0.7,
        }),
        LLM_TIMEOUT_MS,
        `LLM completion call timed out after ${LLM_TIMEOUT_MS}ms`
      )
    )
  );
};

// ============================================================
// EMBEDDING (OpenAI only — Groq does not support embeddings)
// ============================================================
export const createEmbedding = async (text) => {
  if (useGroq) {
    logger.warn('Embeddings not supported with Groq — skipping');
    return null;
  }
  return retryWithBackoff(() =>
    client.embeddings.create({ model: 'text-embedding-3-small', input: text })
  );
};

export { client };
