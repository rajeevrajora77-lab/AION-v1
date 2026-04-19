import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import { streamChatCompletion } from '../utils/openai.js';
import { protect } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();

const MAX_MESSAGE_LENGTH = 10000;

// ============================================================================
// POST /api/chat — Stream AI response (ChatGPT-style)
//
// SESSION RULES:
//   1. If sessionId is null/missing → create NEW chat on first message
//   2. If sessionId is valid → continue existing chat
//   3. Title is set ONCE from first user message, NEVER changed after
//   4. NEVER create empty chats — only on first real message
// ============================================================================
router.post('/', protect, chatLimiter, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Input validation
    const trimmed = message?.trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
      });
    }

    // ---- SESSION LOGIC (CRITICAL) ----
    let chat = null;
    let isNewChat = false;

    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      // Continue existing chat — MUST belong to this user
      chat = await Chat.findOne({ _id: sessionId, userId: req.user._id });
    }

    if (!chat) {
      // Create new chat ONLY NOW (on first real message)
      isNewChat = true;
      chat = new Chat({
        messages: [],
        userId: req.user._id,
        // Title = first user message (truncated to 100 chars), set ONCE
        title: trimmed.substring(0, 100),
      });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    });
    await chat.save();

    logger.info('Chat request', {
      userId: req.user._id,
      sessionId: chat._id,
      isNewChat,
      messageLength: trimmed.length,
    });

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    // Detect client disconnect
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    // Prepare messages for LLM — only role + content
    const apiMessages = chat.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Stream LLM response
    let fullResponse = '';
    let streamStarted = false;

    await streamChatCompletion(apiMessages, (chunk) => {
      if (clientDisconnected) return;
      streamStarted = true;
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    });

    // Save assistant response
    chat.messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
    });
    await chat.save();

    // Send done signal with sessionId
    if (!clientDisconnected) {
      res.write(
        `data: ${JSON.stringify({ done: true, sessionId: chat._id })}\n\n`
      );
      res.end();
    }

    logger.info('Chat completed', {
      userId: req.user._id,
      sessionId: chat._id,
      responseLength: fullResponse.length,
    });
  } catch (error) {
    logger.error('Chat error', {
      error: error.message,
      userId: req.user?._id,
    });

    if (res.headersSent) {
      try {
        res.write(
          `data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`
        );
        res.end();
      } catch (_) {}
      return;
    }

    if (
      error.message?.includes('Circuit breaker') ||
      error.message?.includes('LLM API key')
    ) {
      return res.status(503).json({ error: 'AI service temporarily unavailable' });
    }

    res.status(500).json({
      error: 'Failed to process chat request',
      detail: error.message || 'Unknown error',
    });
  }
});

// ============================================================================
// GET /api/chat/sessions — List user's chat sessions
// Returns ONLY chats that exist in DB (no phantom/empty chats)
// ============================================================================
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await Chat.find({ userId: req.user._id })
      .select('_id title messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(
      sessions.map((s) => ({
        sessionId: s._id,
        title: s.title || 'New Chat',
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    );
  } catch (error) {
    logger.error('Sessions error', { error: error.message, userId: req.user?._id });
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ============================================================================
// GET /api/chat/history — Get messages for a specific session
// ============================================================================
router.get('/history', protect, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
    if (!mongoose.Types.ObjectId.isValid(sessionId))
      return res.status(400).json({ error: 'Invalid session ID format' });

    const chat = await Chat.findOne({ _id: sessionId, userId: req.user._id });
    if (!chat) return res.status(404).json({ error: 'Session not found' });

    res.json({
      sessionId: chat._id,
      title: chat.title || 'New Chat',
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    });
  } catch (error) {
    logger.error('History error', { error: error.message, userId: req.user?._id });
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ============================================================================
// DELETE /api/chat/:id — Delete a chat session
// ============================================================================
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'Invalid session ID format' });

    const chat = await Chat.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!chat) return res.status(404).json({ error: 'Session not found' });

    res.json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    logger.error('Delete error', { error: error.message, userId: req.user?._id });
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
