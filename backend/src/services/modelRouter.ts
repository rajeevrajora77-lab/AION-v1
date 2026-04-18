import { ModelTier } from '../types';

const MODEL_MAP: Record<string, Record<ModelTier, string>> = {
  groq: {
    fast: 'llama-3.1-8b-instant',
    standard: 'llama-3.1-70b-versatile',
    powerful: 'llama-3.3-70b-versatile'
  },
  openai: {
    fast: 'gpt-4o-mini',
    standard: 'gpt-4o',
    powerful: 'gpt-4o'
  }
};

export function routeModel(estimatedTokens: number): ModelTier {
  if (estimatedTokens < 500) return 'fast';
  if (estimatedTokens < 2000) return 'standard';
  return 'powerful';
}

export function getModelString(tier: ModelTier, provider: 'groq' | 'openai'): string {
  return MODEL_MAP[provider][tier];
}
