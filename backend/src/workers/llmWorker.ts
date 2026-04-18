import { Worker, Job } from 'bullmq';
import { orchestrator } from '../agent/orchestrator';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { jobStreamService } from '../services/jobStreamService';
import { io } from '../config/websocket';

// Centralised worker process that pulls from BullMQ
export const llmWorker = new Worker('llm-jobs', async (job: Job) => {
  const { jobId, objective, context } = job.data;
  
  logger.info(`Worker processing job ${jobId}`, { objective });
  
  // Phase 2 Streams Fix: Using Redis XADD Streams
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
  concurrency: 5 // Node processing pipeline threshold
});

llmWorker.on('completed', (job: Job) => {
  logger.info(`Job completed: ${job.id}`);
});

llmWorker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) logger.error(`Job failed: ${job.id}`, { error: err.message });
});
 
