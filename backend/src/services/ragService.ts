import { ChatMessage } from '../types';
import { memoryService } from './memoryService';

export const ragService = {
  async augmentWithRAG(messages: ChatMessage[], userId: string): Promise<ChatMessage[]> {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return messages;

    const memories = await memoryService.retrieveMemory(userId, lastUserMessage.content, 3);
    if (memories.length === 0) return messages;

    const memoryContext = memories.map(m => `[Memory] ${m.content}`).join('\n');
    const ragMessage: ChatMessage = {
      role: 'system',
      content: `Relevant context from past conversations:\n${memoryContext}`,
      timestamp: new Date()
    };

    const firstUserIdx = messages.findIndex(m => m.role === 'user');
    return [
      ...messages.slice(0, firstUserIdx),
      ragMessage,
      ...messages.slice(firstUserIdx)
    ];
  }
};
