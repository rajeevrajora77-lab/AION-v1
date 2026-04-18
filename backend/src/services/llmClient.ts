import OpenAI from 'openai';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const rawOpenaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const MAX_JOB_TOKENS = 30000; // Hard threshold guard

export const openaiClient = {
  chat: {
    completions: {
      async create(params: any, jobId: string = 'global') {
        const redis = getRedis();
        const costKey = `job_tokens:${jobId}`;
        
        // 1. Guard check BEFORE dispatch
        const currentUsage = parseInt(await redis.get(costKey) || '0', 10);
        if (currentUsage > MAX_JOB_TOKENS) {
            logger.warn(`Token limits exceeded for job ${jobId}. (${currentUsage})`);
            throw new AppError('Hard Token Cost Limiter Exceeded. Terminating early.', 429);
        }

        const response = await rawOpenaiClient.chat.completions.create(params);
        
        // 2. Intercept and accumulate AFTER dispatch
        const tokensUsed = response.usage?.total_tokens || 0;
        await redis.incrby(costKey, tokensUsed);
        // Expiry cleanup after 1 hour
        await redis.expire(costKey, 3600);

        return response;
      }
    }
  }
};
