import express from 'express';
import Chat from '../models/Chat.js';
import { streamChatCompletion, createChatCompletion } from '../utils/openai.js';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Configuration
const MAX_MESSAGE_LENGTH = 10000; // Match Python backend

// Helper function to validate MongoDB ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

// POST /api/chat - Stream AI response
// PROTECTED ROUTE - Requires authentication
router.post('/', protect, async (req, res) => {
  try {
    console.log('\n📥 Incoming Chat Request');
    console.log(' - Timestamp:', new Date().toISOString());
    console.log(' - User:', req.user?.email || 'Unknown');
    console.log(' - User ID:', req.user?._id || 'Unknown');

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

    console.log(' - Message length:', trimmed.length);
    console.log(' - Session ID:', sessionId || 'new session');

    // Create/get session
    // NOTE: Frontend may send a custom string sessionId (e.g. session_xxx).
    // Only try to look up from DB if it's a valid MongoDB ObjectId.
    let chat = null;
    if (sessionId && isValidObjectId(sessionId)) {
      // Only allow access to own sessions
      chat = await Chat.findOne({
        _id: sessionId,
        userId: req.user._id
      });
      if (!chat) {
        // Session not found or belongs to another user - create new
        chat = null;
      }
    }

    if (!chat) {
      chat = new Chat({
        messages: [],
        userId: req.user._id
      });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    });
    await chat.save();

    // Log to Winston
    logger.logRequest(req);

    // SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    // Stream response - streamChatCompletion accepts (messages, onChunk, model)
    let fullResponse = '';
    await streamChatCompletion(
      chat.messages,
      (chunk) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    );

    // Save AI response
    chat.messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
    });
    await chat.save();

    res.write(`data: ${JSON.stringify({ done: true, sessionId: chat._id })}\n\n`);
    res.end();

    logger.info('Chat request completed', {
      userId: req.user._id,
      sessionId: chat._id,
      messageLength: trimmed.length,
      responseLength: fullResponse.length
    });

  } catch (error) {
    console.log('\n=======================');
    console.log('CHAT API ERROR');
    console.log('=======================');
    console.log('Route: POST /api/chat');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User:', req.user?.email || 'Unknown');
    console.log('Error Message:', error?.message || 'Unknown error');
    console.log('Error Name:', error?.name || 'N/A');
    console.log('=======================\n');

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

    // Classify OpenAI/Groq unavailability
    if (error.message === 'LLM API key is required but not configured' ||
        error.message === 'OpenAI unavailable') {
      return res.status(503).json({
        error: 'AI service temporarily unavailable',
      });
    }

    // API error formats
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

    // Fallback internal error
    res.status(500).json({
      error: 'Failed to process chat request',
    });
  }
});

// GET /api/chat/history - Get chat history
// PROTECTED ROUTE - Requires authentication
router.get('/history', protect, async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    // Only allow access to own sessions
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
// PROTECTED ROUTE - Requires authentication
router.get('/sessions', protect, async (req, res) => {
  try {
    // Only show user's own sessions
    const sessions = await Chat.find({ userId: req.user._id })
      .select('_id messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(
      sessions.map((session) => ({
        sessionId: session._id,
        messageCount: session.messages.length,
        lastMessage: session.messages[session.messages.length - 1]?.content || '',
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
// PROTECTED ROUTE - Requires authentication
router.post('/complete', protect, async (req, res) => {
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
    if (sessionId && isValidObjectId(sessionId)) {
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

    chat.messages.push({
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    });
    await chat.save();

    // Get full response - createChatCompletion returns a completion object
    const completion = await createChatCompletion(chat.messages);
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
// PROTECTED ROUTE - Requires authentication
router.delete('/history/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    // Only allow deletion of own sessions
    const result = await Chat.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!result) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    logger.logAuth('Chat session deleted', {
      userId: req.user._id,
      sessionId: id
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    logger.logApiError(error, {
      route: 'DELETE /api/chat/history/:id',
      userId: req.user?._id
    });
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/chat/clear - Clear all messages in session
// PROTECTED ROUTE - Requires authentication
router.post('/clear', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    // Only allow clearing own sessions
    const chat = await Chat.findOneAndUpdate(
      {
        _id: sessionId,
        userId: req.user._id
      },
      { messages: [] },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    res.json({ message: 'Session cleared successfully', sessionId: chat._id });
  } catch (error) {
    logger.logApiError(error, {
      route: 'POST /api/chat/clear',
      userId: req.user?._id
    });
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

export default router;
