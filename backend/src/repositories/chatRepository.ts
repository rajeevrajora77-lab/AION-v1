import Chat from '../models/Chat';
import { ChatSession, ChatMessage } from '../types';
import { getRedis } from '../config/redis';

export const chatRepository = {
  async findByUser(userId: string, limit = 50): Promise<ChatSession[]> {
    return Chat.find({ userId }).sort({ updatedAt: -1 }).limit(limit).hint({ userId: 1, updatedAt: -1 });
  },

  async findById(sessionId: string, userId: string): Promise<ChatSession | null> {
    const redis = getRedis();
    const cacheKey = `session:${sessionId}`;
    
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  
    const session = await Chat.findOne({ _id: sessionId, userId }).hint({ _id: 1, userId: 1 });
    if (session && redis) {
      await redis.setex(cacheKey, 300, JSON.stringify(session)); // 5 min TTL
    }
    return session as unknown as ChatSession;
  },

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    await Chat.updateOne(
      { _id: sessionId },
      { $push: { messages: message }, $set: { updatedAt: new Date() } }
    );
  },

  async createSession(userId: string, title: string, workspace = 'default'): Promise<ChatSession> {
    return (await Chat.create({ userId, title, messages: [], workspace })) as unknown as ChatSession;
  },

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await Chat.deleteOne({ _id: sessionId, userId });
  }
};
