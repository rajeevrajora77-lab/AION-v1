import { ToolRegistry } from '../../tools/registry/ToolRegistry';

export class Executor {
  constructor(private registry: ToolRegistry) {}

  async runTool(name: string, args: any, options: { retries: number; timeout: number }): Promise<any> {
    const tool = this.registry.getTool(name);
    if (!tool) throw new Error(`Tool ${name} not found`);

    let attempt = 0;
    while (attempt <= options.retries) {
      try {
        const validatedArgs = tool.inputSchema.parse(args);
        
        // Execute with timeout
        const result = await Promise.race([
          tool.execute(validatedArgs, {}),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tool timeout')), options.timeout))
        ]);

        return tool.outputSchema.parse(result);
      } catch (err) {
        attempt++;
        if (attempt > options.retries) throw err;
        // Exponential backoff logic would go here
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
}
