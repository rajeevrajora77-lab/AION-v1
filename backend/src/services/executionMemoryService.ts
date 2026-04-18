import { ExecutionMemory } from '../models/ExecutionMemory';
import { openaiClient } from './llmClient';

export const executionMemoryService = {
  async getJobMemory(jobId: string) {
    return await ExecutionMemory.findOne({ jobId }).lean();
  },

  async summarizeMemoryContext(jobId: string): Promise<string> {
    const memory = await ExecutionMemory.findOne({ jobId }).lean();
    if (!memory || !memory.steps || memory.steps.length === 0) return '';

    const rawContext = JSON.stringify(memory.steps.map(s => ({ tool: s.toolUsed, out: s.output })));
    
    // If output is massive, summarize it to preserve tokens
    if (rawContext.length > 5000) {
      const resp = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: `Summarize this execution context, keeping key facts intact for a planning agent: ${rawContext}` }]
      });
      return resp.choices[0].message.content || rawContext;
    }

    return rawContext;
  }
};
