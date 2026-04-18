import { Queue } from 'bullmq';
import { getRedis } from '../config/redis';
import { LLMRequest } from '../types';

export const llmQueue = new Queue('llm-jobs', {
  connection: getRedis() || undefined
});

export async function enqueueLLMJob(request: LLMRequest): Promise<string> {
  const job = await llmQueue.add('complete', request, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
  return job.id!;
}
