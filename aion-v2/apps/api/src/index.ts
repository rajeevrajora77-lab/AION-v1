import fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env';

// Import plugins
import prismaPlugin from './api/plugins/prisma.plugin';
import redisPlugin from './api/plugins/redis.plugin';
import authPlugin from './api/plugins/auth.plugin';

// Import routes
import chatRoutes from './api/routes/chat.routes';
import sessionRoutes from './api/routes/session.routes';

const server = fastify({
  logger: { level: env.LOG_LEVEL },
});

async function bootstrap() {
  try {
    // Register global plugins
    await server.register(cors, { origin: '*' }); 

    // Register internal plugins
    await server.register(prismaPlugin);
    await server.register(redisPlugin);
    await server.register(authPlugin);

    // Register API routes
    await server.register(chatRoutes, { prefix: '/api/v1/chat' });
    await server.register(sessionRoutes, { prefix: '/api/v1/sessions' });

    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`🚀 AION v2 API running at http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
