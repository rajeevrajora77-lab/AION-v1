import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health', async (req: any, res: any) => {
  const healthcheck: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    if (mongoose.connection.readyState === 1) {
      healthcheck.database = 'connected';
    } else {
      healthcheck.database = 'disconnected';
      healthcheck.status = 'degraded';
    }

    const statusCode = healthcheck.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthcheck);
  } catch (error: any) {
    healthcheck.status = 'error';
    healthcheck.error = error.message;
    res.status(503).json(healthcheck);
  }
});

router.get('/ready', async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ status: 'not ready', database: 'not connected' });
    }

    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

router.get('/status', async (req: any, res: any) => {
  res.status(200).json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name || 'N/A',
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router;
