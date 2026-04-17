import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    max: 100, // 100 requests per time window
    timeWindow: '1 minute',
    redis: fastify.redis, // Use Redis for rate limiting
  });
});
