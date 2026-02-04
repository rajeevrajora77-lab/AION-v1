import request from 'supertest';
import app from '../../server.js';
import mongoose from 'mongoose';

describe('Chat API Endpoints', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/chat', () => {
    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '' });
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({});
      
      expect(response.status).toBe(400);
    });

    it('should accept valid chat message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Hello, AION',
          stream: false
        });
      
      expect(response.status).toBeLessThan(500);
    }, 10000);
  });

  describe('GET /api/chat/history', () => {
    it('should return chat history', async () => {
      const response = await request(app)
        .get('/api/chat/history');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body) || response.body.sessions).toBeTruthy();
    });
  });
});
