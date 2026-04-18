import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const MALICIOUS_PATTERNS = [
  /ignore previous instructions/i,
  /bypass/i,
  /system prompt/i,
  /you are now/i,
  /exec\(/i,
  /eval\(/i
];

export const promptInjectionGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!req.body || typeof req.body !== 'object') return next();

  const stringifiedBody = JSON.stringify(req.body);
  
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(stringifiedBody)) {
      logger.warn('Prompt Injection Attempt Blocked', { ip: req.ip, payload: req.body });
      return next(new AppError('Malicious prompt injection vector detected and blocked.', 403));
    }
  }

  next();
};
