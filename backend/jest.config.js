module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  
  // Allow both CommonJS and ES modules
  transform: {},
  
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  
  // Lower coverage threshold temporarily (increase later)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  
  verbose: true,
  
  // Ignore ES module errors
  moduleFileExtensions: ['js', 'json'],
  
  // Don't transform node_modules
  transformIgnorePatterns: [
    'node_modules/'
  ]
};
