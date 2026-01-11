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
        console.log('Circuit breaker transitioning to HALF state');
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
      console.error(`Circuit breaker failure count: ${this.failures}`);
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.error('Circuit breaker opened after threshold reached');
      }
      throw err;
    }
  }
}

export default CircuitBreaker;
