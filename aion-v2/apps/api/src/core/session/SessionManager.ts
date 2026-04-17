import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

export class SessionManager {
  constructor(
    private redis: Redis,
    private prisma: PrismaClient
  ) {}

  async createSession(userId: string): Promise<string> {
    const session = await this.prisma.session.create({
      data: { userId }
    });

    await this.redis.hset(`session:${session.id}`, {
      userId,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: new Date().toISOString(),
      messageCount: 0,
      totalTokensUsed: 0
    });

    return session.id;
  }

  async getSession(sessionId: string): Promise<Record<string, string> | null> {
    const cache = await this.redis.hgetall(`session:${sessionId}`);
    if (Object.keys(cache).length === 0) return null;
    return cache;
  }

  async terminateSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
    await this.redis.del(`stm:${sessionId}`);
  }
}
