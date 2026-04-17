import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Orchestrator } from '../core/orchestrator/Orchestrator';
import { Planner } from '../core/orchestrator/Planner';
import { TaskStateManager } from '../core/session/TaskStateManager';
import { OpenAIProvider } from '../llm/providers/OpenAIProvider';
import { ToolRegistry } from '../tools/registry/ToolRegistry';
import { Executor } from '../core/executor/Executor';
import { MemoryManager } from '../memory/MemoryManager';
import { env } from '../config/env';

const redisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const pub = new Redis(env.REDIS_URL);

// Dependency Injection Bootstrap
const planner = new Planner();
const stateManager = new TaskStateManager(redisConnection);
const llm = new OpenAIProvider('sk-mock-key-prod'); // Will come from BYOK in prod
const toolRegistry = new ToolRegistry();
const executor = new Executor(toolRegistry);
const memory = new MemoryManager(redisConnection, null, null);

const orchestrator = new Orchestrator(
  planner,
  stateManager,
  llm,
  toolRegistry,
  memory,
  executor
);

const worker = new Worker('agent_jobs', async (job: Job) => {
  const { taskId, sessionId, message, userId } = job.data;
  
  pub.publish(`stream:${taskId}`, JSON.stringify({ event: 'status', data: { status: 'running' } }));

  try {
    // In full implementation, stream chunks are yielded via a stream wrapper around Orchestrator
    const result = await orchestrator.run({ task: message, sessionId });

    pub.publish(`stream:${taskId}`, JSON.stringify({ event: 'done', data: result }));
    
    return result;
  } catch (error: any) {
    pub.publish(`stream:${taskId}`, JSON.stringify({ event: 'error', data: error.message }));
    throw error;
  }

}, { connection: redisConnection });

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`Agent Job ${job?.id} failed:`, err);
});

console.log('Worker is listening for agent_jobs...');
