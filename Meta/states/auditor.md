# Auditor State — Release 0

## Status: COMPLETE
## Last Updated: 2026-06-20

## Findings
- Repo is a mature Vite + React 19 + Supabase SPA (NOT Next.js)
- Already has 40+ existing pages, 23 services, 17 hooks, i18n (en/th/vi/zh/id)
- 44 migration files, RLS enabled, audit_logs, PDPA, MFA, subscriptions, Stripe
- 408 tests passing, 9 failing (pre-existing, not new)
- Build passes, typecheck passes, lint passes (warnings only)
- .env.local exists — NOT touched
- No `tailwind.config.*` — using Tailwind v4 with @tailwindcss/vite plugin (CSS-based config)

## Security Concerns
- notifications RLS has `WITH CHECK (true)` — any authenticated user can insert notifications for any company
- chat_messages RLS only checks `user_id = auth.uid()` — no company scoping
- No organization_id pattern — uses company_id (legacy naming)
- No legal_entity, no multi-entity support
- No role-based permission model beyond admin/hr/recruiter strings

## Release 1 Gap Analysis
- Need: organizations table (currently "companies" is the tenant root)
- Need: roles/permissions tables (currently role is a string column)
- Need: permission helper service
- Need: sensitive_field_registry
- Need: country_configs, currency_configs, timezone_configs, locale_configs
- Need: RTL-ready app shell (currently hardcoded LTR)
- Need: data_residency_regions
- Need: feature_flags
- Need: notifications RLS fix
