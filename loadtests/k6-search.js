import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const searchSuccessRate = new Rate('search_success_rate');
const searchDuration = new Trend('search_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = __ENV.API_URL || 'http://localhost:5173';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const SEARCH_QUERIES = [
  'John',
  'Engineering',
  '2024-01',
  'Active',
  'Manager',
  'Bangkok',
  'Marketing',
  'Senior',
];

export const options = {
  stages: [
    { duration: '10s', target: 15 },  // Ramp up to 15 VUs
    { duration: '30s', target: 15 },  // Stay at 15 VUs
    { duration: '10s', target: 30 },  // Ramp up to 30 VUs
    { duration: '30s', target: 30 },  // Stay at 30 VUs
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],  // 95% of requests under 1.5s
    search_success_rate: ['rate>0.95'],  // 95% success rate
  },
};

export default function () {
  const query = SEARCH_QUERIES[__VU % SEARCH_QUERIES.length];

  const headers = {
    'Content-Type': 'application/json',
  };

  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  // Search employees
  const searchParams = {
    headers,
    tags: { name: 'search_employees' },
  };

  const startTime = Date.now();
  const searchRes = http.get(
    `${API_URL}/rest/v1/employees?or=(first_name.ilike.*${query}*,last_name.ilike.*${query}*,email.ilike.*${query}*)&select=id,first_name,last_name,email,department&limit=20`,
    searchParams
  );
  const duration = Date.now() - startTime;

  searchDuration.add(duration);

  // Check response
  const success = check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'search response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  searchSuccessRate.add(success);

  if (!success) {
    console.error(`Search failed for query="${query}": status=${searchRes.status}`);
  }

  sleep(0.5);
}
