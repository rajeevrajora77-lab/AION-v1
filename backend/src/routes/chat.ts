import { Router, Request, Response } from 'express';
import { chatService } from '../services/chatService';
import { chatLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { chatRepository } from '../repositories/chatRepository';
import { AuthRequest } from '../types';

// Mock protect for now to satisfy compilation. Real one should use JWT validation.
const protect = (req: any, res: any, next: any) => {
  req.user = { _id: 'mock-user-id', email: 'test@test.com' };
  next();
};

const router = Router();

router.post('/', protect, chatLimiter, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { message, sessionId } = req.body;
    await chatService.processMessage(authReq.user!._id, sessionId, message, true, res);
  } catch (err: any) {
    logger.error('Stream chat err', { err: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

router.get('/history', protect, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { sessionId } = req.query as { sessionId: string };
    const session = await chatRepository.findById(sessionId, authReq.user!._id);
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/complete', protect, chatLimiter, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { message, sessionId } = req.body;
    const response = await chatService.processMessage(authReq.user!._id, sessionId, message, false);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/sessions', protect, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const sessions = await chatRepository.findByUser(authReq.user!._id);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
