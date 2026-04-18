import { webSearchTool, executeWebSearch } from './tools/webSearch.tool';
import { runCodeTool, executeRunCode } from './tools/runCode.tool';
import { ToolDefinition, ToolCall, ToolResult } from '../types';

const EXECUTORS: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
  web_search: (args) => executeWebSearch(args as { query: string }),
  run_code: (args) => executeRunCode(args as { code: string }),
};

export const availableTools: ToolDefinition[] = [webSearchTool, runCodeTool];

export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const executor = EXECUTORS[toolCall.name];
  if (!executor) {
    return { toolName: toolCall.name, result: null, error: `Unknown tool: ${toolCall.name}`, executionMs: 0 };
  }
  return executor(toolCall.arguments);
}
