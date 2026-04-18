import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

export const chatRequestSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty').max(10000, 'Payload too large'),
    sessionId: z.string().optional()
  })
});

export const searchSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required')
  })
});

export const voiceSchema = z.object({
  body: z.object({
    transcript: z.string().min(1, 'Transcript required')
  })
});
