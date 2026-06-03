# Runbook — AdminMate AI

## Deploy Staging

```bash
# Deploy to Vercel preview (staging URL)
vercel

# Verify the preview deployment
vercel ls
```

Staging deployments are auto-generated for every push to non-main branches when connected to Vercel Git integration.

## Deploy Production

```bash
# Build and deploy to production
vercel --prod

# Verify production deployment
vercel ls --prod
```

The production domain is configured in Vercel under **Settings → Domains**.

## Rollback

### Frontend (Vercel)

```bash
# Rollback to the previous production deployment
vercel rollback

# Or deploy a specific deployment by ID
vercel deploy --prod <deployment-id>
```

Vercel keeps the last 10 production deployments available for instant rollback.

### Backend (Supabase)

```bash
# Preview what db push will change
supabase db push --dry-run

# Rollback a specific migration (requires manual reverse migration)
supabase migration new rollback_<description>
# Write the reverse DDL, then push
supabase db push

# Edge Functions: deploy a previous version from Git history
git checkout <commit-hash> -- supabase/functions/<function-name>/
supabase functions deploy <function-name>
```

**Important**: Supabase does not automatically roll back migrations. If a migration has already been applied, you must create a new migration with the reverse DDL. Never manually revert applied migrations in `supabase_migrations.schema_migrations`.

## Rotate Secrets

### Google Gemini API Key

1. Generate a new key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Update the Supabase secret:
   ```bash
   supabase secrets set GEMINI_API_KEY=<new-key>
   ```
3. Verify the Edge Function works:
   ```bash
   curl -X POST "https://<project-ref>.supabase.co/functions/v1/generate-jd" \
     -H "Authorization: Bearer <anon-key>" \
     -H "Content-Type: application/json" \
     -d '{"role":"Software Engineer","industry":"Tech"}'
   ```
4. Delete the old key from Google AI Studio.

### Resend API Key

1. Generate a new key at [Resend → API Keys](https://resend.com/api-keys).
2. Update:
   ```bash
   supabase secrets set RESEND_API_KEY=<new-key>
   ```
3. Send a test email via the Edge Function.
4. Revoke the old key in Resend dashboard.

### LINE Channel Token

1. Rotate the token from LINE OA Manager → Settings → Messaging API → Channel Access Token (click "Reissue").
2. Update:
   ```bash
   supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=<new-token>
   supabase secrets set LINE_CHANNEL_SECRET=<new-secret>
   ```
3. Update the LINE OA webhook URL if needed.
4. Send a test message from the LINE OA.

### WhatsApp Token

1. Generate a new token from Meta Developers → WhatsApp → API Setup.
2. Update:
   ```bash
   supabase secrets set WHATSAPP_API_TOKEN=<new-token>
   supabase secrets set WHATSAPP_VERIFY_TOKEN=<new-token>
   ```
3. Re-verify the webhook callback URL in the Meta dashboard.

### CRON_SECRET_KEY

1. Generate a new random secret:
   ```bash
   openssl rand -hex 32
   ```
2. Update:
   ```bash
   supabase secrets set CRON_SECRET_KEY=<new-secret>
   ```
3. Update the cron job configuration in Supabase Dashboard to use the new secret in the Authorization header.

## Investigate Failed Edge Function

### Step 1: Check logs

```bash
# List recent function invocations
supabase functions logs --function <function-name>

# Or check in Supabase Dashboard → Edge Functions → Logs
```

### Step 2: Common failure modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` | Missing or expired JWT | Check token expiry in Auth settings |
| `403 Forbidden` | Invalid cron secret | Verify `CRON_SECRET_KEY` matches header |
| `429 Too Many Requests` | Rate limit hit or Gemini quota | Check `rate_limits` table and Google AI quota |
| `500 Internal Server Error` | Unhandled exception in function | Check function logs for stack trace |
| `timeout` | Long Gemini API call | Increase Edge Function timeout (max 400s) |
| `Failed to parse request body` | Malformed payload | Verify Content-Type header is `application/json` |

### Step 3: Test locally

```bash
supabase functions serve <function-name> --env-file .env.local

# Send a test request
curl -X POST "http://localhost:54321/functions/v1/<function-name>" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Step 4: Check database connection

If the function queries the database:
- Verify the Supabase project is not paused (inactive projects are paused after 1 week on free tier).
- Check that the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available in the function environment (injected automatically by Supabase).

## Investigate Gemini Quota Issue

### Check usage

1. Go to [Google AI Studio → API Keys](https://aistudio.google.com/apikey).
2. Check the quota dashboard for your project.
3. For more detail, query the `ai_usage_log` table:
   ```sql
   SELECT
     DATE_TRUNC('day', created_at) AS day,
     COUNT(*) AS requests,
     SUM(tokens_used) AS total_tokens
   FROM ai_usage_log
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY day
   ORDER BY day DESC;
   ```

### Common causes

| Issue | Resolution |
|-------|------------|
| **1,500 RPM limit exceeded** | Add client-side debouncing to AI-generation buttons. Add server-side rate limiting in Edge Functions. |
| **Free tier daily limit reached** | Upgrade to Gemini pay-as-you-go via Google Cloud Console. |
| **Large resume files** | Pre-process PDFs to extract text before sending to Gemini. Set a file size limit (5 MB) in the upload component. |
| **Concurrent requests spike** | Implement a request queue — only allow one AI generation per company at a time. |

### Escalate to Google

If quotas are insufficient:
1. Go to Google Cloud Console → APIs & Services → Quotas.
2. Request a quota increase for `Generative Language API`.
3. Specify the use case (HR document processing for SEA SMEs).

## Backup Database

### Via Supabase Dashboard

1. Go to **Database → Backups**.
2. Click **Create Backup** (Pro/Team plan — automated daily backups included).
3. Download the backup as a `.dump` file.

### Via CLI (pg_dump)

```bash
supabase db dump --local --data-only > backup_$(date +%Y%m%d).sql

# Or connect directly to the remote DB
pg_dump "postgresql://postgres:<password>@<host>:5432/postgres" \
  --file=backup_$(date +%Y%m%d).dump \
  --format=custom \
  --no-owner
```

Find the connection string in Supabase Dashboard → **Project Settings → Database → Connection String**.

## Restore Database

### Via Supabase Dashboard

1. Go to **Database → Backups**.
2. Select a backup and click **Restore**.
3. Confirm the restore action. This will overwrite the current database.

### Via CLI

```bash
# Restore a pg_dump custom-format backup
pg_restore "postgresql://postgres:<password>@<host>:5432/postgres" \
  --clean \
  --if-exists \
  --no-owner \
  backup_20240601.dump

# Or restore SQL dump
psql "postgresql://postgres:<password>@<host>:5432/postgres" \
  -f backup_20240601.sql
```

### Via Local Migration Rebuild

```bash
# This rebuilds from migration files (no data, only schema)
supabase db reset
```

## Monitor

| Tool | What to Monitor | Alert Threshold |
|------|----------------|-----------------|
| **Sentry** | JS errors in production | Any new error in < 1 hour |
| **Supabase Dashboard** | DB CPU, storage, auth rate | CPU > 80%, storage > 90% |
| **Vercel Analytics** | Page load time, error rate | P95 > 3s, error rate > 1% |
| **`/health` endpoint** | Supabase connectivity, Gemini availability | Any failure |
| **Gemini quota** | Daily token usage | > 80% of daily quota |
| **Edge Function logs** | 5xx error rate | > 5% in sliding 1-hour window |

### Health Endpoint

The health check endpoint (`/health` page in the app) verifies:
1. Supabase REST API reachable
2. Auth service reachable
3. Gemini API reachable (via Edge Function health check)
4. Realtime WebSocket connected

If the health page reports issues, correlate with Sentry alerts and Edge Function logs.

## Incident Response

### Sev 1: App is down (users cannot login or access pages)

1. Check Vercel dashboard — is the deployment healthy?
2. Check Supabase dashboard — is the project active and online?
3. Roll back the last Vercel deployment if caused by a recent code change.
4. Notify users via LINE/WhatsApp broadcast if the outage exceeds 5 minutes.

### Sev 2: AI features non-functional (JD generation, resume parsing, chat)

1. Check `ai_usage_log` — is the Gemini quota exhausted?
2. Check Gemini API status: [Google Cloud Status Dashboard](https://status.cloud.google.com/).
3. Verify `GEMINI_API_KEY` is valid in Supabase secrets.
4. Degrade gracefully — the UI should show a "temporarily unavailable" banner.

### Sev 3: Email delivery failure

1. Check Resend dashboard for bounce/complaint logs.
2. Verify `RESEND_API_KEY` is set and the domain is verified.
3. Check the `send-email` Edge Function logs for errors.
4. Confirm SPF, DKIM, and DMARC records are intact.
