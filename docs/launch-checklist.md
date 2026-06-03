# Launch Checklist — AdminMate AI

## Pre-Launch

### Environment Configuration
- [ ] `.env.local` file configured from `.env.example` template
- [ ] `VITE_SUPABASE_URL` points to production Supabase project (not localhost)
- [ ] `VITE_SUPABASE_ANON_KEY` uses the **anon** key (never the `service_role` key)
- [ ] `VITE_APP_URL` set to production URL (e.g., `https://adminmate.ai`)
- [ ] `VITE_APP_NAME` set to `AdminMate AI`
- [ ] `VITE_ENABLE_LINE` and `VITE_ENABLE_WHATSAPP` feature flags reviewed
- [ ] `VITE_SENTRY_DSN` configured for production error tracking

### Database
- [ ] All 28 migrations applied to production Supabase (`supabase db push`)
- [ ] RLS enabled and verified on all 18 tables
- [ ] Performance indexes created (migration `00022`)
- [ ] Database triggers active (migration `00023`)
- [ ] Storage buckets created with RLS policies (migration `00025`)
- [ ] `supabase db push --dry-run` shows no pending changes

### Edge Functions
- [ ] All 10 Edge Functions deployed (`supabase functions deploy`)
- [ ] `GEMINI_API_KEY` set in Supabase secrets
- [ ] `RESEND_API_KEY` configured and domain verified
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_CHANNEL_SECRET` set (if LINE enabled)
- [ ] `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` set (if WhatsApp enabled)
- [ ] `CRON_SECRET_KEY` generated and set (cryptographically random, min 32 chars)

### Integrations
- [ ] LINE OA webhook URL configured in LINE OA Manager (`https://<project-ref>.supabase.co/functions/v1/line-webhook`)
- [ ] WhatsApp webhook URL configured and verified in Meta Developer Console
- [ ] Resend domain verified (SPF, DKIM records)
- [ ] Google OAuth consent screen approved and published
- [ ] Sentry project created and DSN configured

### Deployment
- [ ] Custom domain configured in Vercel (Settings → Domains)
- [ ] SSL certificate provisioned and active
- [ ] DNS records pointing to Vercel (CNAME or A records)
- [ ] `vercel.json` reviewed for redirect/rewrite rules
- [ ] Production build succeeds without errors (`npm run build`)

### Email
- [ ] SPF record published (`v=spf1 include:spf.resend.com ~all`)
- [ ] DKIM record published (provided by Resend)
- [ ] DMARC policy published (minimum `p=none` for monitoring)
- [ ] Transactional email templates reviewed for branding

## Staging Smoke Test

Run through every user journey on the staging deployment before promoting to production.

### Authentication
- [ ] Register new account (email + password)
- [ ] Verify email confirmation flow
- [ ] Sign in with Google OAuth
- [ ] Forgot password → reset email → set new password
- [ ] Login with new credentials
- [ ] Session persists across page reload
- [ ] Logout clears session

### Company Setup
- [ ] `/setup-company` redirects new users without company
- [ ] Company profile creation (name, country, currency, industry)
- [ ] Company data persists after creation

### Recruitment
- [ ] Create job → AI JD generation with Gemini
- [ ] Edit job details
- [ ] List jobs with search/filter
- [ ] Upload CV (PDF) → AI parsing extracts structured data
- [ ] AI resume screening returns match score + analysis
- [ ] View candidate detail page
- [ ] Move candidate between pipeline stages (Kanban drag-and-drop)
- [ ] Schedule interview with calendar picker
- [ ] Interview shows in list view

### Hiring
- [ ] Create offer letter for a candidate
- [ ] AI generates offer content via Gemini
- [ ] Preview offer letter in-app
- [ ] Export offer to PDF via @react-pdf/renderer
- [ ] PDF downloads correctly with proper formatting

### Documents
- [ ] Document list loads with status badges
- [ ] Change document status (Pending → Submitted → Verified → Completed)
- [ ] Status change reflects immediately

### Onboarding
- [ ] Onboarding checklist loads for employee
- [ ] Toggle task completion checkboxes
- [ ] Progress bar updates with completion percentage
- [ ] AI assistant responds to onboarding questions

### Chat (Mate AI)
- [ ] Chat interface loads conversation history
- [ ] Send message → receive AI response
- [ ] Realtime message delivery (no page reload needed)
- [ ] Chat scrolls to latest message automatically

### Chat Platforms
- [ ] LINE: Send test message → webhook receives → AI responds
- [ ] WhatsApp: Send test message → webhook receives → AI responds
- [ ] Platform connections visible in settings

### Reports
- [ ] Analytics page loads
- [ ] Charts render (Recharts)
- [ ] Filters change chart data

### Settings
- [ ] Company settings editable and saveable
- [ ] Account settings (email, password) editable
- [ ] Language switcher works (EN → TH → ID → VI)

### Compliance
- [ ] PDPA consent form accessible
- [ ] Data deletion request form submittable
- [ ] Compliance page loads without errors

### Error Handling
- [ ] 404 page shown for invalid routes
- [ ] Error boundary catches component crashes (graceful fallback, not white screen)
- [ ] Network error toasts shown when offline (react-hot-toast)

## Security Verification

### Access Control
- [ ] RLS policies verified — attempt to access another company's data as a different user (should return empty or 403)
- [ ] AuthGuard redirects unauthenticated users to `/login`
- [ ] AuthGuard redirects no-company users to `/setup-company`
- [ ] Protected routes not accessible via direct URL when logged out

### Client Bundle Audit
- [ ] `npm run build` completes successfully
- [ ] Search `dist/` for secrets: `rg -r "GEMINI_API_KEY|service_role|supabase_service_role" dist/` — must return 0 results
- [ ] No `LINE_CHANNEL_ACCESS_TOKEN` in client code
- [ ] No `RESEND_API_KEY` in client code

### Storage
- [ ] CV files uploaded to private bucket (not public)
- [ ] Signed URLs expire after 5 minutes
- [ ] Unauthenticated users cannot access signed URLs

### PDPA
- [ ] Consent checkbox functional on registration
- [ ] Consent record written to `pdpa_compliance` table
- [ ] Data deletion request workflow documented and testable
- [ ] Error messages sanitized — no raw PostgreSQL/Supabase errors returned

### API Security
- [ ] Edge Functions reject requests without valid JWT
- [ ] Cron functions reject requests without `CRON_SECRET_KEY`
- [ ] Rate limiting active on AI Edge Functions

## Soft Launch Criteria

- [ ] All unit tests pass (`npm run test -- --run`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] ESLint passes without errors (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No critical or high severity issues in audit
- [ ] Monitoring configured (Sentry + Supabase dashboard)
- [ ] Runbook completed and accessible to team
- [ ] Staging smoke test passed (all items above)
- [ ] Beta user group identified and onboarded
- [ ] Beta feedback collection channel set up (LINE/email)

## Go-Live (Production) Criteria

- [ ] Soft launch criteria all met
- [ ] Beta feedback addressed (blockers only — non-blocking items can be post-launch)
- [ ] E2E tests pass on staging environment
- [ ] Load test performed — at minimum 10 concurrent users without errors
- [ ] Gemini API quota monitoring active
- [ ] Supabase database backup schedule configured (daily, 7-day retention)
- [ ] Incident response plan documented and shared
- [ ] On-call rotation established (if multi-person team)
- [ ] Support email/LINE channel set up for user issues
- [ ] Rollback plan tested (Vercel rollback + Supabase migration revert)
- [ ] DNS TTL lowered to 5 minutes for launch window
- [ ] Launch announcement prepared for beta users

## Post-Launch (Week 1)

- [ ] Monitor Sentry for new errors daily
- [ ] Check Supabase CPU and storage utilization
- [ ] Review Gemini API usage vs quota daily
- [ ] Collect and triage user feedback
- [ ] Verify email deliverability (bounce/complaint rate < 1%)
- [ ] Check LINE/WhatsApp webhook health
- [ ] Run database health checks (`VACUUM ANALYZE` not needed on Supabase but monitor dead tuples)
- [ ] Increase DNS TTL back to 1 hour
