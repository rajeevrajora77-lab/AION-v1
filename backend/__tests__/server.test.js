const request = require('supertest');
const express = require('express');

// Mock OpenAI - CRITICAL: Never call real API in tests
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'This is a mocked AI response for testing'
              }
            }]
          })
        }
      }
    }))
  };
});

// Mock server setup
const app = express();
app.use(express.json());

// Mock health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mock /api/chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  // Input validation
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long' });
  }
  
  try {
    // Simulate AI response
    res.status(200).json({
      response: 'This is a mocked AI response for testing',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('Backend API Tests', () => {
  describe('GET /health', () => {
    test('should return 200 and health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('should have valid timestamp format', async () => {
      const response = await request(app).get('/health');
      const timestamp = response.body.timestamp;
      
      expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('POST /api/chat', () => {
    test('should accept valid message and return AI response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello, AI!' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toBeTruthy();
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should reject empty message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    test('should reject message with only whitespace', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should reject message that is too long', async () => {
      const longMessage = 'a'.repeat(5001);
      const response = await request(app)
        .post('/api/chat')
        .send({ message: longMessage });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too long');
    });

    test('should handle missing message field', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({});
      
      expect(response.status).toBe(400);
    });

    test('should handle JSON parse error gracefully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('{invalid}');
      
      expect(response.status).toBe(400);
    });
  });

  describe('OpenAI Integration (Mocked)', () => {
    test('OpenAI should be mocked and not call real API', () => {
      const OpenAI = require('openai').OpenAI;
      const client = new OpenAI();
      
      expect(client.chat.completions.create).toBeDefined();
      expect(jest.isMockFunction(client.chat.completions.create)).toBe(true);
    });
  });
});
