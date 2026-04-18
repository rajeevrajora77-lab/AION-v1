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
  async createPlan(objective: string, context: string): Promise<PlanStep[]> {
    logger.info('Agent Planner generating plan', { objective });
    
    let activeToolsList = getActiveTools().map(t => `${t.name}: ${t.description}`).join(' | ');

    const prompt = `You are a Deterministic Agent Planner. 
Break this objective into atomic, sequential steps using ONLY these active tools: [${activeToolsList}]
Objective: ${objective}
Context: ${context}

You must return strictly a JSON object: 
{ "steps": [{ "id": "step1", "action": "what to do", "tool": "toolName", "expectedOutput": "output" }] }`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    });

    try {
      const content = JSON.parse(response.choices[0].message.content || '{"steps":[]}');
      const validPlan = planSchema.parse(content);
      return validPlan.steps;
    } catch (err) {
      logger.error('Failed to parse and validate plan, returning minimal single step.', { err, content: response.choices[0].message.content });
      return [{ id: 'step1', action: objective, tool: 'web_search', expectedOutput: 'final answer' }];
    }
  },

  async replan(objective: string, failureContext: { failedStep: any, error: string }): Promise<PlanStep[]> {
    logger.warn('Agent Planner replanning', { failureContext });
    const prompt = `You are a Deterministic Agent Planner. Your previous plan failed at a certain step.
Original Objective: ${objective}
Failed Step: ${JSON.stringify(failureContext.failedStep)}
Error Encountered: ${failureContext.error}

Create a NEW plan to accomplish the objective bypassing this error. 
Return strictly a JSON object matching { "steps": [...] }`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    });

    try {
      const content = JSON.parse(response.choices[0].message.content || '{"steps":[]}');
      const validPlan = planSchema.parse(content);
      return validPlan.steps;
    } catch (err) {
       throw new Error('Replan validation failed.');
    }
  }
};
