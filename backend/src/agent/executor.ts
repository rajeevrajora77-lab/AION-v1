import { availableTools, executeTool } from './toolRegistry';
import { ToolCall, ToolResult } from '../types';
import { logger } from '../utils/logger';

export const executor = {
  async executeStep(action: string, context: string): Promise<string> {
    logger.info('Executing action', { action });
    
    // In a real execution, we ask the LLM to map the `action` to a specific ToolCall.
    // Assuming simple mapping fallback for this phase build:
    const mockToolCall: ToolCall = {
      id: `call_${Date.now()}`,
      name: action.includes('search') ? 'web_search' : 'run_code',
      arguments: { query: action }
    };

    let attempts = 0;
    while (attempts < 3) {
      try {
        const result = await Promise.race([
          executeTool(mockToolCall),
          new Promise<ToolResult>((_, r) => setTimeout(() => r(new Error('Timeout')), 10000))
        ]);
        
        return JSON.stringify(result.result);
      } catch (err) {
        attempts++;
        logger.warn('Tool execution failed, retrying...', { attempts });
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000));
      }
    }
    return `Failed to execute step: ${action}`;
  }
};
