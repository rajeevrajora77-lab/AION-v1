import { Pinecone } from '@pinecone-database/pinecone';
import { rawOpenaiClient } from './llmClient';
import { Memory } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let pinecone: Pinecone | null = null;

function getPinecone(): Pinecone | null {
  if (!env.PINECONE_API_KEY) return null;
  if (!pinecone) pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  return pinecone;
}

async function createEmbedding(text: string): Promise<number[]> {
  const response = await rawOpenaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

export const memoryService = {
  async saveMemory(userId: string, content: string, metadata: Record<string, string> = {}): Promise<void> {
    const pc = getPinecone();
    if (!pc || !env.PINECONE_INDEX) {
      logger.warn('Pinecone not configured - memory not saved');
      return;
    }
    try {
      const embedding = await createEmbedding(content);
      const index = pc.index(env.PINECONE_INDEX);
      await index.namespace(userId).upsert([{
        id: `mem-${Date.now()}`,
        values: embedding,
        metadata: { content, userId, ...metadata, savedAt: new Date().toISOString() }
      }]);
    } catch (err) {
      logger.error('Memory save failed', { err });
    }
  },

  async retrieveMemory(userId: string, query: string, topK = 5): Promise<Memory[]> {
    const pc = getPinecone();
    if (!pc || !env.PINECONE_INDEX) return [];
    try {
      const embedding = await createEmbedding(query);
      const index = pc.index(env.PINECONE_INDEX);
      const results = await index.namespace(userId).query({
        vector: embedding,
        topK,
        includeMetadata: true
      });
      return (results.matches || []).map((m: any) => ({
        id: m.id,
        content: m.metadata?.content || '',
        userId,
        metadata: m.metadata || {},
        savedAt: m.metadata?.savedAt || ''
      }));
    } catch (err) {
      logger.error('Memory retrieve failed', { err });
      return [];
    }
  }
};
