export interface AgentInput {
  task: string;
  sessionId?: string;
}

export interface AgentResult {
  answer: string;
  steps: StepResult[];
  tokensUsed: number;
}

export interface StepResult {
  thought: string;
  decision: any; 
  toolResult?: any;
}
