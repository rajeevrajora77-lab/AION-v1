import { z } from 'zod';

export const AgentInputSchema = z.object({
  task: z.string(),
  sessionId: z.string().optional(),
});

export type AgentInput = z.infer<typeof AgentInputSchema>;
