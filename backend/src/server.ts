import { startServer as startFromApp } from './app.js';

export async function startServer(): Promise<void> {
  return startFromApp();
}
