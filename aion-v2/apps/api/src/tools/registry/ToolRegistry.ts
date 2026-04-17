import { z } from 'zod';

export interface ToolManifest {
  name: string;
  description: string;
  inputSchema: any;
}

export interface ToolContext {
  sessionId?: string;
  userId?: string;
  projectId?: string;
}

export interface Tool<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
  timeout: number;
  retries: number;
  cacheable: boolean;
  cacheKey?(input: TInput): string;
}

export class ToolRegistry {
  private tools: Map<string, Tool<any, any>> = new Map();

  register(tool: Tool<any, any>) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool<any, any> | undefined {
    return this.tools.get(name);
  }

  getManifest(): ToolManifest[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      // Need a utility to convert Zod schema to JSON schema for LLM
      // Here doing simplified
      inputSchema: {} 
    }));
  }
}
