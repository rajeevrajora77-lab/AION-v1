import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import { streamChatCompletion, createChatCompletion } from '../utils/openai.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Configuration
const MAX_MESSAGE_LENGTH = 10000;
const MESSAGE_LIMIT = Chat.MESSAGE_LIMIT || 200;

// POST /api/chat - Stream AI response
// optionalAuth: logged-in users get persistent sessions; guests get ephemeral in-memory session
router.post('/', optionalAuth, chatLimiter, async (req, res) => {
  try {
    logger.info('Incoming Chat Request', {
      user: req.user?.email || 'guest',
      userId: req.user?._id || 'guest',
    });

    const { message, sessionId } = req.body;

    // Enhanced input validation
    const trimmed = message?.trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`
      });
    }

    logger.info('Chat message details', {
      messageLength: trimmed.length,
      sessionId: sessionId || 'new session',
    });

    // Create/get session — only persist to DB for authenticated users
    let chat = null;
    if (req.user) {
      if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        // Only allow access to own sessions
        chat = await Chat.findOne({
          _id: sessionId,
          userId: req.user._id
        });
      }

      if (!chat) {
        chat = new Chat({
          messages: [],
          userId: req.user._id
        });
      }

      // Enforce message limit per session
      if (chat.messages.length >= MESSAGE_LIMIT) {
        return res.status(400).json({
          error: 'Session message limit reached',
          message: `This session has reached the ${MESSAGE_LIMIT} message limit. Please start a new session.`,
          code: 'SESSION_MESSAGE_LIMIT'
        });
      }

      // Add user message and save
      chat.messages.push({
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      });
      await chat.save();
    }

    // Log to Winston
    logger.logRequest(req);

    // SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    // Detect client disconnect to stop wasting LLM tokens
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    // Build messages array for LLM API
    // For guests: use only the current message (no history)
    // For users: use full session history
    let apiMessages;
    if (req.user && chat) {
      apiMessages = chat.messages.map(m => ({ role: m.role, content: m.content }));
    } else {
      apiMessages = [{ role: 'user', content: trimmed }];
    }

    // Stream response
    let fullResponse = '';
    await streamChatCompletion(
      apiMessages,
      (chunk) => {
        if (clientDisconnected) return;
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    );

    // Save AI response for authenticated users
    if (req.user && chat) {
      chat.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      });
      await chat.save();
    }

    if (!clientDisconnected) {
      // Only return a persistent sessionId for authenticated users
      const responsePayload = { done: true };
      if (req.user && chat) responsePayload.sessionId = chat._id;
      res.write(`data: ${JSON.stringify(responsePayload)}\n\n`);
      res.end();
    }

    logger.info('Chat request completed', {
      userId: req.user?._id || 'guest',
      sessionId: chat?._id || 'guest-ephemeral',
      messageLength: trimmed.length,
      responseLength: fullResponse.length
    });

  } catch (error) {
    logger.error('Chat API Error', {
      route: 'POST /api/chat',
      user: req.user?.email || 'guest',
      errorMessage: error?.message || 'Unknown error',
      errorName: error?.name || 'N/A',
      errorStatus: error?.status || error?.response?.status || 'N/A',
      errorCode: error?.code || 'N/A',
    });

    logger.logApiError(error, {
      route: 'POST /api/chat',
      userId: req.user?._id
    });

    // Avoid writing to SSE after headers already sent
    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ error: 'stream_error' })}\n\n`);
        res.end();
      } catch (_) {
        // ignore
      }
      return;
    }

    if (error.message === 'LLM API key is required but not configured' ||
        error.message === 'OpenAI unavailable' ||
        error.message === 'Circuit breaker is OPEN - service unavailable') {
      return res.status(503).json({
        error: 'AI service temporarily unavailable',
      });
    }

    if (error?.status) {
      return res.status(error.status).json({
        error: 'AI provider error',
        providerStatus: error.status,
        providerMessage: error.message || null,
        providerCode: error.code || null,
        providerType: error.type || null,
      });
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

    res.status(500).json({
      error: 'Failed to process chat request',
      detail: error?.message || 'Unknown error',
    });
  }
});

// GET /api/chat/history - Get chat history
// PROTECTED — only authenticated users have history
router.get('/history', protect, async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const chat = await Chat.findOne({
      _id: sessionId,
      userId: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    res.json({
      sessionId: chat._id,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    });
  } catch (error) {
    logger.logApiError(error, {
      route: 'GET /api/chat/history',
      userId: req.user?._id
    });
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/chat/sessions - List all sessions
// PROTECTED
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await Chat.find({ userId: req.user._id })
      .select('_id messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(
      sessions.map((session) => ({
        sessionId: session._id,
        messageCount: session.messages.length,
        lastMessage: (session.messages[session.messages.length - 1]?.content || '').substring(0, 100),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }))
    );
  } catch (error) {
    logger.logApiError(error, {
      route: 'GET /api/chat/sessions',
      userId: req.user?._id
    });
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/chat/complete - Non-streaming completion
// PROTECTED + RATE LIMITED
router.post('/complete', protect, chatLimiter, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    const trimmed = message?.trim();

    if (!trimmed) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`
      });
    }

    let chat = null;
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      chat = await Chat.findOne({
        _id: sessionId,
        userId: req.user._id
      });
    }

    if (!chat) {
      chat = new Chat({
        messages: [],
        userId: req.user._id
      });
    }

    if (chat.messages.length >= MESSAGE_LIMIT) {
      return res.status(400).json({
        error: 'Session message limit reached',
        message: `This session has reached the ${MESSAGE_LIMIT} message limit. Please start a new session.`,
        code: 'SESSION_MESSAGE_LIMIT'
      });
    }

    chat.messages.push({
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    });
    await chat.save();

    const apiMessages = chat.messages.map(m => ({ role: m.role, content: m.content }));

    const completion = await createChatCompletion(apiMessages);
    const responseContent = completion.choices[0].message.content;

    chat.messages.push({
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    });
    await chat.save();

    res.json({
      sessionId: chat._id,
      response: responseContent,
      messages: chat.messages,
    });
  } catch (error) {
    logger.logApiError(error, {
      route: 'POST /api/chat/complete',
      userId: req.user?._id
    });
    res.status(500).json({ error: 'Failed to generate completion' });
  }
});

// DELETE /api/chat/history/:id - Delete conversation
// PROTECTED
router.delete('/history/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const chat = await Chat.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    logger.logApiError(error, {
      route: 'DELETE /api/chat/history/:id',
      userId: req.user?._id
    });
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
