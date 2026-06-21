# Release 26E.10 — Abuse & Resilience (Spam, Brute Force, Injection, Replay)

## Scope

Protection against automated abuse, injection attacks, brute force, replay attacks, and abuse patterns.

## Threat Matrix

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| Brute force login | HIGH | Rate limiting + account lockout | ✅ Verified |
| Credential stuffing | HIGH | Rate limiting + CAPTCHA | ✅ Verified |
| SQL injection | CRITICAL | Parameterized queries + Supabase RLS | ✅ Verified |
| XSS (stored/reflected) | HIGH | React auto-escaping + CSP headers | ✅ Verified |
| CSRF | MEDIUM | SameSite cookies + token | ✅ Verified |
| Session fixation | MEDIUM | Server-side session invalidation | ✅ Verified |
| Spam form submission | MEDIUM | Rate limiting + honeypot | ⬜ To verify |
| API abuse | HIGH | Rate limiting + API key rotation | ✅ Verified |
| File upload abuse | MEDIUM | Type validation + size limits + scan | ✅ Verified |
| Replay attack | MEDIUM | Nonce/timestamp validation | ⬜ To verify |
| DoS via large payload | MEDIUM | Request size limits | ✅ Verified |
| Open redirect | LOW | Whitelist redirect URLs | ✅ Verified |

## Rate Limiting

| Endpoint | Limit | Window | Action |
|----------|-------|--------|--------|
| `/auth/login` | 5 attempts | 15 min | Lock + notify |
| `/auth/signup` | 3 attempts | 1 hour | CAPTCHA required |
| `/api/*` | 100 requests | 1 min | 429 response |
| Document upload | 10 files | 5 min | Reject |
| Password reset | 3 attempts | 1 hour | Lock |
| Search | 30 requests | 1 min | 429 response |

## Injection Prevention

| Vector | Defense |
|--------|---------|
| SQL | Supabase client uses parameterized queries; raw SQL in migrations only |
| XSS | React JSX escaping; no `dangerouslySetInnerHTML` without DOMPurify |
| NoSQL | N/A (PostgreSQL only) |
| Command injection | No shell execution from user input |
| Path traversal | Supabase Storage policies enforce path scoping |

## Brute Force Protection

```
Attempt 1-4: Normal login flow
Attempt 5:   CAPTCHA required
Attempt 10:  Account locked 30 min
Attempt 20:  Account locked 24 hours + admin notified
```

## Replay Protection

- CSRF tokens on all state-changing requests
- Session tokens rotated on privilege escalation
- API requests include timestamp; reject if > 5 min old
- Idempotency keys for payment endpoints

## Security Headers

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Strict policy, no inline scripts |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-XSS-Protection` | `0` (rely on CSP) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

## Resilience Testing

```bash
# Brute force test
for i in {1..10}; do curl -X POST /auth/login -d '{"email":"test@test.com","password":"wrong"}'; done

# Rate limit test
for i in {1..110}; do curl /api/jobs; done

# Injection test
curl -X POST /api/search -d '{"q": "1; DROP TABLE users;--"}'
```

## Monitoring & Alerting

- Failed login spike → alert
- 429 rate spike → alert
- Unusual API pattern → flag for review
- File upload anomaly → quarantine + alert
