import { Response } from 'express';
import { LLMRequest, LLMResponse, ToolCall } from '../types';
import { rawOpenaiClient, openaiClient } from './llmClient';
import { routeModel, getModelString } from './modelRouter';
import { slideContextWindow } from './contextManager';
import { logger } from '../utils/logger';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_RETRIES = 3;

class CircuitBreaker {
  failures: number = 0;
  threshold: number;
  timeout: number;
  nextTry: number = 0;

  constructor(threshold = 5, timeout = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.failures >= this.threshold && Date.now() < this.nextTry) {
      throw new Error('Circuit Open: Too many failures');
    }
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (e) {
      this.failures++;
      this.nextTry = Date.now() + this.timeout;
      throw e;
    }
  }
}

const circuitBreaker = new CircuitBreaker();

async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = err.status || err.response?.status;
      const isRetryable = [429, 500, 502, 503].includes(status);
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      const delay = 1000 * Math.pow(2, attempt);
      logger.warn('LLM call failed, retrying', { attempt: attempt + 1, delay });
      await sleep(delay);
    }
  }
  throw lastErr;
}

export const llmService = {
  async streamCompletion(request: LLMRequest, res: Response): Promise<void> {
    const start = Date.now();
    const systemPrompt = "You are AION, built by Rajora AI.";
    const windowedMessages = slideContextWindow(request.messages, request.maxTokens || 2000, systemPrompt);
    const selectedModel = getModelString(request.model, 'openai');

    await circuitBreaker.exec(() =>
      retryWithBackoff(async () => {
        const stream = await rawOpenaiClient.chat.completions.create({
          model: selectedModel,
          messages: windowedMessages as any,
          stream: true,
          temperature: 0.7
        });
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) res.write(content);
        }
      })
    );

    logger.info('Stream completed', { latency: Date.now() - start });
    res.end();
  },

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const systemPrompt = "You are AION, an intelligent agent.";
    const windowedMessages = slideContextWindow(request.messages, request.maxTokens || 2000, systemPrompt);
    const selectedModel = getModelString(request.model, 'openai');

    const mappedTools = request.tools?.map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.inputSchema }
    }));

    return circuitBreaker.exec(() =>
      retryWithBackoff(async () => {
        const response = await openaiClient.chat.completions.create({
          model: selectedModel,
          messages: windowedMessages as any,
          stream: false,
          temperature: 0.7,
          tools: mappedTools?.length ? mappedTools : undefined
        });
        const choice = response.choices[0];
        const toolCalls: ToolCall[] | undefined = choice.message?.tool_calls?.map((tc: any) => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        }));
        return {
          content: choice.message?.content || '',
          model: selectedModel,
          tokensUsed: response.usage?.total_tokens || 0,
          latencyMs: Date.now() - start,
          toolCalls
        };
      })
    );
  }
};
