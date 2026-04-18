import { AsyncLocalStorage } from 'async_hooks';

export const traceStorage = new AsyncLocalStorage<string>();

export const captureTraceId = (req: any, res: any, next: any) => {
  const traceId = req.headers['x-request-id'] || `req_${Date.now()}`;
  traceStorage.run(traceId as string, () => next());
};
