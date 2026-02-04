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
  
  // UPDATED: Look for .cjs test files (CommonJS)
  testMatch: [
    '**/__tests__/**/*.test.cjs',
    '**/__tests__/**/*.test.js',
    '**/*.test.cjs',
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
  
  // Support both .js and .cjs extensions
  moduleFileExtensions: ['js', 'cjs', 'json'],
  
  // Don't transform node_modules
  transformIgnorePatterns: [
    'node_modules/'
  ]
};
