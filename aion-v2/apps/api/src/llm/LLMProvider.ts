import { ToolManifest } from '../../tools/registry/ToolRegistry';

export interface LLMProvider {
  reason(params: {
    task: string;
    history: any[];
    availableTools: ToolManifest[];
    memory: any;
  }): Promise<string>;

  decide(thought: string): Promise<{ 
    action: 'tool' | 'respond' | 'plan'; 
    toolName?: string; 
    toolArgs?: any; 
    response?: string;
    subTask?: string;
  }>;

  synthesize(params: {
    task: string;
    steps: any[];
    memory: any;
  }): Promise<string>;
}
