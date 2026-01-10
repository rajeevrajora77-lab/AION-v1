import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Lazy initialization - client is only created when first needed
let openai = null;
let initializationAttempted = false;

function getOpenAIClient() {
  if (initializationAttempted && !openai) {
    return null; // Already tried and failed
  }
  
  if (!openai) {
    initializationAttempted = true;
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not set. AI features will be unavailable.');
      return null;
    }
    
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('✅ OpenAI client initialized successfully');
    } catch (error) {
      console.error('❌ OpenAI initialization failed:', error.message);
      return null;
    }
  }
  
  return openai;
}

export async function streamChatCompletion(messages, onChunk) {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI service is unavailable. Please ensure OPENAI_API_KEY is configured.');
  }
  
  try {
    const stream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: 0.7,
      stream: true,
    });
    
    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        if (onChunk) onChunk(content);
      }
    }
    
    return fullResponse;
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }
    if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    }
    
    throw new Error(`AI service error: ${error.message}`);
  }
}

export async function createChatCompletion(messages) {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI service is unavailable. Please ensure OPENAI_API_KEY is configured.');
  }
  
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: 0.7,
    });
    
    return {
      content: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage,
    };
  } catch (error) {
    console.error('OpenAI completion error:', error);
    
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }
    if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded');
    }
    
    throw new Error(`AI service error: ${error.message}`);
  }
}

export async function createEmbedding(text) {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI service is unavailable. Please ensure OPENAI_API_KEY is configured.');
  }
  
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error(`Embedding service error: ${error.message}`);
  }
}

// Legacy export for backward compatibility
export function getClient() {
  return getOpenAIClient();
}

export default { streamChatCompletion, createChatCompletion, createEmbedding, getClient };
