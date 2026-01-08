import rateLimit from 'express-rate-limit';

const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
};

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Chat endpoint limiter - 10 req/min
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Chat rate limit exceeded',
  standardHeaders: true,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Chat rate limit exceeded',
      message: 'Too many chat requests. Please wait before sending another message.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Search endpoint limiter - 30 req/min
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Search rate limit exceeded',
  standardHeaders: true,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Search rate limit exceeded',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Voice endpoint limiter - 5 req/min
export const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Voice rate limit exceeded',
  standardHeaders: true,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Voice rate limit exceeded',
      message: 'Too many voice requests. Please wait before sending another.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

export default generalLimiter;
