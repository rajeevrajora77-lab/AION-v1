import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { env } from './env';

let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) {
    logger.warn('REDIS_URL not set — Redis features degraded');
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3
    });
    redisClient.on('error', (err) => logger.error('Redis error', { err }));
    redisClient.on('connect', () => logger.info('Redis connected'));
  }
  return redisClient;
}
