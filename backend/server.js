import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import chatRoutes from './routes/chat.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger from './utils/logger.js';

dotenv.config();

// ============================================================================
// PHASE 1: ENVIRONMENT VALIDATION — HARD FAIL ON MISSING VARS
// ============================================================================
const hasLlmKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

const requiredEnvVars = [
  'FRONTEND_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_URI',
];

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

if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
  logger.error('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be DIFFERENT values!');
  process.exit(1);
}

logger.info('All required environment variables are set and valid');

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

// ============================================================================
// FIX: CORS — build allowlist dynamically from FRONTEND_URL env var
// This prevents CORS blocking when the deployed URL changes across environments.
// Static known origins are kept as a base; FRONTEND_URL is always injected.
// ============================================================================

// Base static origins (known production domains)
const staticOrigins = [
  'https://chat.rajora.co.in',
  'https://rajora.co.in',
  'https://www.rajora.co.in',
  'https://rajora.live',
  'https://www.rajora.live',
  'https://chat.rajora.live',
];

// Dynamically include FRONTEND_URL from env (handles Vercel, Render, custom domains)
const envFrontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

// Merge and deduplicate
const allowedOrigins = [...new Set([...staticOrigins, ...envFrontendUrls])];

// In non-production, also allow localhost variants
if (!IS_PRODUCTION) {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  );
}

logger.info('CORS allowed origins: ' + allowedOrigins.join(', '));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Exact match
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments (*.vercel.app) in non-production
    if (!IS_PRODUCTION && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow Render preview deployments (*.onrender.com) in non-production
    if (!IS_PRODUCTION && origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }

    logger.warn('CORS blocked request from origin: ' + origin);
    return callback(new Error('CORS: Origin not allowed: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 3600,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Explicitly handle preflight for all routes
app.options('*', cors(corsOptions));

// Request logging
app.use(requestLogger);

// Global rate limiting
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

// Body parsing
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
// PHASE 3: MONGODB CONNECTION — HARD FAIL with retry
// ============================================================================
const connectWithRetry = async (attempt = 1, maxAttempts = 3) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
    if (attempt < maxAttempts) {
      logger.info(`Retrying in 3 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return connectWithRetry(attempt + 1, maxAttempts);
    }
    logger.error('CRITICAL: MongoDB connection failed after ' + maxAttempts + ' attempts. Server cannot start without database.');
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB runtime error: ' + err.message);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — attempting reconnect...');
});

await connectWithRetry();

// ============================================================================
// API ROUTES
// ============================================================================
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use(healthRoutes);

logger.info('All routes loaded successfully');

// ============================================================================
// ERROR HANDLERS
// ============================================================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
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
