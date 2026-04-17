import { AgentInput } from './types';

export class Planner {
  async decompose(input: AgentInput): Promise<any> {
    // In full implementation, this uses LLM to break down tasks
    return {
      tasks: [input.task]
    };
  }
}
