import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { env } from '../config/env';

export const groqClient = new Groq({ apiKey: env.GROQ_API_KEY || 'dummy' });
export const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY || 'dummy' });
