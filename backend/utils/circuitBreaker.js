import logger from './logger.js';

export class CircuitBreaker {
  constructor(failureThreshold = 5, resetTime = 30000) {
    this.failureThreshold = failureThreshold;
    this.resetTime = resetTime;
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF
  }

  async exec(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTime) {
        logger.info('Circuit breaker transitioning to HALF state');
        this.state = 'HALF';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();

      logger.error('Circuit breaker recorded failure', {
        count: this.failures,
        threshold: this.failureThreshold,
        state: this.state,
        error: err.message,
      });

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker OPENED — LLM service suspended', {
          resetAt: new Date(Date.now() + this.resetTime).toISOString(),
        });
      }

      throw err;
    }
  }
}

export default CircuitBreaker;
