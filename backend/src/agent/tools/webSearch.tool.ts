import { ToolDefinition, ToolResult } from '../../types';
import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web for current information. Use when you need facts, news, or data that may have changed recently.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' }
    },
    required: ['query']
  }
};

export async function executeWebSearch(args: { query: string }): Promise<ToolResult> {
  const start = Date.now();
  try {
    if (!env.SERPAPI_KEY) {
      return {
        toolName: 'web_search',
        result: { results: [], isMock: true, reason: 'SERPAPI_KEY not configured' },
        executionMs: Date.now() - start
      };
    }
    const response = await axios.get('https://serpapi.com/search', {
      params: { q: args.query, api_key: env.SERPAPI_KEY, num: 5 }
    });
    const results = (response.data.organic_results || []).map((r: Record<string, string>) => ({
      title: r.title, url: r.link, snippet: r.snippet, isMock: false
    }));
    return { toolName: 'web_search', result: { results, isMock: false }, executionMs: Date.now() - start };
  } catch (err) {
    logger.error('Web search failed', { err });
    return { toolName: 'web_search', result: null, error: String(err), executionMs: Date.now() - start };
  }
}
