import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '../../config/env';

export default fp(async (fastify) => {
  const redis = new Redis(env.REDIS_URL);
  
  redis.on('error', (err) => {
    fastify.log.error(err, 'Redis connection error');
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async (server) => {
    await server.redis.quit();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}
