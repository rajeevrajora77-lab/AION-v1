import { planner, PlanStep } from './planner';
import { executeTool } from './toolRegistry';
import { pLimit } from './concurrency';
import { ExecutionMemory } from '../models/ExecutionMemory';
import { logger } from '../utils/logger';

// 5 parallel execution limit
const limit = pLimit(5);

export const orchestrator = {
  async runJob(jobId: string, objective: string, context: string) {
    const memory = new ExecutionMemory({ jobId, objective, status: 'running' });
    await memory.save();

    let plan = await planner.createPlan(objective, context);
    let planIndex = 0;
    
    // Fail-Safe: Absolute 120s timeout for the entire orchestrator job
    const absoluteTimeout = setTimeout(() => {
       memory.status = 'partial';
       memory.save().catch(console.error);
       throw new Error('Absolute Job Timeout Exceeded (120s)');
    }, 120000);

    try {
      while (planIndex < plan.length) {
        const step = plan[planIndex];
        logger.info(`Executing step [${step.id}]`, { action: step.action });

        try {
          // Wrapped in concurrency limiter and Promise race for 15s tool timeout
          const result = await limit(() => 
            Promise.race([
              executeTool({ id: step.id, name: step.tool, arguments: { query: step.action } }),
              new Promise((_, r) => setTimeout(() => r(new Error('Tool Timeout Exceeded (15s)')), 15000))
            ])
          );
          
          memory.steps.push({
            id: step.id,
            toolUsed: step.tool,
            input: step.action,
            output: result,
            latencyMs: 0, 
            tokensUsed: 0
          });
          planIndex++;
          await memory.save();

        } catch (error: any) {
          logger.warn(`Step [${step.id}] Failed. Initiating Replan.`, { error: error.message });
          memory.steps.push({
            id: step.id,
            toolUsed: step.tool,
            input: step.action,
            output: null,
            error: error.message,
            latencyMs: 0,
            tokensUsed: 0
          });
          memory.replanCount++;
          await memory.save();

          if (memory.replanCount >= 3) {
            memory.status = 'partial';
            await memory.save();
            clearTimeout(absoluteTimeout);
            return { status: 'partial', memory };
          }

          // Generate new plan from this failure
          plan = await planner.replan(objective, { failedStep: step, error: error.message });
          planIndex = 0; // Restart execution loop based on new plan
        }
      }

      memory.status = 'success';
      await memory.save();
      clearTimeout(absoluteTimeout);
      return { status: 'success', memory };

    } catch (criticalError) {
      memory.status = 'failed';
      await memory.save();
      clearTimeout(absoluteTimeout);
      throw criticalError;
    }
  }
};
