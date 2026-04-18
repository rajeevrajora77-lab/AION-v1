import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { llmService } from '../services/llmService';
import { logger } from '../utils/logger';

export function startLLMWorker(): void {
  const redis = getRedis();
  if (!redis) {
    logger.warn('Redis not available — BullMQ worker not started');
    return;
  }

  const worker = new Worker('llm-jobs', async (job) => {
    logger.info('Processing LLM job', { jobId: job.id });
    return llmService.complete(job.data);
  }, { connection: redis });

  worker.on('completed', (job) => logger.info('LLM job completed', { jobId: job.id }));
  worker.on('failed', (job, err) => logger.error('LLM job failed', { jobId: job?.id, err }));
}
