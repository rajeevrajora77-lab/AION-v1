import { LLMProvider } from '../LLMProvider';
import { ToolManifest } from '../../tools/registry/ToolRegistry';

export class FallbackChain implements LLMProvider {
  constructor(private providers: LLMProvider[]) {}

  async reason(params: { task: string; history: any[]; availableTools: ToolManifest[]; memory: any; }): Promise<string> {
    let lastError = null;
    for (const provider of this.providers) {
      try {
        return await provider.reason(params);
      } catch (err) {
        lastError = err;
        // log failover and circuit breaker logic
      }
    }
    throw lastError;
  }

  async decide(thought: string): Promise<{ action: 'tool' | 'respond' | 'plan'; toolName?: string | undefined; toolArgs?: any; response?: string | undefined; subTask?: string | undefined; }> {
    let lastError = null;
    for (const provider of this.providers) {
      try {
        return await provider.decide(thought);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  async synthesize(params: { task: string; steps: any[]; memory: any; }): Promise<string> {
    let lastError = null;
    for (const provider of this.providers) {
      try {
        return await provider.synthesize(params);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
}
