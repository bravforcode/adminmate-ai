# AdminMate AI — Rollback Procedures

> Emergency and planned rollback procedures for all deployment layers.  
> **Last updated:** 2026-06-23  
> **Stack:** Vercel (frontend) + Supabase Cloud (backend)

---

## Rollback Decision Tree

```
Issue detected
     │
     ├── Frontend-only issue (UI broken, CSS wrong, JS error)?
     │      → Rollback Frontend (Section 1)
     │
     ├── Backend-only issue (API error, auth failure)?
     │      → Rollback Edge Functions (Section 2)
     │
     ├── Database issue (migration broke schema)?
     │      → Rollback Database (Section 3) ⚠️ HIGH RISK
     │
     ├── Secret/key issue (wrong API key)?
     │      → Fix Secrets (Section 4)
     │
     └── Total system failure?
            → Full Rollback (Section 5) ⚠️ NUCLEAR OPTION
```

---

## 1. Frontend Rollback (Vercel)

**Risk level:** LOW  
**Downtime:** Near-zero (instant swap)

### Option A: Instant Rollback to Previous Deploy

```bash
# Rollback to the last successful deployment
vercel rollback
```

Vercel keeps the last **10 production deployments**. This swaps traffic instantly.

### Option B: Rollback to Specific Deployment

```bash
# List recent deployments
vercel ls --prod

# Deploy a specific previous deployment to production
vercel deploy --prod <deployment-id>
```

### Option C: Git-Based Rollback

```bash
# Revert the problematic commit
git revert <commit-hash>

# Push to trigger a new deployment
git push origin main
```

### Verification

```bash
# Confirm the site loads
curl -s -o /dev/null -w "%{http_code}" https://adminmate.ai
# Expected: 200

# Check security headers are intact
curl -s -I https://adminmate.ai | grep "X-Frame-Options"
```

---

## 2. Edge Function Rollback (Supabase)

**Risk level:** MEDIUM  
**Downtime:** 1-3 minutes (cold start)

### Option A: Redeploy Previous Version

```bash
# If you have a local copy of the previous version:
git checkout <previous-tag> -- supabase/functions/
supabase functions deploy
git checkout main -- supabase/functions/
```

### Option B: Disable Specific Function

If a single function is causing issues, you can't "disable" it, but you can:

1. Deploy a stub function that returns 503:
```bash
# Create a temporary stub
cat > /tmp/stub.ts << 'EOF'
Deno.serve(() => new Response("Temporarily disabled", { status: 503 }))
EOF

# Deploy the stub to the problematic function
supabase functions deploy <function-name> --no-verify-jwt
```

2. Fix the real function, then redeploy.

### Option C: Revert Secrets

If the issue is a bad secret value:

```bash
# Revert to previous value
supabase secrets set GEMINI_API_KEY=<previous-value>

# Verify
supabase secrets list
```

### Verification

```bash
# Test the function
curl -s https://ajqpxgnlrpjhqsnoutpv.supabase.co/functions/v1/health-check | jq .
```

---

## 3. Database Rollback (Supabase PostgreSQL)

**Risk level:** HIGH  
**Downtime:** Variable (depends on migration complexity)  
**⚠️ DATA LOSS MAY OCCUR**

### Pre-Rollback: Always Backup First

```bash
# Create a backup before any database rollback
supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Option A: Forward Migration (Preferred)

**Never drop data if you can avoid it.** Write a new migration that undoes the change:

```bash
# Create a rollback migration
supabase migration new rollback_<description>
```

Example rollback migration:
```sql
-- rollback: undo the previous migration's changes
-- Restore the previous column default
ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'draft';

-- Remove a column that was added in error
-- ALTER TABLE jobs DROP COLUMN IF EXISTS new_column;

-- Restore a table that was dropped (from backup)
-- CREATE TABLE ... AS SELECT * FROM backup_table;
```

Then apply:
```bash
supabase db push
```

### Option B: Point-in-Time Recovery (Supabase Pro/Team)

If you have Supabase Pro or Team plan:

1. Go to Supabase Dashboard → Database → Backups
2. Select a backup timestamp before the problematic migration
3. Click "Restore to point in time"
4. Wait for restoration to complete

### Option C: Restore from Manual Dump

```bash
# Restore from a previously created dump
psql "postgresql://postgres:<password>@db.ajqpxgnlrpjhqsnoutpv.supabase.co:5432/postgres" \
  < backup_20260623_120000.sql
```

### Post-Rollback Verification

```bash
# Verify schema is correct
supabase db diff

# Verify RLS is still active
supabase test db

# Check migration status
supabase migration list
```

---

## 4. Secret / API Key Rollback

**Risk level:** LOW-MEDIUM  
**Downtime:** Near-zero (secret propagation is fast)

### Quick Fix

```bash
# Set the correct value
supabase secrets set <SECRET_NAME>=<correct-value>

# Verify no placeholder values remain
supabase secrets list
```

### Common Secret Issues

| Problem | Fix |
|---------|-----|
| Expired API key | Generate new key, set via `supabase secrets set` |
| Wrong Stripe key (test vs live) | Ensure `STRIPE_SECRET_KEY` starts with `sk_live_` for production |
| Webhook secret mismatch | Regenerate in Stripe/LINE/WhatsApp dashboard, update secret |
| Resend domain not verified | Verify DNS records (SPF, DKIM, DMARC) in Resend dashboard |

---

## 5. Full System Rollback (Nuclear Option)

**Risk level:** VERY HIGH  
**Downtime:** 10-30 minutes  
**Use only when:** Multiple systems are broken simultaneously

### Steps

1. **Backup current state:**
```bash
supabase db dump > pre_rollback_$(date +%Y%m%d_%H%M%S).sql
```

2. **Rollback frontend:**
```bash
vercel rollback
```

3. **Rollback database (restore from known-good backup):**
```bash
# Restore from the last known-good backup
psql "postgresql://..." < last_known_good.sql
```

4. **Rollback Edge Functions:**
```bash
git checkout <last-known-good-tag> -- supabase/functions/
supabase functions deploy
git checkout main -- supabase/functions/
```

5. **Verify everything:**
```bash
# Frontend
curl -s -o /dev/null -w "%{http_code}" https://adminmate.ai

# Backend
curl -s https://ajqpxgnlrpjhqsnoutpv.supabase.co/functions/v1/health-check

# Database
supabase test db
```

---

## Rollback Time Estimates

| Action | Time | Risk |
|--------|------|------|
| Frontend rollback (Vercel) | < 30 seconds | LOW |
| Single Edge Function redeploy | 1-3 minutes | LOW-MEDIUM |
| All Edge Functions redeploy | 3-5 minutes | MEDIUM |
| Forward migration rollback | 5-15 minutes | MEDIUM |
| Database restore from backup | 10-30 minutes | HIGH |
| Full system rollback | 15-45 minutes | VERY HIGH |

---

## Communication During Rollback

### Internal (Slack/Discord)
```
🚨 ROLLBACK IN PROGRESS
- Layer: [Frontend / Edge Functions / Database]
- Issue: [Brief description]
- ETA: [Estimated time]
- Status: [In progress / Complete]
```

### External (if customer-facing)
```
We're experiencing a temporary issue and have initiated a rollback.
Service will be restored within [X] minutes.
No data has been lost.
```

---

## Post-Rollback Actions

- [ ] Root cause identified
- [ ] Fix developed and tested locally
- [ ] Fix deployed with proper verification
- [ ] Incident report written
- [ ] Monitoring alert thresholds reviewed
- [ ] Rollback procedure updated if needed
