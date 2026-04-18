import request from 'supertest';
import app from '../server.js';

describe('Health Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/ready')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /status', () => {
    it('should return detailed status', async () => {
      const response = await request(app)
        .get('/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('nodeVersion');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'AION v1 API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });
});
