// Jest setup file
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.OPENAI_API_KEY = 'test-key-12345';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-minimum-64-chars-required';
process.env.MONGODB_URI = 'mongodb://localhost:27017/aion-test';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
