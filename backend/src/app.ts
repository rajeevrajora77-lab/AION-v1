import type { Express } from 'express';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadEnvOrFail, getRuntimeConfig } from './config/env.js';
import { buildCorsOptions } from './config/cors.js';
import { connectMongoIfConfigured, mongoReadyState } from './infra/db/mongo.js';

import chatRoutes from './api/routes/chat.js';
import searchRoutes from './api/routes/search.js';
import voiceRoutes from './api/routes/voice.js';
import healthRoutes from './api/routes/health.js';
import authRoutes from './api/routes/auth.js';
import { requestLogger } from './api/middleware/requestLogger.js';
import { protect } from './api/middleware/auth.js';

export function createApp(): Express {
  loadEnvOrFail();
  const cfg = getRuntimeConfig();

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(cors(buildCorsOptions(cfg)));
  app.use(requestLogger);

  app.use(
    rateLimit({
      windowMs: cfg.rateLimit.windowMs,
      max: cfg.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: `${Math.round(cfg.rateLimit.windowMs / 60000)} minutes`,
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter: `${Math.round(cfg.rateLimit.windowMs / 60000)} minutes`,
        });
      },
    })
  );

  app.use(express.json({ limit: cfg.http.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: cfg.http.bodyLimit }));

  if (cfg.shadow.enabled) {
    app.use(
      '/__aion_shadow/api',
      protect,
      createProxyMiddleware({
        target: cfg.shadow.target,
        changeOrigin: true,
        pathRewrite: { '^/__aion_shadow/api': '' },
        timeout: 30000,
        onError: (err, req, res) => {
          const errorMessage = cfg.isProduction
            ? 'Shadow API temporarily unavailable'
            : `Shadow API error: ${(err as Error).message}`;
          res.status(503).json({ error: 'Shadow API unavailable', message: errorMessage });
        },
      })
    );
  }

  app.get('/', (req, res) => {
    res.json({
      name: 'AION v1 API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        ready: '/ready',
        status: '/status',
        chat: '/api/chat',
        search: '/api/search',
        voice: '/api/voice',
        auth: '/api/auth',
      },
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: cfg.isProduction ? 'production' : 'development',
    });
  });

  app.get('/ready', (req, res) => {
    const ready = {
      server: true,
      mongodb: mongoReadyState() === 1,
      timestamp: new Date().toISOString(),
    };
    const allReady = Object.values(ready).every((v) => v === true || typeof v === 'string');
    res.status(allReady ? 200 : 503).json({ ready: allReady, services: ready });
  });

  app.get('/status', (req, res) => {
    res.json({
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      },
      environment: cfg.isProduction ? 'production' : 'development',
      nodeVersion: process.version,
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
  });

  app.use('/api/chat', chatRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use(healthRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      message: 'The requested endpoint does not exist',
    });
  });

  app.use((err: any, req: any, res: any, next: any) => {
    // eslint-disable-next-line no-console
    console.error('Global error handler:', err);
    if (cfg.isProduction) {
      res
        .status(err?.status || 500)
        .json({ error: 'Internal server error', message: 'An error occurred processing your request' });
    } else {
      res
        .status(err?.status || 500)
        .json({ error: err?.name || 'Error', message: err?.message, ...(cfg.debug && { stack: err?.stack }) });
    }
  });

  return app;
}

export async function initDependencies(): Promise<void> {
  await connectMongoIfConfigured();
}

export async function startServer(): Promise<void> {
  const app = createApp();
  const cfg = getRuntimeConfig();

  await initDependencies();

  const server = http.createServer(app);

  server.listen(cfg.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`AION backend listening on :${cfg.port} env=${cfg.isProduction ? 'production' : 'development'}`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const _entry = process.argv[1] ? path.resolve(process.argv[1]) : null;
const _self = path.resolve(fileURLToPath(import.meta.url));
const _isMain = _entry !== null && _self === _entry;

if (_isMain) {
  startServer().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal: failed to start server', err);
    process.exit(1);
  });
}
