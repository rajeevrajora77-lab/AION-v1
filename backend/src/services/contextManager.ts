import { ChatMessage } from '../types';

export function estimateTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
}

export function slideContextWindow(
  messages: ChatMessage[],
  maxTokens: number,
  systemPrompt?: string
): ChatMessage[] {
  const systemMessage: ChatMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt, timestamp: new Date() }]
    : [];

  let tokens = estimateTokens(systemMessage);
  const kept: ChatMessage[] = [];

  // Walk backwards from most recent, keep messages that fit
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = Math.ceil(messages[i].content.length / 4);
    if (tokens + msgTokens > maxTokens) break;
    tokens += msgTokens;
    kept.unshift(messages[i]);
  }

  return [...systemMessage, ...kept];
}
