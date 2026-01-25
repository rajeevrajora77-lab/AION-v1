import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONFIGURATION & VALIDATION
// ============================================

// Validate environment on startup
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ CRITICAL: OPENAI_API_KEY environment variable is not set');
  console.error('Please set OPENAI_API_KEY in:');
  console.error('  - Local: .env file');
  console.error('  - AWS EB: Environment Variables in EB Console');
  throw new Error('OPENAI_API_KEY is required but not configured');
}

const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 15000, // 15 seconds
  maxRetries: 2,
  defaultModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
};

console.log('✅ OpenAI Configuration:');
console.log('  - API Key: Configured (length:', OPENAI_CONFIG.apiKey.length, ')');
console.log('  - Model:', OPENAI_CONFIG.defaultModel);
console.log('  - Timeout:', OPENAI_CONFIG.timeout, 'ms');
console.log('  - Max Retries:', OPENAI_CONFIG.maxRetries);

// Initialize OpenAI client
let openai = null;

try {
  openai = new OpenAI({
    apiKey: OPENAI_CONFIG.apiKey,
    timeout: OPENAI_CONFIG.timeout,
    maxRetries: OPENAI_CONFIG.maxRetries,
  });
  console.log('✅ OpenAI client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error.message);
  throw error;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = OPENAI_CONFIG.maxRetries) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${maxRetries + 1}`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on authentication errors
      if (error.status === 401 || error.status === 403) {
        console.error('❌ Authentication error - not retrying');
        throw error;
      }
      
      // Don't retry if it's the last attempt
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
      }
    }
  }
  
  throw lastError;
}

// ============================================
// PUBLIC API FUNCTIONS
// ============================================

/**
 * Stream chat completion with retry and timeout
 */
export async function streamChatCompletion(messages, onChunk) {
  console.log('📥 streamChatCompletion called');
  console.log('  - Messages count:', messages.length);
  console.log('  - Last message:', messages[messages.length - 1]?.content?.substring(0, 100));

  if (!openai) {
    console.error('❌ OpenAI client not initialized');
    throw new Error('OpenAI service unavailable');
  }

  try {
    const result = await retryWithBackoff(async () => {
      console.log('🚀 Calling OpenAI API...');
      const startTime = Date.now();
      
      const stream = await openai.chat.completions.create({
        model: OPENAI_CONFIG.defaultModel,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7,
        stream: true,
      });

      console.log('✅ OpenAI stream created successfully');
      console.log('  - Time to first byte:', Date.now() - startTime, 'ms');

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          chunkCount++;
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      console.log('✅ Stream completed successfully');
      console.log('  - Total chunks:', chunkCount);
      console.log('  - Response length:', fullResponse.length);
      console.log('  - Total time:', Date.now() - startTime, 'ms');

      return fullResponse;
    });

    return result;
  } catch (error) {
    console.error('❌ streamChatCompletion error:', error.message);
    console.error('  - Error type:', error.constructor.name);
    console.error('  - Error code:', error.code);
    console.error('  - Error status:', error.status);
    
    // Throw user-friendly error
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check configuration.');
    } else if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('OpenAI request timeout. Please try again.');
    } else {
      throw new Error(`AI service error: ${error.message}`);
    }
  }
}

/**
 * Create chat completion (non-streaming) with retry and timeout
 */
export async function createChatCompletion(messages) {
  console.log('📥 createChatCompletion called');
  console.log('  - Messages count:', messages.length);

  if (!openai) {
    console.error('❌ OpenAI client not initialized');
    throw new Error('OpenAI service unavailable');
  }

  try {
    const result = await retryWithBackoff(async () => {
      console.log('🚀 Calling OpenAI API (non-streaming)...');
      const startTime = Date.now();
      
      const completion = await openai.chat.completions.create({
        model: OPENAI_CONFIG.defaultModel,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7,
      });

      console.log('✅ OpenAI completion successful');
      console.log('  - Response time:', Date.now() - startTime, 'ms');
      console.log('  - Model used:', completion.model);
      console.log('  - Tokens used:', completion.usage?.total_tokens);

      return {
        content: completion.choices[0].message.content,
        model: completion.model,
        usage: completion.usage,
      };
    });

    return result;
  } catch (error) {
    console.error('❌ createChatCompletion error:', error.message);
    console.error('  - Error type:', error.constructor.name);
    console.error('  - Error code:', error.code);
    console.error('  - Error status:', error.status);
    
    // Throw user-friendly error
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check configuration.');
    } else if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('OpenAI request timeout. Please try again.');
    } else {
      throw new Error(`AI service error: ${error.message}`);
    }
  }
}

/**
 * Create embedding with retry and timeout
 */
export async function createEmbedding(text) {
  console.log('📥 createEmbedding called');
  console.log('  - Text length:', text.length);

  if (!openai) {
    console.error('❌ OpenAI client not initialized');
    throw new Error('OpenAI service unavailable');
  }

  try {
    const result = await retryWithBackoff(async () => {
      console.log('🚀 Calling OpenAI Embeddings API...');
      const startTime = Date.now();
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      console.log('✅ Embedding created successfully');
      console.log('  - Response time:', Date.now() - startTime, 'ms');

      return response.data[0].embedding;
    });

    return result;
  } catch (error) {
    console.error('❌ createEmbedding error:', error.message);
    throw error;
  }
}
