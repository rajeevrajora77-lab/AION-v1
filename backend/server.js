import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
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

dotenv.config();

// ============================================================================
// ENVIRONMENT VARIABLE VALIDATION
// ============================================================================

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'FRONTEND_URL',
  'MONGODB_URI',  // Added: CRITICAL
  'NODE_ENV'
];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

console.log('✅ All required environment variables are set');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// MIDDLEWARE CONFIGURATION (PROPER ORDER)
// ============================================================================

// 1. Security Headers (FIRST)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS Configuration (STRICT)
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://rajora.co.in',
      'https://www.rajora.co.in',
    ];
    
    // Allow localhost only in development
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:5173'
      );
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
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

// 3. Request Logging
app.use(requestLogger);

// 4. Rate Limiting (Production-Grade)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ready' || req.path === '/status';
  },
});

app.use(limiter);

// 5. Body Parsing with Size Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// MONGODB CONNECTION WITH RETRY LOGIC
// ============================================================================

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      console.error(`⚠️ MongoDB connection attempt ${i + 1}/${retries} failed:`, err.message);
      if (i === retries - 1) {
        console.error('❌ MongoDB connection failed after all retries');
        console.log('⚠️ Server will continue without database. Some features will be unavailable.');
      } else {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
};

// Start MongoDB connection
connectWithRetry();

// MongoDB event handlers
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
  connectWithRetry();
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ============================================================================
// ROOT & HEALTH CHECK ENDPOINTS
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    name: 'AION v1 API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      ready: '/ready',
      status: '/status',
      chat: '/api/chat',
      search: '/api/search',
      voice: '/api/voice',
    },
    message: 'AI Operating Intelligence Network - Backend API'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/ready', (req, res) => {
  const ready = {
    server: true,
    mongodb: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  };
  
  const allReady = Object.values(ready).every(v => v === true || typeof v === 'string');
  
  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    services: ready,
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ============================================================================
// SHADOW PROXY FOR PYTHON BACKEND (ZERO-DOWNTIME DEPLOYMENT)
// ============================================================================

app.use('/__aion_shadow/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/__aion_shadow/api': '',
  },
  onError: (err, req, res) => {
    console.warn('Shadow API proxy error:', err.message);
    res.status(503).json({ error: 'Shadow API unavailable' });
  },
  logLevel: 'warn',
}));

// Serve new AION UI from shadow path
app.use('/__aion_shadow/ui', express.static('frontend/dist'));

// ============================================================================
// API ROUTES
// ============================================================================

// Health routes (no auth required)
app.use(healthRoutes);

// Main API routes
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/auth', authRoutes);

console.log('✅ All routes loaded successfully');

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested endpoint does not exist',
  });
});

// Global Error Handler (MUST BE LAST)
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received, closing server gracefully`);
  
  // Close MongoDB connection
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed');
    } catch (err) {
      console.error('❌ Error closing MongoDB:', err.message);
    }
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled Promise Rejection Handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to log to an error tracking service
});

// Uncaught Exception Handler
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Log to error tracking service, then exit
  process.exit(1);
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('✅ AION v1 Server Started Successfully');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Ready: http://localhost:${PORT}/ready`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`🔒 Security: Helmet + CORS + Rate Limiting enabled`);
  console.log('='.repeat(60));
});

export default app;
