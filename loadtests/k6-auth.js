import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const loginDuration = new Trend('login_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = __ENV.API_URL || 'http://localhost:5173';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Ramp up to 10 VUs
    { duration: '30s', target: 10 },  // Stay at 10 VUs
    { duration: '10s', target: 20 },  // Ramp up to 20 VUs
    { duration: '30s', target: 20 },  // Stay at 20 VUs
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    login_success_rate: ['rate>0.9'],    // 90% success rate
  },
};

export default function () {
  const email = `loadtest+${__VU}@example.com`;
  const password = 'LoadTest123!';

  // Login request
  const loginPayload = JSON.stringify({
    email: email,
    password: password,
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const startTime = Date.now();
  const loginRes = http.post(`${API_URL}/auth/v1/token?grant_type=password`, loginPayload, loginParams);
  const duration = Date.now() - startTime;

  loginDuration.add(duration);

  // Check response
  const success = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch {
        return false;
      }
    },
    'login response time < 2s': (r) => r.timings.duration < 2000,
  });

  loginSuccessRate.add(success);

  if (!success) {
    console.error(`Login failed for ${email}: status=${loginRes.status}`);
  }

  sleep(1);
}
