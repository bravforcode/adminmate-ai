# Phase 5F — Production Deployment Checklist

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE  

---

## Deployment Checklist

| Area | Check | Status | Owner | Blocker? |
|------|-------|--------|-------|----------|
| **Build** | TypeScript 0 errors | ✅ PASS | Dev | No |
| **Build** | Build clean (no errors) | ✅ PASS | Dev | No |
| **Build** | Lint 0 errors | ✅ PASS | Dev | No |
| **Build** | E2E tests pass | ✅ PASS (246+8) | Dev | No |
| **Build** | A11y tests pass | ✅ PASS (22/22) | Dev | No |
| **Build** | Mobile tests pass | ✅ PASS (50/50) | Dev | No |
| **Env Vars** | `VITE_SUPABASE_URL` | ⚠️ NEEDS VALUE | DevOps | Yes |
| **Env Vars** | `VITE_SUPABASE_ANON_KEY` | ⚠️ NEEDS VALUE | DevOps | Yes |
| **Env Vars** | `VITE_SENTRY_DSN` | ⚠️ OPTIONAL | DevOps | No |
| **Env Vars** | `VITE_APP_URL` | ⚠️ NEEDS VALUE | DevOps | Yes |
| **Supabase** | Project created | ⚠️ VERIFY | DevOps | Yes |
| **Supabase** | Database migrations applied | ⚠️ VERIFY | DevOps | Yes |
| **Supabase** | Edge functions deployed | ⚠️ VERIFY | DevOps | Yes |
| **Supabase** | Storage buckets configured | ⚠️ VERIFY | DevOps | Yes |
| **Supabase** | RLS policies enabled | ⚠️ VERIFY | DevOps | Yes |
| **Domain** | Domain configured | ⚠️ NEEDS VALUE | DevOps | Yes |
| **Domain** | SSL certificate active | ⚠️ VERIFY | DevOps | Yes |
| **Domain** | DNS records set | ⚠️ VERIFY | DevOps | Yes |
| **Monitoring** | Error tracking (Sentry) | ⚠️ OPTIONAL | DevOps | No |
| **Monitoring** | Uptime monitoring | ⚠️ NEEDS SETUP | DevOps | No |
| **Monitoring** | Log aggregation | ⚠️ DEFAULT | DevOps | No |
| **Backup** | Database backups enabled | ⚠️ VERIFY | DevOps | Yes |
| **Backup** | Restore procedure documented | ⚠️ NEEDS DOC | DevOps | No |
| **Rollback** | Rollback plan defined | ⚠️ NEEDS DOC | DevOps | No |
| **Privacy** | Privacy Policy page live | ⚠️ DRAFT READY | Legal | Yes |
| **Privacy** | Terms of Service page live | ⚠️ DRAFT READY | Legal | Yes |
| **Privacy** | Cookie notice live | ⚠️ DRAFT READY | Legal | No |
| **Analytics** | Analytics consent strategy | ⚠️ NO-OP NOW | PM | No |
| **Email** | Email sending configured | ⚠️ VERIFY | DevOps | Yes |
| **Support** | Support contact visible | ⚠️ NEEDS VALUE | PM | No |
| **Security** | Security headers configured | ⚠️ DEFAULT | DevOps | No |
| **Security** | CSP headers | ⚠️ DEFAULT | DevOps | No |
| **Security** | Rate limiting | ✅ EDGE FUNCTIONS | Dev | No |
| **Legal** | Landing page live | ✅ PASS | Dev | No |
| **Legal** | Pricing page | ⚠️ NOT BUILT | PM | Yes |
| **Legal** | Legal pages linked | ⚠️ DRAFT | Legal | Yes |

---

## Environment Variables Inventory (No Values)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_SENTRY_DSN` | No | Sentry DSN for error tracking |
| `VITE_APP_URL` | Yes | Production URL (e.g., https://adminmate-ai.vercel.app) |

**Note**: Do NOT print or commit actual values. Set via Vercel dashboard or CLI.

---

## Build & Test Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build |
| `npx tsc --noEmit` | TypeScript check |
| `npx eslint src/ --max-warnings=100` | Lint check |
| `npx playwright test` | E2E tests |
| `npx playwright test e2e/a11y.spec.ts` | A11y tests |

---

## Blockers Summary

| Blocker | Severity | Owner | Fix |
|---------|----------|-------|-----|
| Supabase project + env vars | P0 | DevOps | Configure and set env vars |
| Domain + SSL | P0 | DevOps | Configure domain |
| Privacy Policy page | P1 | Legal | Review and publish draft |
| Terms of Service page | P1 | Legal | Review and publish draft |
| Pricing page | P1 | PM | Build after pricing decision |
| Email sending | P2 | DevOps | Configure Supabase email or third-party |
