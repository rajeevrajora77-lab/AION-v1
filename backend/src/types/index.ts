import { Request } from 'express';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount?: number;
}

export interface IUser {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  passwordHash: string;
}

export interface LLMRequest {
  messages: ChatMessage[];
  model: 'fast' | 'standard' | 'powerful';
  stream: boolean;
  maxTokens?: number;
  userId: string;
  sessionId: string;
  tools?: ToolDefinition[];
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  toolCalls?: ToolCall[];
}

export interface ChatSession {
  _id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  workspace: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  isMock: boolean;
  provider: 'serpapi' | 'bing' | 'mock';
}

export interface SearchResponse {
  results: SearchResult[];
  meta: {
    provider: 'serpapi' | 'bing' | 'mock';
    isMock: boolean;
    mockReason?: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolName: string;
  result: unknown;
  error?: string;
  executionMs: number;
}

export interface AgentStep {
  stepNumber: number;
  thought: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  finalAnswer?: string;
}

export interface Memory {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, string>;
  userId: string;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export type ModelTier = 'fast' | 'standard' | 'powerful';
