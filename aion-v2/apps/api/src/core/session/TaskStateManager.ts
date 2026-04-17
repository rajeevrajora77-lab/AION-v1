import Redis from 'ioredis';

export class TaskStateManager {
  constructor(private redis: Redis) {}

  async create(plan: any): Promise<any> {
    const taskId = `task_${Date.now()}`;
    const state = {
      taskId,
      sessionId: plan.sessionId || 'default',
      currentTask: plan.tasks[0],
      steps: 0,
      executionHistory: [],
      tokens: 0,
      
      isComplete: function() { return this.status === 'completed'; },
      recordStep: async function(step: any) {
        this.steps++;
        this.executionHistory.push(step);
        // Persist to redis
      },
      complete: async function(answer: string) {
        this.status = 'completed';
      },
      appendPlan: async function(subPlan: any) {
        // Appends to remaining tasks
      }
    };

    await this.redis.hset(`task:${taskId}`, {
      status: 'running',
      currentStepIndex: 0,
      startedAt: new Date().toISOString()
    });

    return state;
  }
}
