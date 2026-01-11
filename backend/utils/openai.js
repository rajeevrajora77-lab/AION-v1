import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Lazy initialization - client is only created when first needed
let openai = null;
let initializationAttempted = false;

function getOpenAIClient() {
  if (initializationAttempted && !openai) {
    return null;
  }

  if (openai) {
    return openai;
  }

  initializationAttempted = true;

  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set');
    return null;
  }

  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('OpenAI client initialized');
  } catch (error) {
    console.error('OpenAI init failed:', error.message);
    return null;
  }

  return openai;
}

export async function streamChatCompletion(messages, onChunk) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI unavailable');
  }

  try {
    const stream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      max_tokens: 2000,
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
    console.error('Stream error:', error);
    throw error;
  }
}

export async function createChatCompletion(messages) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI unavailable');
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
    });

    return {
      content: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage,
    };
  } catch (error) {
    console.error('Completion error:', error);
    throw error;
  }
}

export async function createEmbedding(text) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI unavailable');
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}
