import { Response } from 'express';
import { chatRepository } from '../repositories/chatRepository';
import { ragService } from './ragService';
import { llmService } from './llmService';
import { ChatMessage, LLMResponse } from '../types';

export const chatService = {
  async processMessage(
    userId: string,
    sessionId: string,
    content: string,
    stream: boolean,
    res?: Response
  ): Promise<LLMResponse | void> {
    const session = await chatRepository.findById(sessionId, userId);
    if (!session) throw new Error('Session not found');

    const newMessage: ChatMessage = { role: 'user', content, timestamp: new Date() };
    await chatRepository.addMessage(sessionId, newMessage);
    
    const augmentedMessages = await ragService.augmentWithRAG([...session.messages, newMessage], userId);

    if (stream && res) {
      await llmService.streamCompletion({
        messages: augmentedMessages,
        model: 'fast',
        stream: true,
        userId,
        sessionId
      }, res);
      // Assistant response is appended client side during stream usually, but needs saving here ideally via a callback.
      // Since it's SSE, the actual content is streamed. Real AION needs the full string to save. This is a placeholder structure per prompt.
    } else {
      const response = await llmService.complete({
        messages: augmentedMessages,
        model: 'fast',
        stream: false,
        userId,
        sessionId
      });
      await chatRepository.addMessage(sessionId, {
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });
      return response;
    }
  }
};
