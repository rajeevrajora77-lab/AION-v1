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
import { protect } from './middleware/auth.js';

dotenv.config();

// ============================================================================
// ENVIRONMENT VALIDATION - CRITICAL SECURITY
// ============================================================================

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'FRONTEND_URL',
  'JWT_SECRET', // CRITICAL: Required for authentication
];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error('\n' + '='.repeat(80));
  console.error('🚨 CRITICAL: Missing required environment variables!');
  console.error('='.repeat(80));
  console.error('\nMissing:', missingEnvVars.join(', '));
  
  if (missingEnvVars.includes('JWT_SECRET')) {
    console.error('\n🔑 JWT_SECRET is REQUIRED for authentication.');
    console.error('\nGenerate a strong secret:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))")\n');
  }
  
  console.error('='.repeat(80) + '\n');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================================================
// SECURITY MIDDLEWARE (MUST BE FIRST)
// ============================================================================

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

// CORS configuration - PRODUCTION SECURE
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://rajora.co.in',
      'https://www.rajora.co.in',
    ];
    
    // Add localhost only in development
    if (!IS_PRODUCTION) {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
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
}

app.use(cors(corsOptions));

// Request logging
app.use(requestLogger);

// Rate limiting - PRODUCTION GRADE
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// SHADOW ROUTING (Zero-Downtime Deployment)
// ⚠️ CRITICAL: PROTECTED WITH AUTHENTICATION
// ============================================================================

// Shadow proxy for new Python FastAPI backend
// CRITICAL: Authentication required to prevent unauthorized access
app.use('/__aion_shadow/api', protect, createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/__aion_shadow/api': '',
  },
  onError: (err, req, res) => {
    console.warn('Shadow API proxy error:', err.message);
    
    // Don't expose internal error details in production
    const errorMessage = IS_PRODUCTION 
      ? 'Shadow API temporarily unavailable'
      : `Shadow API error: ${err.message}`;
    
    res.status(503).json({
      error: 'Shadow API unavailable',
      message: errorMessage
    });
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`[Shadow Proxy] ${req.method} ${req.url} from user ${req.user?.email || 'unknown'}`);
  },
  timeout: 30000,
}));

// Serve new AION UI from shadow path (public access)
app.use('/__aion_shadow/ui', express.static('frontend/dist', {
  fallback: 'index.html',
  maxAge: '1h',
}));

// ============================================================================
// ROOT & HEALTH ENDPOINTS
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
      auth: '/api/auth',
      shadow_api: '/__aion_shadow/api (authenticated)',
      shadow_ui: '/__aion_shadow/ui',
    },
    message: 'AI Operating Intelligence Network - Backend API'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: IS_PRODUCTION ? 'production' : 'development',
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
    environment: IS_PRODUCTION ? 'production' : 'development',
    nodeVersion: process.version,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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
      console.log('✅ MongoDB connected successfully');
    })
    .catch((err) => {
      console.error('⚠️ MongoDB connection failed:', err.message);
      console.log('⚠️ Server will continue without database. Chat history will be unavailable.');
    });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });
} else {
  console.warn('⚠️ MONGODB_URI not set. Running without database.');
}

// ============================================================================
// API ROUTES
// ============================================================================

try {
  app.use('/api/chat', chatRoutes);
  app.use('/api/auth', authRoutes);
  console.log('✅ Chat and Auth routes loaded');
} catch (error) {
  console.error('❌ Failed to load chat/auth routes:', error.message);
}

try {
  app.use('/api/search', searchRoutes);
  console.log('✅ Search routes loaded');
} catch (error) {
  console.error('❌ Failed to load search routes:', error.message);
}

try {
  app.use('/api/voice', voiceRoutes);
  console.log('✅ Voice routes loaded');
} catch (error) {
  console.error('❌ Failed to load voice routes:', error.message);
}

try {
  app.use(healthRoutes);
  console.log('✅ Health routes loaded');
} catch (error) {
  console.error('❌ Failed to load health routes:', error.message);
}

// ============================================================================
// ERROR HANDLERS (MUST BE LAST)
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested endpoint does not exist',
  });
});

// Global error handler - SECURE ERROR MESSAGES
app.use((err, req, res, next) => {
  // Log full error server-side
  console.error('Global error handler:', err);
  
  // CRITICAL: Don't expose internal details in production
  if (IS_PRODUCTION) {
    res.status(err.status || 500).json({
      error: 'Internal server error',
      message: 'An error occurred processing your request'
    });
  } else {
    // In development, show more details
    res.status(err.status || 500).json({
      error: err.name || 'Error',
      message: err.message,
      ...(process.env.DEBUG === 'true' && { stack: err.stack })
    });
  }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ ${signal} received, closing server gracefully`);
  
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, log to monitoring service
  if (IS_PRODUCTION) {
    // TODO: Send to error tracking service (Sentry, etc.)
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('✅ AION v1 Server Started Successfully');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Ready check: http://localhost:${PORT}/ready`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`🔄 Shadow API: http://localhost:${PORT}/__aion_shadow/api (🔒 authenticated)`);
  console.log(`🎨 Shadow UI: http://localhost:${PORT}/__aion_shadow/ui`);
  console.log(`🔐 JWT_SECRET: Configured ✅`);
  console.log(`🔒 Security: Production-grade ✅`);
  console.log('='.repeat(50));
});

export default app;
