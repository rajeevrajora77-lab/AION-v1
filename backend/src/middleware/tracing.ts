import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// This acts as our fallback distributed trace pipeline
export const traceStorage = new AsyncLocalStorage<string>();

export function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  res.setHeader('X-Request-Id', reqId);
  
  traceStorage.run(reqId as string, () => {
    next();
  });
}
