import express from 'express';
import mongoose from 'mongoose';

// Legacy model/infra imports (Phase 3.3 keeps behavior; Phase 4 moves to services/infra)
import Chat from '../../../models/Chat.js';
import { streamChatCompletion, createChatCompletion } from '../../../utils/openai.js';
import { protect } from '../middleware/auth.js';
import logger from '../../../utils/logger.js';

const router = express.Router();

const MAX_MESSAGE_LENGTH = 10000;

function isValidObjectId(id: unknown): id is string {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

router.post('/', protect, async (req: any, res: any) => {
  try {
    const { message, sessionId } = req.body;

    const trimmed = message?.trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    let chat: any = null;

    if (sessionId) {
      if (!isValidObjectId(sessionId)) {
        chat = new Chat({ messages: [], userId: req.user._id });
      } else {
        chat = await Chat.findOne({ _id: sessionId, userId: req.user._id });
        if (!chat) {
          return res.status(404).json({ error: 'Session not found or access denied' });
        }
      }
    }

    if (!chat) {
      chat = new Chat({ messages: [], userId: req.user._id });
    }

    chat.messages.push({ role: 'user', content: trimmed, timestamp: new Date() });
    await chat.save();

    logger.logRequest(req);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullResponse = '';

    await streamChatCompletion(chat.messages, (chunk: string) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    });

    chat.messages.push({ role: 'assistant', content: fullResponse, timestamp: new Date() });
    await chat.save();

    res.write(`data: ${JSON.stringify({ done: true, sessionId: chat._id })}\n\n`);
    res.end();

    logger.info('Chat request completed', {
      userId: req.user._id,
      sessionId: chat._id,
      messageLength: trimmed.length,
      responseLength: fullResponse.length,
    });
  } catch (error: any) {
    logger.logApiError(error, { route: 'POST /api/chat', userId: req.user?._id });

    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ error: 'stream_error' })}\n\n`);
        res.end();
      } catch {
        // ignore
      }
      return;
    }

    if (error?.message === 'OpenAI unavailable') {
      return res.status(503).json({ error: 'AI service temporarily unavailable' });
    }

    if (error?.response?.status) {
      const status = error.response.status;
      const data = error.response.data || {};
      return res.status(status).json({
        error: 'AI provider error',
        providerStatus: status,
        providerCode: data.error?.code || null,
        providerType: data.error?.type || null,
      });
    }

    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

router.get('/history', protect, async (req: any, res: any) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
    if (!isValidObjectId(sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });

    const chat = await Chat.findOne({ _id: sessionId, userId: req.user._id });
    if (!chat) return res.status(404).json({ error: 'Session not found or access denied' });

    res.json({ sessionId: chat._id, messages: chat.messages, createdAt: chat.createdAt, updatedAt: chat.updatedAt });
  } catch (error: any) {
    logger.logApiError(error, { route: 'GET /api/chat/history', userId: req.user?._id });
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/sessions', protect, async (req: any, res: any) => {
  try {
    const sessions = await Chat.find({ userId: req.user._id })
      .select('_id messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(
      sessions.map((session: any) => ({
        sessionId: session._id,
        messageCount: session.messages.length,
        lastMessage: session.messages[session.messages.length - 1]?.content || '',
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }))
    );
  } catch (error: any) {
    logger.logApiError(error, { route: 'GET /api/chat/sessions', userId: req.user?._id });
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/complete', protect, async (req: any, res: any) => {
  try {
    const { message, sessionId } = req.body;
    const trimmed = message?.trim();

    if (!trimmed) return res.status(400).json({ error: 'Message cannot be empty' });
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    let chat: any = null;
    if (sessionId && isValidObjectId(sessionId)) {
      chat = await Chat.findOne({ _id: sessionId, userId: req.user._id });
    }

    if (!chat) {
      chat = new Chat({ messages: [], userId: req.user._id });
    }

    chat.messages.push({ role: 'user', content: trimmed, timestamp: new Date() });
    await chat.save();

    const response = await createChatCompletion(chat.messages);

    chat.messages.push({ role: 'assistant', content: response.content, timestamp: new Date() });
    await chat.save();

    res.json({ sessionId: chat._id, response: response.content, messages: chat.messages });
  } catch (error: any) {
    logger.logApiError(error, { route: 'POST /api/chat/complete', userId: req.user?._id });
    res.status(500).json({ error: 'Failed to generate completion' });
  }
});

router.delete('/history/:id', protect, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid session ID format' });

    const result = await Chat.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!result) return res.status(404).json({ error: 'Session not found or access denied' });

    logger.logAuth('Chat session deleted', { userId: req.user._id, sessionId: id });
    res.json({ message: 'Session deleted successfully' });
  } catch (error: any) {
    logger.logApiError(error, { route: 'DELETE /api/chat/history/:id', userId: req.user?._id });
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

router.post('/clear', protect, async (req: any, res: any) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
    if (!isValidObjectId(sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });

    const chat = await Chat.findOneAndUpdate({ _id: sessionId, userId: req.user._id }, { messages: [] }, { new: true });
    if (!chat) return res.status(404).json({ error: 'Session not found or access denied' });

    res.json({ message: 'Session cleared successfully', sessionId: chat._id });
  } catch (error: any) {
    logger.logApiError(error, { route: 'POST /api/chat/clear', userId: req.user?._id });
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

export default router;
