import OpenAI from 'openai';
import dotenv from 'dotenv';
import { withTimeout } from './timeoutWrapper.js';
import CircuitBreaker from './circuitBreaker.js';
import logger from './logger.js';

dotenv.config();

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

  const stream = await llmCircuitBreaker.exec(() =>
    retryWithBackoff(() =>
      withTimeout(
        client.chat.completions.create({
          model: selectedModel,
          messages: windowed,
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
