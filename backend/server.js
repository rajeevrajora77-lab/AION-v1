import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
// import chatRoutes from './routes/chat.js';
// import searchRoutes from './routes/search.js';
// import voiceRoutes from './routes/voice.js';
// import { errorHandler } from './middleware/errorHandler.js';
// import rateLimiter from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
// app.use(rateLimiter);
// Root route - API information
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

// Health check endpoint - always returns OK if server is running
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Readiness endpoint - checks if dependencies are available
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

// Status endpoint - detailed system information
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

// MongoDB connection with graceful failure handling
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aion', {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('⚠️  MongoDB connection failed:', err.message);
    console.log('⚠️  Server will continue without database. Chat history will be unavailable.');
  });

// MongoDB connection error handling
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

// API Routes - wrapped in try-catch for safety
try {
  app.use('/api/chat', chatRoutes);
  console.log('✅ Chat routes loaded');
} catch (error) {
  console.error('❌ Failed to load chat routes:', error.message);
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested endpoint does not exist',
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, closing server gracefully');
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received, closing server gracefully');
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('✅ AION v1 Server Started Successfully');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Ready check: http://localhost:${PORT}/ready`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log('='.repeat(50));
});

export default app;
