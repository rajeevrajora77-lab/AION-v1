import { Worker, Job } from 'bullmq';
import { orchestrator } from '../agent/orchestrator';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { jobStreamService } from '../services/jobStreamService';
import { io } from '../config/websocket';

export let llmWorker: Worker | null = null;

export function startLLMWorker(): void {
  if (!env.REDIS_HOST || env.REDIS_HOST === 'localhost') {
    // Check if Redis is actually reachable by attempting connection
    // Skip worker if no external Redis configured
    logger.warn('REDIS_HOST not configured or set to localhost - LLM Worker disabled. Set REDIS_URL/REDIS_HOST env vars to enable.');
    return;
  }

  try {
    llmWorker = new Worker('llm-jobs', async (job: Job) => {
      const { jobId, objective, context } = job.data;

      logger.info(`Worker processing job ${jobId}`, { objective });

      await jobStreamService.addEvent(jobId, 'job_started', { status: 'running', message: 'Job pulled from queue' });
      if (io) io.to(`job_${jobId}`).emit('event', { event: 'job_started', payload: { status: 'running' }});

      try {
        const result = await orchestrator.runJob(jobId, objective, context);

        await jobStreamService.addEvent(jobId, 'job_success', { status: 'success', data: result });
        if (io) io.to(`job_${jobId}`).emit('event', { event: 'job_success', payload: { data: result }});

        return result;
      } catch (err: any) {
        logger.error(`Worker failed job ${jobId}`, { error: err.message });

        await jobStreamService.addEvent(jobId, 'job_failed', { status: 'failed', error: err.message });
        if (io) io.to(`job_${jobId}`).emit('event', { event: 'job_failed', payload: { error: err.message }});

        throw err;
      }
    }, {
      connection: {
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT, 10),
      },
      concurrency: 5
    });

    llmWorker.on('completed', (job: Job) => {
      logger.info(`Job completed: ${job.id}`);
    });

    llmWorker.on('failed', (job: Job | undefined, err: Error) => {
      if (job) logger.error(`Job failed: ${job.id}`, { error: err.message });
    });

    llmWorker.on('error', (err: Error) => {
      logger.error('LLM Worker error', { error: err.message });
    });

    logger.info('LLM Worker started successfully');
  } catch (err: any) {
    logger.warn('LLM Worker failed to start (Redis unavailable)', { error: err.message });
  }
}
