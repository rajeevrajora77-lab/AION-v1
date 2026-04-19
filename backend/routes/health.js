import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Check MongoDB
    if (mongoose.connection.readyState === 1) {
      healthcheck.database = 'connected';
    } else {
      healthcheck.database = 'disconnected';
      healthcheck.status = 'degraded';
    }

    // Check LLM API key — be honest about whether chat can actually work
    const hasLLMKey = !!(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY);
    healthcheck.llm = hasLLMKey ? 'configured' : 'missing';
    if (!hasLLMKey) {
      healthcheck.status = 'degraded';
    }

    const statusCode = healthcheck.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthcheck);
  } catch (error) {
    healthcheck.status = 'error';
    healthcheck.error = error.message;
    res.status(503).json(healthcheck);
  }
});

// Ready check endpoint
router.get('/ready', async (req, res) => {
  try {
    // Check if MongoDB is ready
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'not ready',
        database: 'not connected'
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});

// Status endpoint with detailed info
router.get('/status', async (req, res) => {
  const status = {
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name || 'N/A'
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };

  res.status(200).json(status);
});

export default router;
