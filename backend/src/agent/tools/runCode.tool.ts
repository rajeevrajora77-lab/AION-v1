import { ToolDefinition, ToolResult } from '../../types';
import vm from 'vm';

export const runCodeTool: ToolDefinition = {
  name: 'run_code',
  description: 'Execute JavaScript code in a safe sandbox. Returns stdout, result, or error.',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'JavaScript code to execute' }
    },
    required: ['code']
  }
};

export async function executeRunCode(args: { code: string }): Promise<ToolResult> {
  const start = Date.now();
  try {
    const logs: string[] = [];
    const sandbox = {
      console: { log: (...a: unknown[]) => logs.push(a.join(' ')) },
      Math, JSON, Date, parseInt, parseFloat, isNaN, isFinite, Array, Object, String, Number, Boolean
    };
    const script = new vm.Script(args.code);
    const ctx = vm.createContext(sandbox);
    const result = script.runInContext(ctx, { timeout: 5000 });
    return {
      toolName: 'run_code',
      result: { output: logs.join('\n'), returnValue: result },
      executionMs: Date.now() - start
    };
  } catch (err) {
    return { toolName: 'run_code', result: null, error: String(err), executionMs: Date.now() - start };
  }
}
