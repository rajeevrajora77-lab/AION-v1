import express from 'express';
import Chat from '../models/Chat.js';
import { streamChatCompletion, createChatCompletion } from '../utils/openai.js';
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to validate MongoDB ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

// POST /api/chat - Stream AI response
router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Create/get session with proper validation
    let chat = null;
    if (sessionId) {
      // Validate sessionId is a proper MongoDB ObjectId
      if (!isValidObjectId(sessionId)) {
        console.warn(`Invalid sessionId format: ${sessionId}`);
        // Create new session instead of failing
        chat = new Chat({ messages: [] });
      } else {
        chat = await Chat.findById(sessionId);
      }
    }
    
    if (!chat) {
      chat = new Chat({ messages: [] });
    }
    
    // Add user message
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    await chat.save();
    
    // SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx/CDN buffering
    
    // Stream response from OpenAI
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
    
  } catch (error) {
    // Safe, structured logging
    console.error('Chat streaming error:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      type: error?.type,
      status: error?.status,
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

    // Classify OpenAI unavailability
    if (error.message === 'OpenAI unavailable') {
      return res.status(503).json({
        error: 'AI service temporarily unavailable',
      });
    }

    // OpenAI API error formats
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
router.get('/history', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    
    const chat = await Chat.findById(sessionId);
    if (!chat) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      sessionId: chat._id,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/chat/sessions - List all sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Chat.find()
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
    console.error('Sessions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/chat/complete - Non-streaming completion
router.post('/complete', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    let chat = null;
    if (sessionId && isValidObjectId(sessionId)) {
      chat = await Chat.findById(sessionId);
    }
    
    if (!chat) {
      chat = new Chat({ messages: [] });
    }
    
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    await chat.save();
    
    // Get full response
    const response = await createChatCompletion(chat.messages);
    
    chat.messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
    });
    await chat.save();
    
    res.json({
      sessionId: chat._id,
      response: response.content,
      messages: chat.messages,
    });
  } catch (error) {
    console.error('Completion error:', error);
    res.status(500).json({ error: 'Failed to generate completion' });
  }
});

// DELETE /api/chat/history/:id - Delete conversation
router.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    
    const result = await Chat.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/chat/clear - Clear all messages in session
router.post('/clear', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    
    const chat = await Chat.findByIdAndUpdate(
      sessionId,
      { messages: [] },
      { new: true }
    );
    
    if (!chat) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ message: 'Session cleared successfully', sessionId: chat._id });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

export default router;
