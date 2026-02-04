import type { CorsOptions } from 'cors';
import type { RuntimeConfig } from './env.js';

export function buildCorsOptions(cfg: RuntimeConfig): CorsOptions {
  return {
    origin: (origin, callback) => {
      const allowed = ['https://rajora.co.in', 'https://www.rajora.co.in'];
      if (!cfg.isProduction) {
        allowed.push('http://localhost:3000', 'http://localhost:5173');
      }
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 3600,
    optionsSuccessStatus: 200,
  };
}
