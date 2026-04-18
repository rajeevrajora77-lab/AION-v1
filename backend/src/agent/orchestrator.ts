import { planner } from './planner';
import { executeTool } from './toolRegistry';
import { pLimit } from './concurrency';
import { ExecutionMemory } from '../models/ExecutionMemory';
import { logger } from '../utils/logger';

const limit = pLimit(5);

export const orchestrator = {
  async runJob(jobId: string, objective: string, context: string) {
    const memory = new ExecutionMemory({ jobId, objective, status: 'running' });
    await memory.save();

    let plan = await planner.createPlan(objective, context);
    let planIndex = 0;
    let isShuttingDown = false;
    
    // Phase 5: Soft Graceful Timeout Warning at 100s, hard close at 115s.
    const softTimeout = setTimeout(() => {
       logger.warn(`Soft Timeout (100s) Reached for Job ${jobId}. Finalizing current step.`);
       isShuttingDown = true;
    }, 100000);

    const hardTimeout = setTimeout(() => {
      memory.status = 'partial';
      memory.save().catch(console.error);
      throw new Error('Hard Timeout Exceeded (115s)');
    }, 115000);

    try {
      while (planIndex < plan.length) {
        if (isShuttingDown) {
           memory.status = 'partial';
           await memory.save();
           clearTimeout(softTimeout); clearTimeout(hardTimeout);
           return { status: 'partial', memory, reason: 'Graceful Shutdown' };
        }

        const step = plan[planIndex];
        logger.info(`Executing step [${step.id}]`, { action: step.action });

        try {
          const result = await limit(() => 
            Promise.race([
              executeTool({ id: step.id, name: step.tool, arguments: { query: step.action } }),
              new Promise((_, r) => setTimeout(() => r(new Error('Tool Timeout Exceeded (15s)')), 15000))
            ])
          );
          
          memory.steps.push({
            id: step.id, toolUsed: step.tool, input: step.action, output: result,
            latencyMs: 0, tokensUsed: 0
          });
          planIndex++;
          await memory.save();

        } catch (error: any) {
          logger.warn(`Step [${step.id}] Failed. Initiating Replan.`, { error: error.message });
          memory.steps.push({
            id: step.id, toolUsed: step.tool, input: step.action, output: null, error: error.message,
            latencyMs: 0, tokensUsed: 0
          });
          memory.replanCount++;
          await memory.save();

          if (memory.replanCount >= 3) {
            memory.status = 'partial'; await memory.save();
            clearTimeout(softTimeout); clearTimeout(hardTimeout);
            return { status: 'partial', memory };
          }
          plan = await planner.replan(objective, { failedStep: step, error: error.message });
          planIndex = 0; 
        }
      }

      memory.status = 'success';
      await memory.save();
      clearTimeout(softTimeout); clearTimeout(hardTimeout);
      return { status: 'success', memory };

    } catch (criticalError) {
      memory.status = 'failed'; await memory.save();
      clearTimeout(softTimeout); clearTimeout(hardTimeout);
      throw criticalError;
    }
  }
};
