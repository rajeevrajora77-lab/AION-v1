import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './config/env';
import { logger } from './utils/logger';
import { sanitizeBody } from './middleware/sanitize';
import { startLLMWorker } from './workers/llmWorker';

const app = express();

app.use(cors());
app.use(express.json());
app.use(sanitizeBody);

import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import keyRoutes from './routes/keys';
import uploadRoutes from './routes/upload';
import searchRoutes from './routes/search';
import voiceRoutes from './routes/voice';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/voice', voiceRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

async function startServer() {
  try {
    if (env.MONGODB_URI) {
      await mongoose.connect(env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    }

    startLLMWorker();

    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Startup failed', { error });
    process.exit(1);
  }
}

startServer();
