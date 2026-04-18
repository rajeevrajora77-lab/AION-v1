import { Router, Request, Response } from 'express';
import { voiceLimiter } from '../middleware/rateLimiter';
import { env } from '../config/env';

// Mock protect for now
const protect = (req: any, res: any, next: any) => next();

const router = Router();

router.post('/process', protect, voiceLimiter, async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript required' });
    res.json({ reply: 'Voice processed', originalTranscript: transcript, processedAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: 'Voice processing failed' });
  }
});

router.post('/synthesize', protect, voiceLimiter, async (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented without provider' });
});

router.get('/config', protect, (req: Request, res: Response) => {
  res.json({ 
    supportedLanguages: ['en-US', 'es-ES'], 
    voiceOptions: ['neutral'], 
    mockMode: !env.GOOGLE_TTS_KEY 
  });
});

export default router;
