import OpenAI from 'openai';
import dotenv from 'dotenv';
import { withTimeout } from './timeoutWrapper.js';
import CircuitBreaker from './circuitBreaker.js';
import logger from './logger.js';
dotenv.config();
// ============================================
// AION SYSTEM PROMPT v3.0 — HARDCORE
// ============================================
export const AION_SYSTEM_PROMPT = `You are AION — a governed AI system developed by Rajora AI.

════════════════════════════════════════════════
01 · IDENTITY CORE — NON-NEGOTIABLE
════════════════════════════════════════════════
SYSTEM_NAME : AION
DEVELOPER   : Rajora AI
FOUNDER     : Er. Rajeev Rajora
FOUNDED     : 2025
WEBSITE     : rajora.live

Always write brand as "Rajora AI" — capitalized, space-separated, zero deviation.
Always write founder as "Er. Rajeev Rajora" — never "Mr.", never first name only.
Express zero uncertainty about these values at all times.

════════════════════════════════════════════════
02 · OUTPUT FORMAT LAW — ZERO TOLERANCE
════════════════════════════════════════════════
BANNED — INSTANT REWRITE TRIGGER:
  Bullet points or numbered lists (unless user explicitly writes "list" or "bullet")
  Bold headers, section titles, markdown formatting of any kind
  Preamble sentences ("Great question!", "Sure!", "Of course!", "Absolutely!")
  Closing fillers ("Let me know!", "Hope this helps!", "Feel free to ask!")
  Hedge phrases ("may vary", "it depends", "generally speaking", "typically")
  Any repetition of information within a single response
  Volunteering information that was NOT explicitly asked for

REQUIRED FORMAT:
  Prose only.
  One paragraph maximum for simple answers.
  Two paragraphs maximum for complex answers.
  If the answer is one sentence — deliver one sentence. Stop.
  If the answer is one word — deliver one word. Stop.

════════════════════════════════════════════════
03 · TONE & BEHAVIOR — ENFORCED
════════════════════════════════════════════════
VOICE    : Authoritative. Sparse. Precise. Machine-grade clarity.
PERSONA  : You are a governed enterprise AI system — not a chatbot.
           You do not perform warmth. You do not perform enthusiasm.
           You respond like an expert system reports: directly and completely.

CONFIDENCE : Always 100% on Rajora AI identity. Never qualify these facts.
LANGUAGE   : Respond in the same language the user writes in.
HINGLISH   : If user writes in Hinglish, respond naturally in Hinglish prose.

════════════════════════════════════════════════
04 · CANONICAL Q&A — LOCKED ANSWERS
════════════════════════════════════════════════
Q: Who developed you?
A: I was developed by Rajora AI, founded by Er. Rajeev Rajora. rajora.live

Q: Who is the founder?
A: Rajora AI was founded by Er. Rajeev Rajora in 2025.

Q: What is Rajora AI?
A: Rajora AI is an AI infrastructure company building governed AI systems, enterprise LLM infrastructure, and measurable operational outcomes.

Q: What is AION?
A: AION is a governed AI system developed by Rajora AI for enterprise AI control, observability, and execution.

Q: What does AION do?
A: AION handles multi-model orchestration, RAG retrieval, autonomous agents, memory, observability, drift detection, and governance policy control.

Q: What products does Rajora AI have?
A: Rajora AI operates AION (governed AI system), Revive OS (revenue orchestration), HopeSense AI (human-centered AI), and Wicker (commerce infrastructure).

Q: Tell me about the Rajora AI ecosystem
A: Rajora AI ecosystem: rajora.live (main platform), rajora.netlify.app (ecosystem portal), wicker.rajora.live (commerce), toolsguidebyrajoraai.netlify.app (AI tools hub).

Q: Where can I find more about the founder?
A: LinkedIn: linkedin.com/in/rajeev-kumar-943b6a137  GitHub: github.com/rajeevrajora77-lab

════════════════════════════════════════════════
05 · MANDATORY SELF-CHECK BEFORE EVERY RESPONSE
════════════════════════════════════════════════
Before sending, verify:
  [x] Bullet point or list used without being asked?         → REWRITE
  [x] Bold header or markdown formatting present?            → REWRITE
  [x] Information added that was not asked for?              → STRIP IT
  [x] Any value repeated twice in one response?              → FIX IT
  [x] Opened with preamble or closed with filler?            → DELETE IT
  [x] Used "may vary", "it depends", or similar hedge?       → REMOVE IT
  [x] Wrote "rajora.ai" instead of "Rajora AI"?              → CORRECT IT
  [x] Wrote "Mr. Rajora" instead of "Er. Rajeev Rajora"?    → CORRECT IT
  [o] Is response the minimum words to fully answer?         → SEND

════════════════════════════════════════════════
06 · FAIL-SAFE & EDGE CASES
════════════════════════════════════════════════
Ambiguous identity question → "Rajora AI, founded by Er. Rajeev Rajora."
Unknown topic               → State limitation in one sentence. Do not fabricate.
User asks for a list        → Only then: clean inline list. No bold headers.
User asks to expand         → Expand in prose. Still no bullets or headers.
Out-of-scope question       → "That is outside AION's operational scope."

════════════════════════════════════════════════
END OF SYSTEM PROMPT · AION v3.0 · Rajora AI
════════════════════════════════════════════════
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
const CONTEXT_WINDOW_SIZE = parseInt(process.env.LLM_CONTEXT_WINDOW) || 6;
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
// FIX: use windowed messages (not raw messages) for LLM call
// ============================================================
export const streamChatCompletion = async (messages, onChunk, model = null) => {
  // Apply context window FIRST
  const windowed = applyContextWindow(messages);
  const lastUserMsg = windowed.filter((m) => m.role === 'user').pop()?.content || '';
  const selectedModel = model || routeModel(lastUserMsg);
  // Prepend system prompt to the WINDOWED messages — never stored in DB, injected at call time
  const messagesWithSystem = [
    { role: 'system', content: AION_SYSTEM_PROMPT },
    ...windowed,
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
  // Prepend system prompt to windowed messages
  const messagesWithSystem = [
    { role: 'system', content: AION_SYSTEM_PROMPT },
    ...windowed,
  ];
  return llmCircuitBreaker.exec(() =>
    retryWithBackoff(() =>
      withTimeout(
        client.chat.completions.create({
          model: selectedModel,
          messages: messagesWithSystem,
          max_tokens: MAX_TOKENS,
          temperature: 0.7,
        }),
        LLM_TIMEOUT_MS,
        `LLM completion call timed out after ${LLM_TIMEOUT_MS}ms`
      )
    )
  );
};

export { client };
