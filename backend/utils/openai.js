import OpenAI from 'openai';
import dotenv from 'dotenv';
import { withTimeout } from './timeoutWrapper.js';
import CircuitBreaker from './circuitBreaker.js';

dotenv.config();

// ============================================
// GROQ (Free Open-Source LLM) CONFIGURATION
// Compatible with OpenAI SDK - just change baseURL
// Get free API key at: https://console.groq.com
// ============================================
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Use Groq if available (free), else fall back to OpenAI
const useGroq = !!GROQ_API_KEY;

if (!GROQ_API_KEY && !OPENAI_API_KEY) {
  console.error('CRITICAL: Neither GROQ_API_KEY nor OPENAI_API_KEY is set!');
  console.error('Get a FREE Groq API key at: https://console.groq.com');
  throw new Error('LLM API key is required but not configured');
}

// Initialize OpenAI-compatible client
const client = useGroq
  ? new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : new OpenAI({ apiKey: OPENAI_API_KEY });

if (useGroq) {
  console.log('✅ Using Groq (free open-source LLM) for chat');
} else {
  console.log('✅ Using OpenAI for chat');
}

// ============================================
// CIRCUIT BREAKER — protect against cascading LLM failures
// 5 failures → circuit opens for 30s
// ============================================
const llmCircuitBreaker = new CircuitBreaker(5, 30000);

// ============================================
// LLM CALL TIMEOUT (seconds)
// ============================================
const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS) || 30000;

// ============================================
// MODEL CONFIGURATION
// Groq free models: llama-3.1-8b-instant, llama-3.3-70b-versatile
// OpenAI models: gpt-4o-mini, gpt-3.5-turbo
// ============================================
const MODELS = {
  fast: useGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini',
  standard: useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
  powerful: useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o',
};

const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;

// ============================================
// UTILITY FUNCTIONS
// ============================================
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // Retry on 429 (rate limit), 500 (server error), 502 (bad gateway), 503 (unavailable)
      const isRetryable =
        error.status === 429 || error.status === 500 || error.status === 502 || error.status === 503;
      if (!isRetryable) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`LLM request failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
};

// ============================================
// COMPLEXITY ROUTER
// ============================================
const routeModel = (message) => {
  const wordCount = message.split(' ').length;
  const isComplex =
    wordCount > 50 ||
    /\b(explain|analyze|compare|summarize|write|create|code|debug|implement)\b/i.test(message);
  return isComplex ? MODELS.powerful : MODELS.fast;
};

// ============================================
// STREAMING CHAT COMPLETION
// Accepts a callback function (onChunk) that receives each text chunk.
// Wrapped with circuit breaker + timeout for resilience.
// ============================================
export const streamChatCompletion = async (messages, onChunk, model = null) => {
  const selectedModel = model || routeModel(messages[messages.length - 1]?.content || '');

  const stream = await llmCircuitBreaker.exec(() =>
    retryWithBackoff(() =>
      withTimeout(
        client.chat.completions.create({
          model: selectedModel,
          messages,
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
    if (content) {
      onChunk(content);
    }
  }
};

// ============================================
// NON-STREAMING CHAT COMPLETION
// Wrapped with circuit breaker + timeout for resilience.
// ============================================
export const createChatCompletion = async (messages, model = null) => {
  const selectedModel = model || routeModel(messages[messages.length - 1]?.content || '');
  return llmCircuitBreaker.exec(() =>
    retryWithBackoff(() =>
      withTimeout(
        client.chat.completions.create({
          model: selectedModel,
          messages,
          max_tokens: MAX_TOKENS,
          temperature: 0.7,
        }),
        LLM_TIMEOUT_MS,
        `LLM completion call timed out after ${LLM_TIMEOUT_MS}ms`
      )
    )
  );
};

// ============================================
// EMBEDDING (only available on OpenAI, skip on Groq)
// ============================================
export const createEmbedding = async (text) => {
  if (useGroq) {
    // Groq doesn't support embeddings - return null gracefully
    console.warn('Embeddings not supported with Groq. Skipping.');
    return null;
  }
  return retryWithBackoff(() =>
    client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
  );
};

export { client, MODELS, routeModel };
