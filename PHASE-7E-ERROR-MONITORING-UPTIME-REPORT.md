# Phase 7E — Error Monitoring + Uptime Report

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE  
**TypeScript**: 0 errors  
**Build**: PASS  
**E2E**: 51/51 PASS

---

## Error Monitoring (Sentry)

### Status: ✅ READY (needs `VITE_SENTRY_DSN`)

The Sentry integration is already implemented and configured:

- **Library**: `@sentry/react` ^10.56.0 (installed)
- **Init**: `src/lib/sentry.ts` — lazy-loaded only when `VITE_SENTRY_DSN` is set
- **Error Boundary**: `src/components/common/ErrorBoundary.tsx` — catches React errors
- **Privacy**: PII redacted (email, username, IP, auth headers, cookies, query strings)
- **Traces**: 10% sample rate

### Setup Steps

1. Create Sentry account at https://sentry.io
2. Create new project: React
3. Copy DSN: `https://xxx@xxx.ingest.sentry.io/xxx`
4. Add to `.env`:
   ```
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
5. Deploy to Vercel with the env var

### What Sentry Captures

| Type | Source | Action |
|------|--------|--------|
| React errors | ErrorBoundary | Auto-capture |
| Unhandled exceptions | Global | Auto-capture |
| Unhandled rejections | Global | Auto-capture |
| Console errors | Sentry Console integration | Auto-capture |
| Performance traces | Navigation, HTTP, DB | 10% sample |

---

## Uptime Monitoring

### Status: ✅ READY (needs external service)

Created `supabase/health-check/index.ts` — checks:
- Database connectivity
- Stripe API (if configured)
- Gemini API (if configured)

Returns `{ status: "healthy"|"degraded", checks: {...} }`

### Recommended Services

| Service | Free Tier | Paid | Best For |
|---------|-----------|------|----------|
| Better Stack | 5 monitors | $24/mo | Uptime + incident management |
| UptimeRobot | 50 monitors | $7/mo | Simple uptime checks |
| Freshping | 50 checks | Free | Basic uptime |

### Setup Steps (Better Stack)

1. Create account at https://betterstack.com
2. Add monitor: `https://<project-ref>.supabase.co/functions/v1/health-check`
3. Set interval: 1 minute
4. Configure alerts: email, Slack, SMS
5. Optional: Status page at status.adminmate-ai.com

### Setup Steps (UptimeRobot — Free Alternative)

1. Create account at https://uptimerobot.com
2. Add monitor: HTTP(s), URL: `https://<project-ref>.supabase.co/functions/v1/health-check`
3. Set interval: 5 minutes
4. Configure alerts: email

---

## Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-06-18T19:49:00.000Z",
  "latencyMs": 142,
  "checks": {
    "database": { "status": "ok", "latencyMs": 89 },
    "stripe": { "status": "ok", "latencyMs": 32 },
    "gemini": { "status": "ok", "latencyMs": 21 }
  }
}
```

---

## Alerting Strategy

| Severity | Condition | Response Time |
|----------|-----------|:-------------:|
| Critical | Health check fails 3+ times | 15 minutes |
| High | Error rate > 5% | 1 hour |
| Medium | Response time > 2s | 4 hours |
| Low | Single error spike | Next business day |

---

## Environment Variables Required

| Variable | Purpose | Status |
|----------|---------|:------:|
| `VITE_SENTRY_DSN` | Error tracking | ❌ Needed |
| `STRIPE_SECRET_KEY` | Health check | ❌ Needed |
| `GEMINI_API_KEY` | Health check | ⚠️ Optional |

---

## Rollback

- Remove `VITE_SENTRY_DSN` → Sentry disabled (lazy-loaded, no-op)
- Health check function: can be deleted or disabled
- No database changes required
