import request from 'supertest';
import app from '../../server.js';
import mongoose from 'mongoose';

describe('Health Check Endpoints', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/ready');
      
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /status', () => {
    it('should return detailed status', async () => {
      const response = await request(app).get('/status');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('running');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('nodeVersion');
      expect(response.body).toHaveProperty('mongodb');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('AION v1 API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });
  });
});
