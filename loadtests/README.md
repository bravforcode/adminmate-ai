# Load Tests for AdminMate AI

Performance and load testing using [k6](https://k6.io/).

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Windows (Scoop)
scoop install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Available Tests

| Script | Description | VUs | Duration |
|--------|-------------|-----|----------|
| `k6-auth.js` | Login endpoint load test | 10-20 | ~80s |
| `k6-search.js` | Search endpoint load test | 15-30 | ~80s |
| `k6-dashboard.js` | Dashboard API load test | 10-25 | ~80s |

## Running Tests

### Local Development

```bash
# Run auth load test
k6 run loadtests/k6-auth.js

# Run search load test
k6 run loadtests/k6-search.js

# Run dashboard load test
k6 run loadtests/k6-dashboard.js
```

### Custom Configuration

Override the base URL and API URL via environment variables:

```bash
k6 run --env BASE_URL=https://adminmate-ai.vercel.app --env API_URL=https://ajqpxgnllroivhqwdfay.supabase.co loadtests/k6-auth.js
```

### With Authentication

Some tests require an auth token. Pass it via environment variable:

```bash
# First, get a token
TOKEN=$(curl -s -X POST https://ajqpxgnllroivhqwdfay.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | jq -r '.access_token')

# Run search test with token
k6 run --env AUTH_TOKEN=$TOKEN loadtests/k6-search.js
```

### Output Formats

```bash
# JSON output
k6 run --out json=results.json loadtests/k6-auth.js

# InfluxDB output (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 loadtests/k6-auth.js
```

## Thresholds

Each test defines performance thresholds:

- **Auth test**: 95% of logins under 2s, 90% success rate
- **Search test**: 95% of searches under 1.5s, 95% success rate
- **Dashboard test**: 95% of API calls under 2s, 90% success rate

If thresholds are not met, k6 exits with a non-zero status code.

## Baseline Performance

Record baseline metrics after initial load testing:

1. Run each test against the staging environment
2. Note the p95 response times and success rates
3. Add baselines to this README for regression detection

Example baseline format:
```
## Baseline (2024-02-01, Staging)
- Auth p95: 450ms, success: 99.2%
- Search p95: 320ms, success: 99.8%
- Dashboard p95: 780ms, success: 98.5%
```

## CI Integration

Add to GitHub Actions for automated performance testing:

```yaml
- name: Run load tests
  run: |
    k6 run loadtests/k6-auth.js
    k6 run loadtests/k6-search.js
    k6 run loadtests/k6-dashboard.js
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    API_URL: ${{ secrets.STAGING_SUPABASE_URL }}
```

## Troubleshooting

- **Connection refused**: Ensure the target server is running and accessible
- **Auth failures**: Verify AUTH_TOKEN is valid and not expired
- **High error rates**: Check server logs for rate limiting or resource exhaustion
- **Timeout errors**: Increase thresholds or check network latency
