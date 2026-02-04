import http from 'http';
import { createApp, initDependencies } from './app.js';
import { getRuntimeConfig } from './config/env.js';

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
