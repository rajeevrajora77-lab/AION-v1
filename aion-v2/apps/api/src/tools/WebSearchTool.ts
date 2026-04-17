import { z } from 'zod';
import { Tool, ToolContext } from './registry/ToolRegistry';

export class WebSearchTool implements Tool<any, any> {
  name = 'web_search';
  description = 'Searches the web for current information';
  inputSchema = z.object({ query: z.string() });
  outputSchema = z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string() }));
  
  timeout = 10000;
  retries = 3;
  cacheable = true;

  cacheKey(input: { query: string }) {
    return `websearch:${input.query}`;
  }

  async execute(input: { query: string }, ctx: ToolContext): Promise<any> {
    // Serper.dev or Tavily API implementation
    return [
      { title: "Result 1", url: "https://example.com", snippet: "Information about " + input.query }
    ];
  }
}
