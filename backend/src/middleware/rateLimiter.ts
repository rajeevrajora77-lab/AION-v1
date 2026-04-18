import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../types';

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many chat requests. Slow down.' },
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?._id || req.ip || 'unknown';
  }
});

export const searchLimiter = rateLimit({ 
    windowMs: 60 * 1000, 
    max: 30,
    message: { error: 'Too many search requests. Slow down.' }
});

export const authLimiter = rateLimit({ 
    windowMs: 60 * 1000, 
    max: 5,
    message: { error: 'Too many auth requests. Slow down.' }
});

export const voiceLimiter = rateLimit({ 
    windowMs: 60 * 1000, 
    max: 10,
    message: { error: 'Too many voice requests. Slow down.' }
});

export const uploadLimiter = rateLimit({ 
    windowMs: 60 * 1000, 
    max: 10,
    message: { error: 'Too many upload requests. Slow down.' }
});
