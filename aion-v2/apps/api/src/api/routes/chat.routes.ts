import { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';
import { env } from '../../../config/env';

export default async function chatRoutes(fastify: FastifyInstance) {
  let agentQueue: Queue;

  fastify.addHook('onReady', async () => {
    agentQueue = new Queue('agent_jobs', { connection: fastify.redis });
  });

  fastify.addHook('onClose', async () => {
    await agentQueue?.close();
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { message, sessionId } = request.body as { message: string, sessionId: string };
    const taskId = `task_${Date.now()}`;
    
    const job = await agentQueue.add('agent_task', {
      taskId,
      sessionId,
      message,
      userId: request.user?.id
    }, {
      jobId: taskId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });

    return { success: true, data: { taskId, sessionId, jobId: job.id } };
  });

  fastify.get('/stream/:taskId', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    // Subscribe to Redis pubsub for real-time task updates
    const sub = fastify.redis.duplicate();
    await sub.subscribe(`stream:${taskId}`);

    sub.on('message', (channel, message) => {
      reply.raw.write(`data: ${message}\n\n`);
      const parsed = JSON.parse(message);
      if (parsed.event === 'done' || parsed.event === 'error') {
        sub.quit();
        reply.raw.end();
      }
    });

    request.raw.on('close', () => {
      sub.quit();
    });
  });
}
