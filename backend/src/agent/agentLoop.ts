import { Response } from 'express';
import { ChatMessage, AgentStep, ToolCall } from '../types';
import { llmService } from '../services/llmService';
import { executeTool, availableTools } from './toolRegistry';
import { logger } from '../utils/logger';

const MAX_STEPS = 10;

export async function runAgentLoop(
  userMessage: string,
  history: ChatMessage[],
  userId: string,
  sessionId: string,
  res?: Response
): Promise<{ steps: AgentStep[]; finalAnswer: string }> {
  const steps: AgentStep[] = [];
  const messages: ChatMessage[] = [...history, {
    role: 'user', content: userMessage, timestamp: new Date()
  }];

  for (let i = 0; i < MAX_STEPS; i++) {
    const response = await llmService.complete({
      messages,
      model: 'standard',
      stream: false,
      userId,
      sessionId,
      tools: availableTools
    });

    if (res) {
      res.write(`data: ${JSON.stringify({ type: 'agent_step', step: i + 1 })}\n\n`);
    }

    if (!response.toolCalls || response.toolCalls.length === 0) {
      const finalStep: AgentStep = {
        stepNumber: i + 1,
        thought: 'I have enough information to answer.',
        finalAnswer: response.content
      };
      steps.push(finalStep);
      return { steps, finalAnswer: response.content };
    }

    for (const toolCall of response.toolCalls) {
      const toolResult = await executeTool(toolCall);
      logger.info('Tool executed', { tool: toolCall.name, success: !toolResult.error });

      const step: AgentStep = {
        stepNumber: i + 1,
        thought: response.content,
        toolCall,
        toolResult
      };
      steps.push(step);

      if (res) {
        res.write(`data: ${JSON.stringify({ type: 'tool_result', step })}\n\n`);
      }

      messages.push({
        role: 'assistant',
        content: JSON.stringify({ tool: toolCall.name, result: toolResult.result }),
        timestamp: new Date()
      });
    }
  }

  return { steps, finalAnswer: 'Max agent steps reached. Here is what I found so far.' };
}
