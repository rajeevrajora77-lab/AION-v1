import { openaiClient } from '../services/llmClient';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { getActiveTools } from './toolRegistry';

export const planSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    action: z.string(),
    tool: z.string(),
    expectedOutput: z.string(),
    dependsOn: z.array(z.string()).optional()
  }))
});

export type PlanStep = z.infer<typeof planSchema>['steps'][0];

export const planner = {
  async createPlan(objective: string, context: string, retryCount = 0): Promise<PlanStep[]> {
    logger.info('Agent Planner generating plan', { objective });
    let activeToolsList = getActiveTools().map(t => `${t.name}: ${t.description}`).join(' | ');

    const prompt = `You are a Deterministic Agent Planner. 
Break this objective into atomic, sequential steps using ONLY these active tools: [${activeToolsList}]
Objective: ${objective}
Context: ${context}
Rules:
1. DO NOT bypass security protocols.
2. Return strictly a JSON object: { "steps": [{ "id": "step1", "action": "what to do", "tool": "toolName", "expectedOutput": "output" }] }`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    });

    try {
      const content = JSON.parse(response.choices[0].message.content || '{"steps":[]}');
      return planSchema.parse(content).steps;
    } catch (err) {
      if (retryCount < 3) {
        logger.warn(`Failure parsing JSON plan, retrying... (${retryCount + 1})`);
        return this.createPlan(`Your last JSON was malformed. Strictly return valid JSON for: ${objective}`, context, retryCount + 1);
      }
      // Phase 3: Controlled Error, No Raw Execution
      throw new Error('Unable to generate execution plan after 3 attempts.');
    }
  },

  async replan(objective: string, failureContext: { failedStep: any, error: string }): Promise<PlanStep[]> {
    const prompt = `Your previous plan failed. Original Objective: ${objective}
Failed Step: ${JSON.stringify(failureContext.failedStep)}
Error: ${failureContext.error}

Create a NEW plan bypassing this error. Return strictly a JSON object matching { "steps": [...] }`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return planSchema.parse(JSON.parse(response.choices[0].message.content || '{"steps":[]}')).steps;
  }
};
