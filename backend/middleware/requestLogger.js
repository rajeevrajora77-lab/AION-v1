import crypto from 'crypto';
import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const id = crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-ID', id);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      type: 'request',
      id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}

export default requestLogger;
