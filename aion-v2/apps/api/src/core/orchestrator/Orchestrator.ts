import { AgentInput, AgentResult } from './types';
import { Planner } from './Planner';
import { TaskStateManager } from '../session/TaskStateManager';
import { LLMProvider } from '../../llm/LLMProvider';
import { ToolRegistry } from '../../tools/registry/ToolRegistry';
import { MemoryManager } from '../../memory/MemoryManager';
import { Executor } from '../executor/Executor';

const MAX_STEPS = 15;

export class Orchestrator {
  constructor(
    private planner: Planner,
    private stateManager: TaskStateManager,
    private llm: LLMProvider,
    private toolRegistry: ToolRegistry,
    private memory: MemoryManager,
    private executor: Executor
  ) {}

  async run(input: AgentInput): Promise<AgentResult> {
    const plan = await this.planner.decompose(input);
    const state = await this.stateManager.create(plan);

    while (!state.isComplete() && state.steps < MAX_STEPS) {
      // 1. THINK — reason about current state
      const thought = await this.llm.reason({
        task: state.currentTask,
        history: state.executionHistory,
        availableTools: this.toolRegistry.getManifest(),
        memory: await this.memory.retrieve(state.currentTask),
      });

      // 2. DECIDE — structured JSON decision from LLM
      const decision = await this.llm.decide(thought);
      // decision = { action: "tool" | "respond" | "plan", toolName?, toolArgs?, response? }

      if (decision.action === "tool") {
        // 3. ACT — execute the chosen tool
        if (!decision.toolName) throw new Error("Tool decision missing toolName");
        const toolResult = await this.executor.runTool(
          decision.toolName,
          decision.toolArgs,
          { retries: 3, timeout: 30_000 }
        );
        
        // 4. OBSERVE — update state with result
        await state.recordStep({ thought, decision, toolResult });
        await this.memory.saveObservation(state.sessionId, toolResult);

      } else if (decision.action === "respond") {
        // 5. SYNTHESIZE — final answer with full context
        const answer = await this.llm.synthesize({
          task: state.currentTask,
          steps: state.executionHistory,
          memory: await this.memory.retrieve(state.currentTask),
        });
        await state.complete(answer);
        return { answer, steps: state.executionHistory, tokensUsed: state.tokens };

      } else if (decision.action === "plan" && decision.subTask) {
        // Re-plan if task scope changes
        const subPlan = await this.planner.decompose({ task: decision.subTask, sessionId: state.sessionId });
        await state.appendPlan(subPlan);
      }
    }

    // MAX_STEPS exceeded — graceful degradation
    return this.gracefulFallback(state);
  }

  private async gracefulFallback(state: any): Promise<AgentResult> {
    const answer = "I have reached the maximum number of reasoning steps and will gracefully downgrade. Please be more specific.";
    await state.complete(answer);
    return { answer, steps: state.executionHistory, tokensUsed: state.tokens };
  }
}
