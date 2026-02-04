import mongoose from 'mongoose';
import { getRuntimeConfig } from '../../config/env.js';

export async function connectMongoIfConfigured(): Promise<void> {
  const cfg = getRuntimeConfig();
  if (!cfg.mongodbUri) {
    // eslint-disable-next-line no-console
    console.warn('MONGODB_URI not set; running without database');
    return;
  }

  try {
    await mongoose.connect(cfg.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection failed:', err?.message || err);
  }

  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', (err as any)?.message || err);
  });

  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('MongoDB disconnected');
  });
}

export function mongoReadyState(): number {
  return mongoose.connection.readyState;
}
