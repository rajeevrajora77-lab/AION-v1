import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function streamChatCompletion(messages, onChunk) {
  try {
    const stream = await openai.chat.completions.create({
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
  try {
    const completion = await openai.chat.completions.create({
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
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error(`Embedding service error: ${error.message}`);
  }
}

export default openai;
