import crypto from 'crypto';

export function requestLogger(req, res, next) {
  const id = crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-ID', id);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      type: 'request',
      id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    }));
  });

  next();
}

export default requestLogger;
