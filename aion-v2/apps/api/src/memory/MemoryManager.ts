export class MemoryManager {
  constructor(
    private redis: any,
    private vectorStore: any,
    private prisma: any
  ) {}

  async retrieve(task: string): Promise<any> {
    // 1. Get from short term Redis
    // 2. Get from long term Chroma
    return { shortTerm: [], longTerm: [] };
  }

  async saveObservation(sessionId: string, observation: any): Promise<void> {
    // Push format into redis STM list
    await this.redis.lpush(`stm:${sessionId}`, JSON.stringify(observation));
    await this.redis.ltrim(`stm:${sessionId}`, 0, 19); // keep last 20
  }
}
