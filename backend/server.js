import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import chatRoutes from './routes/chat.js';
import searchRoutes from './routes/search.js';
import voiceRoutes from './routes/voice.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger from './utils/logger.js';

dotenv.config();

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================
const hasLlmKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
const requiredEnvVars = ['FRONTEND_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (!hasLlmKey) {
  logger.error('CRITICAL: Neither GROQ_API_KEY nor OPENAI_API_KEY is set!');
  logger.error('Get a FREE Groq API key at: https://console.groq.com');
  process.exit(1);
}

if (missingEnvVars.length > 0) {
  logger.error('CRITICAL: Missing required environment variables: ' + missingEnvVars.join(', '));
  process.exit(1);
}

logger.info('All required environment variables are set');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS — allow chat.rajora.co.in (and www/apex for future use)
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://chat.rajora.co.in',
      'https://rajora.co.in',
      'https://www.rajora.co.in',
    ];

    if (!IS_PRODUCTION) {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Return clean 403 instead of throwing an error
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 3600,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Request logging
app.use(requestLogger);

// Global rate limiting — BEFORE body parsing to prevent memory exhaustion
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: '15 minutes',
    });
  },
});
app.use(limiter);

// Body parsing — AFTER rate limiter, with reduced size limit (1MB, not 10MB)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================================
// ROOT ENDPOINT
// ============================================================================
app.get('/', (req, res) => {
  res.json({
    name: 'AION v1 API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      chat: '/api/chat',
      search: '/api/search',
      voice: '/api/voice',
      auth: '/api/auth',
    },
    message: 'AI Operating Intelligence Network - Backend API',
  });
});

// ============================================================================
// MONGODB CONNECTION
// ============================================================================
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      logger.info('MongoDB connected successfully');
    })
    .catch((err) => {
      logger.error('MongoDB connection failed: ' + err.message);
      logger.warn('Server will continue without database.');
    });
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error: ' + err.message);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
} else {
  logger.warn('MONGODB_URI not set. Running without database.');
}

// ============================================================================
// API ROUTES — No try/catch. If a route module fails to load, the server MUST crash.
// A server running without auth routes is worse than a server not starting at all.
// ============================================================================
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/voice', voiceRoutes);
app.use(healthRoutes);
logger.info('All routes loaded successfully');

// ============================================================================
// ERROR HANDLERS
// ============================================================================
// 404 handler — must be after all routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler — uses the imported errorHandler middleware
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN — store HTTP server reference
// ============================================================================
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('='.repeat(50));
  logger.info('AION v1 Server Started Successfully');
  logger.info('='.repeat(50));
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`LLM: ${process.env.GROQ_API_KEY ? 'Groq (free)' : 'OpenAI'}`);
  logger.info('='.repeat(50));
});

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    logger.info('HTTP server closed');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
    process.exit(0);
  });
  // Force shutdown after 10s if graceful fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

export default app;
