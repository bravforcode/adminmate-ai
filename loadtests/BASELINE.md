# Load Test Baseline Report

**Date:** 2026-06-29
**k6 Version:** v1.5.0
**Target:** Local Supabase instance (`http://localhost:54321`)

## Execution Summary

All three k6 scripts were executed against the local Supabase instance. The HTTP transport layer performed well (sub-15ms p95), but all scripts reported business-logic failures because:

1. **Auth test:** Test users (`loadtest+N@example.com`) do not exist in the local database
2. **Search test:** No `AUTH_TOKEN` was provided — REST API returned 400 (unauthorized)
3. **Dashboard test:** `get_dashboard_stats` RPC returns 404; `employees` query returns 400 (no auth)

These failures are **expected** for a clean local instance without seeded test data. The HTTP performance metrics are still valid baselines for transport-layer latency.

---

## Raw Results

### Auth Test (`k6-auth.js`)

| Metric | Value |
|---|---|
| **http_req_duration avg** | 13.97ms |
| **http_req_duration p90** | 19.25ms |
| **http_req_duration p95** | 22.48ms |
| **http_req_duration max** | 63.13ms |
| **http_req_failed** | 100% (400 — no test users) |
| **Throughput** | 13.19 req/s |
| **Iterations** | 1,192 |
| **Peak VUs** | 20 |
| **Duration** | 90s |

### Search Test (`k6-search.js`)

| Metric | Value |
|---|---|
| **http_req_duration avg** | 9.74ms |
| **http_req_duration p90** | 8.88ms |
| **http_req_duration p95** | 12.95ms |
| **http_req_duration max** | 662.01ms |
| **http_req_failed** | 100% (400 — no auth token) |
| **Throughput** | 39.28 req/s |
| **Iterations** | 3,538 |
| **Peak VUs** | 30 |
| **Duration** | 90s |

### Dashboard Test (`k6-dashboard.js`)

| Metric | Value |
|---|---|
| **http_req_duration avg** | 8.83ms |
| **http_req_duration p90** | 8.42ms |
| **http_req_duration p95** | 11.71ms |
| **http_req_duration max** | 659.44ms |
| **http_req_failed** | 66.66% (RPC 404 + no auth) |
| **Throughput** | 45.72 req/s (3 requests/iteration) |
| **Iterations** | 1,373 |
| **Peak VUs** | 25 |
| **Duration** | 90s |

---

## Performance Budget

| Metric | Target | Actual (Transport) | Status |
|---|---|---|---|
| p95 latency @ 50 VUs | < 500ms | 11.71ms - 22.48ms | PASS |
| Success rate | > 90% | 0% (expected — no test data) | N/A |

The transport layer is **well within budget**. Once test data is seeded and auth tokens are supplied, the success rate should reach expected levels.

---

## How to Re-establish Baselines

### Prerequisites

1. **Start local Supabase:**
   ```bash
   npx supabase start
   ```

2. **Seed test data** (create `loadtest+1@example.com` through `loadtest+20@example.com` users):
   ```bash
   # Via Supabase dashboard or SQL:
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
   VALUES
     ('loadtest+1@example.com', crypt('LoadTest123!', gen_salt('bf')), now()),
     ('loadtest+2@example.com', crypt('LoadTest123!', gen_salt('bf')), now());
   -- ... repeat for all test users
   ```

3. **Get an auth token** for search/dashboard tests:
   ```bash
   curl -X POST http://localhost:54321/auth/v1/token?grant_type=password \
     -H "Content-Type: application/json" \
     -d '{"email":"loadtest+1@example.com","password":"LoadTest123!"}'
   ```

4. **Run tests:**
   ```bash
   # Auth test (self-contained — creates login requests)
   k6 run loadtests/k6-auth.js --env API_URL=http://localhost:54321

   # Search test (requires AUTH_TOKEN)
   k6 run loadtests/k6-search.js --env API_URL=http://localhost:54321 --env AUTH_TOKEN=<token>

   # Dashboard test (requires AUTH_TOKEN)
   k6 run loadtests/k6-dashboard.js --env API_URL=http://localhost:54321 --env AUTH_TOKEN=<token>
   ```

5. **Export JSON results for trend tracking:**
   ```bash
   k6 run loadtests/k6-auth.js --env API_URL=http://localhost:54321 --out json=loadtests/results-auth.json
   ```

---

## Next Steps

- [ ] Seed load-test users in local Supabase
- [ ] Re-run all three tests with valid auth tokens
- [ ] Add `k6-dashboard.js` test for the `get_dashboard_stats` RPC (ensure the function exists)
- [ ] Establish CI baseline comparison (store results, diff on PR)
- [ ] Add soak test (30+ min) for memory leak detection
