import request from 'supertest';
import app from '../../server.js';
import mongoose from 'mongoose';

describe('Search API Endpoints', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/search', () => {
    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: '' });
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({});
      
      expect(response.status).toBe(400);
    });

    it('should accept valid search query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'artificial intelligence' });
      
      expect(response.status).toBeLessThan(500);
    }, 10000);
  });
});
