import { z } from 'zod';
import { Tool, ToolContext } from './registry/ToolRegistry';
import ivm from 'isolated-vm';

export class CodeExecutorTool implements Tool<any, any> {
  name = 'code_executor';
  description = 'Executes javascript tightly sandboxed. Uses isolated-vm.';
  inputSchema = z.object({ 
    language: z.enum(['javascript']), 
    code: z.string() 
  });
  outputSchema = z.object({ 
    stdout: z.string(), 
    stderr: z.string(), 
    exitCode: z.number() 
  });
  
  timeout = 10000;
  retries = 0;
  cacheable = false;

  async execute(input: { language: string, code: string }, ctx: ToolContext): Promise<any> {
    if (input.language !== 'javascript') {
      throw new Error(`Language ${input.language} not currently supported in this sandbox`);
    }

    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const jail = context.global;
    
    jail.setSync('global', jail.derefInto());

    let stdout = '';
    const logCallback = function(...args: any[]) {
      stdout += args.join(' ') + '\n';
    };
    context.evalClosureSync(`global.console = { log: $0 }`, [logCallback], { arguments: { reference: true } });

    try {
      const script = await isolate.compileScript(input.code);
      await script.run(context, { timeout: 10000 });
      return { stdout: stdout.slice(0, 100000), stderr: '', exitCode: 0 };
    } catch (err: any) {
      return { stdout: stdout.slice(0, 100000), stderr: err.message, exitCode: 1 };
    } finally {
      isolate.dispose();
    }
  }
}
