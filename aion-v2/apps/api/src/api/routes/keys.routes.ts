import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../../../config/env';

export default async function keysRoutes(fastify: FastifyInstance) {
  const MASTER_KEY = Buffer.from(env.ENCRYPTION_MASTER_KEY, 'hex');

  const encrypt = (text: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  };

  fastify.post('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { provider, apiKey } = request.body as { provider: string, apiKey: string };
    
    if (!['openai', 'anthropic', 'groq'].includes(provider)) {
      reply.status(400);
      return { success: false, error: 'Invalid provider' };
    }

    const { encryptedValue, iv, authTag } = encrypt(apiKey);

    await fastify.prisma.encryptedKey.upsert({
      where: {
        userId_provider: {
          userId: request.user.id,
          provider
        }
      },
      update: {
        encryptedValue,
        iv,
        authTag
      },
      create: {
        userId: request.user.id,
        provider,
        encryptedValue,
        iv,
        authTag
      }
    });

    return { success: true };
  });

  fastify.get('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const keys = await fastify.prisma.encryptedKey.findMany({
      where: { userId: request.user.id },
      select: { provider: true }
    });

    return { success: true, data: keys.map(k => k.provider) };
  });

  fastify.delete('/:provider', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    
    await fastify.prisma.encryptedKey.deleteMany({
      where: {
        userId: request.user.id,
        provider
      }
    });

    return { success: true };
  });
}
