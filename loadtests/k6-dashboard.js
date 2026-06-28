import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const dashboardSuccessRate = new Rate('dashboard_success_rate');
const dashboardDuration = new Trend('dashboard_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = __ENV.API_URL || 'http://localhost:5173';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Ramp up to 10 VUs
    { duration: '30s', target: 10 },  // Stay at 10 VUs
    { duration: '10s', target: 25 },  // Ramp up to 25 VUs
    { duration: '30s', target: 25 },  // Stay at 25 VUs
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    dashboard_success_rate: ['rate>0.9'],  // 90% success rate
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const params = { headers };

  // 1. Fetch dashboard stats
  const statsStart = Date.now();
  const statsRes = http.get(
    `${API_URL}/rest/v1/rpc/get_dashboard_stats`,
    { ...params, tags: { name: 'dashboard_stats' } }
  );
  const statsDuration = Date.now() - statsStart;

  const statsSuccess = check(statsRes, {
    'dashboard stats status is 200': (r) => r.status === 200 || r.status === 204,
    'dashboard stats response time < 2s': (r) => r.timings.duration < 2000,
  });

  // 2. Fetch recent activity
  const activityStart = Date.now();
  const activityRes = http.get(
    `${API_URL}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=10`,
    { ...params, tags: { name: 'dashboard_activity' } }
  );
  const activityDuration = Date.now() - activityStart;

  const activitySuccess = check(activityRes, {
    'activity status is 200': (r) => r.status === 200,
    'activity returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    'activity response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  // 3. Fetch employee summary
  const summaryStart = Date.now();
  const summaryRes = http.get(
    `${API_URL}/rest/v1/employees?select=id,first_name,last_name,department,position&limit=5&order=created_at.desc`,
    { ...params, tags: { name: 'dashboard_summary' } }
  );
  const summaryDuration = Date.now() - summaryStart;

  const summarySuccess = check(summaryRes, {
    'summary status is 200': (r) => r.status === 200,
    'summary response time < 1s': (r) => r.timings.duration < 1000,
  });

  // Track overall dashboard success
  const overallSuccess = statsSuccess && activitySuccess && summarySuccess;
  dashboardSuccessRate.add(overallSuccess);
  dashboardDuration.add(statsDuration + activityDuration + summaryDuration);

  if (!overallSuccess) {
    console.error(`Dashboard load failed: stats=${statsRes.status} activity=${activityRes.status} summary=${summaryRes.status}`);
  }

  sleep(1);
}
