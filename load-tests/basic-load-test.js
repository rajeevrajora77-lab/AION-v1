import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Spike to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
    errors: ['rate<0.05'],              // Custom error rate under 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // Test health endpoint
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check has OK status': (r) => r.json('status') === 'OK',
  }) || errorRate.add(1);

  sleep(1);

  // Test status endpoint
  let statusRes = http.get(`${BASE_URL}/status`);
  check(statusRes, {
    'status check is 200': (r) => r.status === 200,
    'status has memory info': (r) => r.json('memory') !== undefined,
  }) || errorRate.add(1);

  sleep(1);

  // Test chat endpoint (non-streaming)
  let chatRes = http.post(
    `${BASE_URL}/api/chat`,
    JSON.stringify({
      message: 'Hello AION',
      stream: false,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  check(chatRes, {
    'chat endpoint responds': (r) => r.status < 500,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  return `
=== Load Test Summary ===
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.passes}
Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
========================
  `;
}
