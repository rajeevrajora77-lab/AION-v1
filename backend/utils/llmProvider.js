import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import OpenAI from 'openai';
import axios from 'axios';
import logger from './logger.js';

// Initialize providers based on environment
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

// AWS Bedrock Client
let bedrockClient;
if (LLM_PROVIDER === 'bedrock') {
  bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// OpenAI Client
let openaiClient;
if (LLM_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Convert messages to the format expected by AWS Bedrock Llama 2
 */
function formatMessagesForBedrock(messages) {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  const systemPrompt = systemMessages.length > 0 
    ? systemMessages.map(m => m.content).join('\n')
    : 'You are a helpful AI assistant.';
  
  const conversation = conversationMessages
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  
  return `${systemPrompt}\n\n${conversation}\n\nAssistant:`;
}

/**
 * Call AWS Bedrock with Llama 2 or other models
 */
async function callBedrock(messages, onChunk) {
  const modelId = process.env.BEDROCK_MODEL_ID || 'meta.llama2-70b-chat-v1';
  const prompt = formatMessagesForBedrock(messages);
  
  const params = {
    modelId: modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      prompt: prompt,
      max_gen_len: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: 0.7,
      top_p: 0.9,
    }),
  };
  
  try {
    const command = new InvokeModelCommand(params);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    let fullResponse = '';
    if (responseBody.generation) {
      // For Llama models
      fullResponse = responseBody.generation;
    } else if (responseBody.completions && responseBody.completions[0]) {
      // For other models
      fullResponse = responseBody.completions[0].data.text;
    }
    
    if (onChunk) {
      // Simulate streaming by chunking the response
      const words = fullResponse.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
      }
    }
    
    return fullResponse;
  } catch (error) {
    logger.error('Bedrock API error:', error);
    throw new Error('Failed to call Bedrock API');
  }
}

/**
 * Call Hugging Face Inference API
 */
async function callHuggingFace(messages, onChunk) {
  const model = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not configured');
  }
  
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    let fullResponse = '';
    if (Array.isArray(response.data) && response.data[0]) {
      fullResponse = response.data[0].generated_text || response.data[0].text || '';
    } else if (response.data.generated_text) {
      fullResponse = response.data.generated_text;
    }
    
    if (onChunk) {
      // Simulate streaming
      const words = fullResponse.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
      }
    }
    
    return fullResponse;
  } catch (error) {
    logger.error('Hugging Face API error:', error.response?.data || error.message);
    throw new Error('Failed to call Hugging Face API');
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages, onChunk) {
  if (!openaiClient) {
    throw new Error('OpenAI not configured');
  }
  
  const model = process.env.OPENAI_MODEL || 'gpt-4';
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;
  
  try {
    if (onChunk) {
      // Streaming mode
      const stream = await openaiClient.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: true,
      });
      
      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
      }
      return fullResponse;
    } else {
      // Non-streaming mode
      const completion = await openaiClient.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      });
      
      return completion.choices[0].message.content;
    }
  } catch (error) {
    logger.error('OpenAI API error:', error.message);
    throw new Error('Failed to call OpenAI API');
  }
}

/**
 * Main function to call the configured LLM provider
 */
export async function streamChatCompletion(messages, onChunk) {
  try {
    logger.info(`Using LLM provider: ${LLM_PROVIDER}`);
    
    switch (LLM_PROVIDER) {
      case 'bedrock':
        return await callBedrock(messages, onChunk);
      case 'huggingface':
        return await callHuggingFace(messages, onChunk);
      case 'openai':
        return await callOpenAI(messages, onChunk);
      default:
        throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
    }
  } catch (error) {
    logger.error('LLM Provider error:', error);
    throw error;
  }
}

/**
 * Non-streaming completion
 */
export async function createChatCompletion(messages) {
  try {
    logger.info(`Using LLM provider: ${LLM_PROVIDER}`);
    
    let content;
    switch (LLM_PROVIDER) {
      case 'bedrock':
        content = await callBedrock(messages, null);
        break;
      case 'huggingface':
        content = await callHuggingFace(messages, null);
        break;
      case 'openai':
        content = await callOpenAI(messages, null);
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
    }
    
    return { content };
  } catch (error) {
    logger.error('LLM Provider error:', error);
    throw error;
  }
}
