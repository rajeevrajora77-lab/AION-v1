# AION v2 — Distributed AI Operations Node: Architecture & Implementation Blueprint

## Executive Summary

AION v2 is a complete architectural rebuild of the v1 monolith into a production-grade, horizontally scalable distributed AI execution system. The target is 10M users/day, 1000–2000 RPS peak, sub-200ms API latency (excluding LLM time), and zero single points of failure. Every v1 flaw is addressed at the architecture level — not patched, replaced.

---

## Part 1: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            AION v2 — SYSTEM BOUNDARY                           │
│                                                                                 │
│  ┌──────────┐    ┌───────────────┐    ┌────────────────────────────────────┐   │
│  │  Client  │───▶│  Cloudflare   │───▶│        Load Balancer (L7)          │   │
│  │ Browser/ │    │  CDN + WAF    │    │     (nginx / AWS ALB / Traefik)     │   │
│  │  Mobile  │    └───────────────┘    └──────────────┬─────────────────────┘   │
│  └──────────┘                                        │                         │
│                                    ┌─────────────────┼──────────────────┐      │
│                                    ▼                 ▼                  ▼      │
│                           ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │
│                           │  API Node 1 │   │  API Node 2 │   │  API Node N │ │
│                           │  (Stateless)│   │  (Stateless)│   │  (Stateless)│ │
│                           │  Node.js    │   │  Node.js    │   │  Node.js    │ │
│                           └──────┬──────┘   └──────┬──────┘   └──────┬──────┘ │
│                                  └────────────┬────┘                 │        │
│                                               │◀────────────────────┘         │
│                    ┌──────────────────────────▼──────────────────────────┐    │
│                    │               REDIS CLUSTER                          │    │
│                    │  • Session cache      • Rate limiting                │    │
│                    │  • Auth token cache   • Response cache               │    │
│                    │  • Short-term memory  • PubSub (SSE relay)          │    │
│                    └────────────────────────┬───────────────────────────┘    │
│                                             │                                  │
│                    ┌────────────────────────▼───────────────────────────┐     │
│                    │            MESSAGE QUEUE (BullMQ / Kafka)           │     │
│                    │   chat-jobs │ search-jobs │ voice-jobs │ embed-jobs │     │
│                    └──────┬──────────────┬──────────┬──────────┬────────┘     │
│                           │              │          │          │               │
│              ┌────────────▼──┐  ┌────────▼───┐  ┌──▼──────┐  ┌▼──────────┐  │
│              │  LLM WORKERS  │  │  SEARCH    │  │  VOICE  │  │  EMBED    │  │
│              │  (N replicas) │  │  WORKERS   │  │ WORKERS │  │  WORKERS  │  │
│              │               │  │            │  │         │  │           │  │
│              │ • GPT-4o      │  │ • Bing API │  │ • TTS   │  │ text-     │  │
│              │ • Claude      │  │ • Brave    │  │ • STT   │  │ embed-3   │  │
│              │ • Gemini      │  │ • SerpAPI  │  │         │  │           │  │
│              └───────┬───────┘  └────────────┘  └─────────┘  └─────┬─────┘  │
│                      │                                               │        │
│              ┌───────▼───────────────────────────────────────────────▼──────┐ │
│              │                    AGENT SYSTEM                              │ │
│              │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │ │
│              │  │   PLANNER   │  │ TOOL REGISTRY│  │   MEMORY SYSTEM   │  │ │
│              │  │ (ReAct loop)│  │ search/code/ │  │  Short: Redis     │  │ │
│              │  │             │  │ file/web/etc │  │  Long:  Qdrant    │  │ │
│              │  └─────────────┘  └──────────────┘  └───────────────────┘  │ │
│              └────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                        DATA LAYER                                        │ │
│  │  PostgreSQL (users/billing/metadata) │ Qdrant (vectors) │ S3 (files)    │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │              OBSERVABILITY: Pino→Loki │ OTEL→Jaeger │ Prom→Grafana      │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Monorepo Folder Structure

```
aion-v2/
├── apps/
│   ├── api/                        # Stateless API gateway (Node.js)
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── routes/
│   │   │   │   ├── chat.routes.ts
│   │   │   │   ├── search.routes.ts
│   │   │   │   ├── voice.routes.ts
│   │   │   │   └── health.routes.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── ratelimit.middleware.ts
│   │   │   │   ├── validate.middleware.ts
│   │   │   │   └── tracer.middleware.ts
│   │   │   ├── sse/
│   │   │   │   └── stream.handler.ts
│   │   │   └── queues/
│   │   │       └── enqueue.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── worker-llm/                 # LLM worker service
│   │   ├── src/
│   │   │   ├── worker.ts
│   │   │   ├── llm/
│   │   │   │   ├── router.ts
│   │   │   │   ├── openai.ts
│   │   │   │   └── anthropic.ts
│   │   │   └── agent/
│   │   │       ├── planner.ts
│   │   │       ├── tool-registry.ts
│   │   │       └── executor.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── worker-search/              # Search worker service
│   ├── worker-voice/               # Voice worker service
│   └── worker-embed/               # Embeddings worker service
│
├── packages/
│   ├── shared/                     # Shared types, utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── job.types.ts
│   │   │   │   ├── agent.types.ts
│   │   │   │   └── memory.types.ts
│   │   │   └── utils/
│   │   │       ├── logger.ts
│   │   │       └── tracer.ts
│   │   └── package.json
│   │
│   ├── redis/                      # Redis client + helpers
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── cache.ts
│   │   │   ├── pubsub.ts
│   │   │   └── ratelimit.ts
│   │   └── package.json
│   │
│   ├── queues/                     # BullMQ queue definitions
│   │   ├── src/
│   │   │   ├── queues.ts
│   │   │   └── job-schemas.ts
│   │   └── package.json
│   │
│   ├── memory/                     # Memory system
│   │   ├── src/
│   │   │   ├── short-term.ts       # Redis-backed
│   │   │   └── long-term.ts        # Qdrant-backed
│   │   └── package.json
│   │
│   └── db/                         # Database clients
│       ├── src/
│       │   ├── postgres.ts
│       │   └── qdrant.ts
│       └── package.json
│
├── infra/
│   ├── k8s/
│   │   ├── api-deployment.yaml
│   │   ├── worker-llm-deployment.yaml
│   │   ├── redis-statefulset.yaml
│   │   ├── hpa.yaml
│   │   └── ingress.yaml
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── docker-compose.dev.yml
│
├── docs/
│   ├── AION-v2-Upgrade-Plan.md     ← THIS FILE
│   ├── api-reference.md
│   └── adr/                        # Architecture Decision Records
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Part 3: API Service — Stateless Gateway

### `apps/api/src/app.ts`

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { chatRouter } from './routes/chat.routes';
import { healthRouter } from './routes/health.routes';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimitMiddleware } from './middleware/ratelimit.middleware';
import { tracerMiddleware } from './middleware/tracer.middleware';
import { logger } from '@aion/shared/utils/logger';

const app = express();

// Trust proxy — required behind ALB/nginx
app.set('trust proxy', 1);

// Security hardening
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.openai.com'],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
}));

app.use(express.json({ limit: '64kb' }));
app.use(tracerMiddleware);
app.use(rateLimitMiddleware);

// Routes — API never calls LLM, never touches DB in hot path
app.use('/health', healthRouter);
app.use('/api/v2/chat', authMiddleware, chatRouter);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, requestId: req.headers['x-request-id'] }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

export { app };
```

### `apps/api/src/routes/chat.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { enqueueChat } from '../queues/enqueue';
import { subscribeChatStream } from '../sse/stream.handler';
import { redis } from '@aion/redis/client';

const router = Router();

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(8192),
  sessionId: z.string().uuid(),
  model: z.enum(['gpt-4o', 'claude-3-5-sonnet', 'gemini-pro']).optional(),
  stream: z.boolean().default(true),
});

// POST /api/v2/chat — enqueue and return jobId in <5ms
router.post('/', async (req: Request, res: Response) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { message, sessionId, model, stream } = parsed.data;
  const userId = req.user!.id;
  const jobId = crypto.randomUUID();

  await enqueueChat({
    jobId,
    userId,
    sessionId,
    message,
    model: model ?? 'gpt-4o',
    stream,
    requestedAt: Date.now(),
  });

  // Return immediately — worker handles all processing
  res.status(202).json({
    jobId,
    streamUrl: `/api/v2/chat/stream/${jobId}`,
  });
});

// GET /api/v2/chat/stream/:jobId — SSE stream for real-time response
router.get('/stream/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  await subscribeChatStream(jobId, res);
});

export { router as chatRouter };
```

### `apps/api/src/sse/stream.handler.ts`

```typescript
import { Response } from 'express';
import { getSubscriber } from '@aion/redis/pubsub';
import { logger } from '@aion/shared/utils/logger';

const HEARTBEAT_INTERVAL = 15_000;
const STREAM_TIMEOUT = 120_000;

export async function subscribeChatStream(jobId: string, res: Response): Promise<void> {
  const channel = `chat:stream:${jobId}`;
  const subscriber = await getSubscriber();

  let heartbeat: NodeJS.Timeout;
  let timeout: NodeJS.Timeout;
  let done = false;

  const cleanup = async () => {
    if (done) return;
    done = true;
    clearInterval(heartbeat);
    clearTimeout(timeout);
    await subscriber.unsubscribe(channel);
    res.end();
  };

  heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, HEARTBEAT_INTERVAL);

  timeout = setTimeout(async () => {
    res.write('event: timeout\ndata: {}\n\n');
    await cleanup();
  }, STREAM_TIMEOUT);

  res.on('close', cleanup);

  await subscriber.subscribe(channel, (message: string) => {
    try {
      const event = JSON.parse(message);

      if (event.type === 'delta') {
        res.write(`event: delta\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
      } else if (event.type === 'done') {
        res.write(`event: done\ndata: ${JSON.stringify({ usage: event.usage })}\n\n`);
        cleanup();
      } else if (event.type === 'error') {
        res.write(`event: error\ndata: ${JSON.stringify({ message: event.message })}\n\n`);
        cleanup();
      }
    } catch (e) {
      logger.error({ e, jobId }, 'SSE parse error');
    }
  });
}
```

### `apps/api/src/middleware/ratelimit.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { redis } from '@aion/redis/client';

// Sliding window rate limiter — distributed via Redis
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id ?? req.ip;
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit = 60;

  const pipeline = redis.multi();
  pipeline.zremrangebyscore(key, 0, now - window);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.zcard(key);
  pipeline.expire(key, 120);

  const results = await pipeline.exec();
  const count = results![2][1] as number;

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

  if (count > limit) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 60 seconds.' });
  }

  next();
}
```

---

## Part 4: Queue System

### `packages/queues/src/queues.ts`

```typescript
import { Queue, QueueOptions } from 'bullmq';
import { redis } from '@aion/redis/client';

const defaultOpts: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

export const chatQueue = new Queue('chat', defaultOpts);
export const searchQueue = new Queue('search', defaultOpts);
export const voiceQueue = new Queue('voice', defaultOpts);
export const embeddingsQueue = new Queue('embeddings', defaultOpts);

export type ChatJobData = {
  jobId: string;
  userId: string;
  sessionId: string;
  message: string;
  model: string;
  stream: boolean;
  requestedAt: number;
};
```

### `apps/api/src/queues/enqueue.ts`

```typescript
import { chatQueue, ChatJobData } from '@aion/queues';

export async function enqueueChat(data: ChatJobData): Promise<void> {
  await chatQueue.add('process', data, {
    jobId: data.jobId,
    priority: 1,
  });
}
```

---

## Part 5: LLM Worker Service

### `apps/worker-llm/src/worker.ts`

```typescript
import { Worker, Job } from 'bullmq';
import { redis } from '@aion/redis/client';
import { getPublisher } from '@aion/redis/pubsub';
import { routeLLM } from './llm/router';
import { buildContext } from '@aion/memory/short-term';
import { AgentPlanner } from './agent/planner';
import { logger } from '@aion/shared/utils/logger';
import { ChatJobData } from '@aion/queues';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '10');

const worker = new Worker<ChatJobData>(
  'chat',
  async (job: Job<ChatJobData>) => {
    const { jobId, userId, sessionId, message, model } = job.data;
    const channel = `chat:stream:${jobId}`;
    const publisher = await getPublisher();

    logger.info({ jobId, userId, model }, 'Processing chat job');

    try {
      // Fetch short-term context from Redis (never from DB on hot path)
      const context = await buildContext(sessionId);

      // Check response cache for repeated prompts
      const cacheKey = `response:${Buffer.from(message).toString('base64').slice(0, 32)}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        await publisher.publish(channel, JSON.stringify({ type: 'delta', content: cached }));
        await publisher.publish(channel, JSON.stringify({ type: 'done', usage: { cached: true } }));
        return;
      }

      // Determine if agent mode is needed
      const needsAgent = detectAgentIntent(message);

      if (needsAgent) {
        const planner = new AgentPlanner({ model, userId, sessionId, channel, publisher });
        await planner.run(message, context);
      } else {
        // Direct LLM call with streaming
        const stream = await routeLLM({ model, messages: [...context, { role: 'user', content: message }] });
        let fullResponse = '';

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            fullResponse += delta;
            await publisher.publish(channel, JSON.stringify({ type: 'delta', content: delta }));
          }
        }

        // Cache short responses
        if (fullResponse.length < 2048) {
          await redis.setex(cacheKey, 300, fullResponse);
        }

        await publisher.publish(channel, JSON.stringify({ type: 'done', usage: { tokens: fullResponse.length } }));

        // Persist to short-term memory
        await updateContext(sessionId, message, fullResponse);
      }
    } catch (err) {
      logger.error({ err, jobId }, 'Worker processing error');
      await publisher.publish(channel, JSON.stringify({ type: 'error', message: 'Processing failed' }));
      throw err; // BullMQ will retry
    }
  },
  { connection: redis, concurrency: CONCURRENCY }
);

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job permanently failed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — draining worker');
  await worker.close();
  process.exit(0);
});

function detectAgentIntent(message: string): boolean {
  const agentKeywords = ['search', 'find', 'browse', 'analyze', 'write code', 'execute', 'plan'];
  return agentKeywords.some(k => message.toLowerCase().includes(k));
}
```

### `apps/worker-llm/src/llm/router.ts`

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CircuitBreaker } from './circuit-breaker';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const openaiBreaker = new CircuitBreaker('openai', { timeout: 30000, threshold: 5 });
const anthropicBreaker = new CircuitBreaker('anthropic', { timeout: 30000, threshold: 5 });

type Message = { role: 'user' | 'assistant' | 'system'; content: string };

export async function routeLLM({ model, messages }: { model: string; messages: Message[] }) {
  if (model.startsWith('gpt')) {
    return openaiBreaker.execute(() =>
      openai.chat.completions.create({ model, messages, stream: true })
    );
  }

  if (model.startsWith('claude')) {
    return anthropicBreaker.execute(() =>
      anthropic.messages.stream({
        model,
        max_tokens: 4096,
        messages: messages.filter(m => m.role !== 'system'),
        system: messages.find(m => m.role === 'system')?.content,
      })
    );
  }

  throw new Error(`Unknown model: ${model}`);
}
```

---

## Part 6: Agent System (ReAct Planner)

### `apps/worker-llm/src/agent/planner.ts`

```typescript
import { routeLLM } from '../llm/router';
import { ToolRegistry } from './tool-registry';
import { longTermMemory } from '@aion/memory/long-term';
import { logger } from '@aion/shared/utils/logger';

type PlannerOptions = {
  model: string;
  userId: string;
  sessionId: string;
  channel: string;
  publisher: any;
};

type Message = { role: 'user' | 'assistant' | 'system'; content: string };

const SYSTEM_PROMPT = `You are AION, an AI Operations Node. You reason step-by-step before acting.
Use tools when needed. Format your thinking as:
Thought: <your reasoning>
Action: <tool_name>
Action Input: <json_input>
After receiving an observation, continue reasoning until you have a final answer.
Final Answer: <your response to the user>`;

export class AgentPlanner {
  private registry = new ToolRegistry();
  private maxSteps = 10;

  constructor(private opts: PlannerOptions) {}

  async run(userMessage: string, context: Message[]): Promise<void> {
    const { model, userId, channel, publisher } = this.opts;

    // Retrieve relevant long-term memories
    const memories = await longTermMemory.search(userMessage, userId, 3);
    const memoryContext = memories.length > 0
      ? `Relevant context from memory:\n${memories.map(m => m.content).join('\n')}`
      : '';

    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT + (memoryContext ? `\n\n${memoryContext}` : '') },
      ...context,
      { role: 'user', content: userMessage },
    ];

    let steps = 0;

    while (steps < this.maxSteps) {
      steps++;

      const stream = await routeLLM({ model, messages });
      let fullResponse = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          fullResponse += delta;
          // Stream thinking to client
          await publisher.publish(channel, JSON.stringify({ type: 'delta', content: delta }));
        }
      }

      messages.push({ role: 'assistant', content: fullResponse });

      // Parse action
      const actionMatch = fullResponse.match(/Action: (\w+)\nAction Input: ({.*?})/s);
      const finalMatch = fullResponse.match(/Final Answer: (.*)/s);

      if (finalMatch) {
        // Store in long-term memory
        await longTermMemory.save({
          userId,
          content: `User: ${userMessage}\nAION: ${finalMatch[1]}`,
          metadata: { sessionId: this.opts.sessionId, timestamp: Date.now() },
        });

        await publisher.publish(channel, JSON.stringify({ type: 'done', usage: { steps } }));
        return;
      }

      if (actionMatch) {
        const [, toolName, rawInput] = actionMatch;
        const toolInput = JSON.parse(rawInput);

        const tool = this.registry.get(toolName);
        if (!tool) {
          messages.push({ role: 'user', content: `Observation: Tool "${toolName}" not found.` });
          continue;
        }

        logger.info({ tool: toolName, input: toolInput, userId }, 'Agent executing tool');

        try {
          const result = await tool.execute(toolInput, { userId });
          messages.push({ role: 'user', content: `Observation: ${JSON.stringify(result)}` });
        } catch (err: any) {
          messages.push({ role: 'user', content: `Observation: Tool error — ${err.message}` });
        }
      }
    }

    await publisher.publish(channel, JSON.stringify({
      type: 'error',
      message: 'Agent reached max steps without completing task.',
    }));
  }
}
```

### `apps/worker-llm/src/agent/tool-registry.ts`

```typescript
export type ToolContext = { userId: string };

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  permissionLevel: 'public' | 'user' | 'admin';
  execute(input: Record<string, any>, ctx: ToolContext): Promise<any>;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  constructor() {
    this.register(webSearchTool);
    this.register(codeExecutorTool);
    this.register(memoryRecallTool);
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  toOpenAISchema() {
    return Array.from(this.tools.values()).map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: t.parameters,
          required: Object.entries(t.parameters)
            .filter(([, v]) => v.required)
            .map(([k]) => k),
        },
      },
    }));
  }
}

const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: {
    query: { type: 'string', description: 'Search query', required: true },
    numResults: { type: 'number', description: 'Number of results (max 10)' },
  },
  permissionLevel: 'public',
  async execute({ query, numResults = 5 }) {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`,
      { headers: { 'X-Subscription-Token': process.env.BRAVE_API_KEY! } }
    );
    const data = await res.json();
    return data.web?.results?.slice(0, numResults).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  },
};

const codeExecutorTool: Tool = {
  name: 'execute_code',
  description: 'Execute Python or JavaScript code in a sandboxed environment',
  parameters: {
    language: { type: 'string', description: 'Language: python or javascript', required: true },
    code: { type: 'string', description: 'Code to execute', required: true },
  },
  permissionLevel: 'user',
  async execute({ language, code }) {
    // Sandbox execution — integrate with e2b.dev or similar
    throw new Error('Code execution sandbox not yet integrated — use e2b SDK');
  },
};

const memoryRecallTool: Tool = {
  name: 'recall_memory',
  description: 'Recall relevant past conversations and context',
  parameters: {
    query: { type: 'string', description: 'What to recall', required: true },
  },
  permissionLevel: 'user',
  async execute({ query }, ctx) {
    const { longTermMemory } = await import('@aion/memory/long-term');
    return longTermMemory.search(query, ctx.userId, 5);
  },
};
```

---

## Part 7: Redis Cache & PubSub

### `packages/redis/src/client.ts`

```typescript
import { Redis, Cluster } from 'ioredis';

const isCluster = process.env.REDIS_CLUSTER === 'true';

export const redis = isCluster
  ? new Cluster(
      process.env.REDIS_NODES!.split(',').map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      }),
      { enableReadyCheck: true, scaleReads: 'slave' }
    )
  : new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

redis.on('error', (err) => console.error('Redis error:', err));
```

### `packages/redis/src/pubsub.ts`

```typescript
import { Redis } from 'ioredis';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

export async function getPublisher(): Promise<Redis> {
  if (!publisher) {
    publisher = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }
  return publisher;
}

export async function getSubscriber(): Promise<Redis> {
  if (!subscriber) {
    subscriber = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }
  return subscriber;
}
```

---

## Part 8: Vector DB — Long-Term Memory

### `packages/memory/src/long-term.ts`

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COLLECTION = 'aion_memory';
const VECTOR_SIZE = 1536; // text-embedding-3-small

async function ensureCollection() {
  try {
    await qdrant.getCollection(COLLECTION);
  } catch {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    });
  }
}

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8192),
  });
  return res.data[0].embedding;
}

export const longTermMemory = {
  async save({ userId, content, metadata }: {
    userId: string;
    content: string;
    metadata: Record<string, any>;
  }) {
    await ensureCollection();
    const vector = await embed(content);
    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: [{
        id: crypto.randomUUID(),
        vector,
        payload: { userId, content, ...metadata },
      }],
    });
  },

  async search(query: string, userId: string, topK = 5) {
    await ensureCollection();
    const vector = await embed(query);
    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: topK,
      filter: { must: [{ key: 'userId', match: { value: userId } }] },
      with_payload: true,
    });
    return results.map(r => ({
      content: r.payload!.content as string,
      score: r.score,
      metadata: r.payload,
    }));
  },
};
```

### `packages/memory/src/short-term.ts`

```typescript
import { redis } from '@aion/redis/client';

const MAX_MESSAGES = 20;
const TTL_SECONDS = 3600; // 1 hour

type Message = { role: 'user' | 'assistant'; content: string; timestamp: number };

export async function buildContext(sessionId: string): Promise<Message[]> {
  const key = `ctx:${sessionId}`;
  const raw = await redis.lrange(key, 0, MAX_MESSAGES - 1);
  return raw.map(m => JSON.parse(m));
}

export async function updateContext(sessionId: string, userMsg: string, assistantMsg: string) {
  const key = `ctx:${sessionId}`;
  const pipeline = redis.multi();

  pipeline.rpush(key, JSON.stringify({ role: 'user', content: userMsg, timestamp: Date.now() }));
  pipeline.rpush(key, JSON.stringify({ role: 'assistant', content: assistantMsg, timestamp: Date.now() }));
  pipeline.ltrim(key, -MAX_MESSAGES, -1);
  pipeline.expire(key, TTL_SECONDS);

  await pipeline.exec();
}
```

---

## Part 9: Kubernetes Deployment

### `infra/k8s/api-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aion-api
  labels:
    app: aion-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aion-api
  template:
    metadata:
      labels:
        app: aion-api
    spec:
      containers:
        - name: api
          image: aion/api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: REDIS_HOST
              valueFrom:
                secretKeyRef:
                  name: aion-secrets
                  key: redis-host
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: aion-secrets
                  key: jwt-secret
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: aion-api-svc
spec:
  selector:
    app: aion-api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

### `infra/k8s/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aion-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aion-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: External
      external:
        metric:
          name: bullmq_queue_depth
          selector:
            matchLabels:
              queue: chat
        target:
          type: AverageValue
          averageValue: 100  # Scale up when 100+ jobs queued per pod
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aion-worker-llm-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aion-worker-llm
  minReplicas: 2
  maxReplicas: 30
  metrics:
    - type: External
      external:
        metric:
          name: bullmq_queue_depth
          selector:
            matchLabels:
              queue: chat
        target:
          type: AverageValue
          averageValue: 20
```

---

## Part 10: Observability

### `packages/shared/src/utils/logger.ts`

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: process.env.SERVICE_NAME ?? 'aion',
    env: process.env.NODE_ENV,
  },
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

### `packages/shared/src/utils/tracer.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME ?? 'aion',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTLP_ENDPOINT ?? 'http://jaeger:4318/v1/traces',
  }),
});

sdk.start();

process.on('SIGTERM', () => sdk.shutdown());
```

---

## Part 11: Deployment Strategy

### Multi-Region Architecture

```
Region: ap-south-1 (Primary — Mumbai)
  ├── AZ-1a: API(3) + Worker-LLM(5) + Worker-Search(2)
  ├── AZ-1b: API(3) + Worker-LLM(5) + Worker-Voice(2)
  └── AZ-1c: API(2) + Worker-Embed(2)
  Shared: Redis Cluster, PostgreSQL Primary, Qdrant

Region: us-east-1 (Secondary — failover + low-latency US)
  └── Replica set: API(2) + Workers(3) + Redis Replica + PG Read Replica

CDN: Cloudflare
  ├── Static assets → edge cache
  ├── API requests → route to nearest healthy region
  └── DDoS + WAF protection
```

### Docker Compose (Development)

```yaml
version: '3.9'
services:
  api:
    build: ./apps/api
    ports: ['3000:3000']
    environment:
      REDIS_HOST: redis
      POSTGRES_URL: postgresql://aion:aion@postgres:5432/aion
    depends_on: [redis, postgres, qdrant]

  worker-llm:
    build: ./apps/worker-llm
    environment:
      REDIS_HOST: redis
      QDRANT_URL: http://qdrant:6333
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on: [redis, qdrant]
    deploy:
      replicas: 2

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    command: redis-server --appendonly yes

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: aion
      POSTGRES_USER: aion
      POSTGRES_PASSWORD: aion
    volumes: [postgres_data:/var/lib/postgresql/data]

  qdrant:
    image: qdrant/qdrant:latest
    ports: ['6333:6333']
    volumes: [qdrant_data:/qdrant/storage]

  redis-insight:
    image: redislabs/redisinsight:latest
    ports: ['8001:8001']

volumes:
  postgres_data:
  qdrant_data:
```

---

## Part 12: Upgrade Roadmap (v1 → v2)

| Phase | Duration | Focus | Key Deliverable |
|-------|----------|-------|-----------------|
| Phase 0 | Week 1 | Repo restructure to monorepo | pnpm workspaces, turbo.json, shared packages scaffolded |
| Phase 1 | Week 2–3 | Redis + Queue integration | Redis cluster up, BullMQ queues wired, API enqueues instead of calling LLM |
| Phase 2 | Week 3–4 | Worker service | LLM worker consuming queue, SSE streaming via Redis pubsub |
| Phase 3 | Week 5 | Memory system | Short-term (Redis) + long-term (Qdrant) memory live |
| Phase 4 | Week 6 | Agent system | ReAct planner + tool registry with web search + code execution |
| Phase 5 | Week 7 | Observability | Pino logs, OTEL traces, Prometheus metrics, Grafana dashboards |
| Phase 6 | Week 8 | Kubernetes + HPA | K8s manifests, auto-scaling rules, multi-region readiness |
| Phase 7 | Week 9–10 | Load testing + hardening | k6 load tests at 2000 RPS, circuit breakers, rate limits validated |

---

## Scaling Benchmarks (Target)

| Metric | v1 Current | v2 Target |
|--------|-----------|-----------|
| Daily Users | ~1K | 10M |
| Peak RPS | ~10 | 1000–2000 |
| API Latency (p99, excl. LLM) | ~500ms | <200ms |
| LLM calls in API process | Yes (blocking) | No (async workers) |
| Single point of failure | Yes (monolith) | No (all services redundant) |
| Memory system | Chat transcript | Redis + Qdrant RAG |
| Agent capability | None | ReAct planner + tool registry |
| Observability | Console logs | OTEL + Pino + Prometheus |
| Horizontal scaling | No | Full (K8s HPA) |
