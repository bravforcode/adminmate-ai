# Release 26B.8 — Architecture Decision Records (ADRs)

**Generated:** 2026-06-22
**Gate:** B
**Tenant Key:** `company_id`

---

## ADR-001: Tenant Isolation via `company_id` Column-Level Partitioning

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

AdminMate AI is a multi-tenant SaaS serving multiple companies. Each company's data must be fully isolated — no cross-tenant data leakage is acceptable.

### Decision

All tenant-scoped tables include a `company_id UUID REFERENCES companies(id)` column. Row-Level Security (RLS) policies enforce that authenticated users can only access rows matching their `company_id`, resolved via `get_user_company_id()` / `safe_user_company_id()` SQL functions.

### Consequences

- Every new table MUST include `company_id` with RLS policy
- `safe_user_company_id()` provides NULL-safe tenant resolution (returns NULL instead of throwing on missing profile)
- All 220 pgTAP tests verify tenant isolation
- Cross-tenant joins require explicit service-role access (Edge Functions only)

---

## ADR-002: Auth Architecture — Supabase Auth + Zustand Client State

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

Authentication must support email/password, Google OAuth, magic link, and MFA while maintaining session state across page reloads.

### Decision

- **Identity provider:** Supabase Auth (GoTrue) — handles all auth flows server-side
- **Client state:** Zustand `authStore` with `persist` middleware stores session + profile in localStorage
- **Session refresh:** Supabase `autoRefreshToken` handles token refresh transparently
- **Route protection:** `AuthGuard` component checks `isAuthenticated()`, `hasCompany()`, `requiredRoles`
- **MFA:** TOTP + backup codes via Edge Functions (`verify-mfa`, `auth-hook-mfa`)

### Consequences

- No custom auth server required — Supabase manages JWT signing and session lifecycle
- Zustand persist ensures session survives page reload without re-fetching
- AuthGuard is client-side only — server-side enforcement requires RLS + Edge Function checks
- MFA enrollment state tracked in `mfa_enrollment` table

---

## ADR-003: RLS Helper Functions

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

RLS policies need to resolve the current user's `company_id` and role without duplicating logic across 40+ policies.

### Decision

Two hardened SQL functions serve as RLS helpers:

```sql
-- Primary: NULL-safe tenant resolution
CREATE OR REPLACE FUNCTION safe_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Role check for admin/HR bypass policies
CREATE OR REPLACE FUNCTION is_admin_or_hr()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('super_admin', 'company_admin', 'hr_manager')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Consequences

- All RLS policies reference these functions instead of inline queries
- `SECURITY DEFINER` + `search_path` hardening prevents injection
- Legacy `get_user_company_id()` retained for backward compatibility but new policies use `safe_user_company_id()`
- 220 pgTAP tests verify both functions under various JWT claim scenarios

---

## ADR-004: Data Residency

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

AdminMate AI serves companies in Thailand, Vietnam, Indonesia, and China. Each country may have data residency requirements (e.g., PDPA in Thailand).

### Decision

- **Database:** Single Supabase PostgreSQL instance (currently AWS `ap-southeast-1`)
- **Country configuration:** `countries` table stores locale, currency, timezone, data residency rules per country
- **Company binding:** Each `company.country` field determines applicable compliance rules
- **Storage:** Supabase Storage buckets — public buckets for company logos, private buckets for documents
- **No geo-partitioning:** All data in one database, filtered by `company_id` + country config

### Consequences

- Simple architecture — no multi-region complexity
- PDPA compliance enforced at application layer (consent_logs, data_deletion_requests)
- Future: If regulatory pressure requires geo-partitioning, add region column to companies and route queries accordingly
- Audit trail (`audit_logs`) tracks all data access for compliance reporting

---

## ADR-005: Async Jobs via Message Queue Pattern

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

Several operations are long-running (AI processing, email sending, document generation) and cannot complete within Edge Function timeout limits.

### Decision

The `message_queue` table implements an outbox pattern:

1. Edge Function writes job to `message_queue` with status `pending`
2. A processor function polls for `pending` jobs, processes them, updates status to `completed`/`failed`
3. Failed jobs get `retry_count` incremented and re-queued with exponential backoff
4. `platform_sync_log` tracks delivery status for messaging operations

```sql
-- message_queue schema
CREATE TABLE message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  job_type TEXT NOT NULL,       -- 'email', 'ai_processing', 'document_generation'
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
```

### Consequences

- Decouples request handling from processing
- Provides reliable delivery with retry semantics
- Audit trail of all async operations
- No external job queue dependency (e.g., no Bull/BullMQ)

---

## ADR-006: Document Storage via Supabase Storage

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

Companies upload documents (resumes, offer letters, policies, contracts) that need secure access control and tenant isolation.

### Decision

- **Provider:** Supabase Storage (S3-compatible)
- **Bucket strategy:**
  - `company-assets` (public) — logos, avatars
  - `company-documents` (private) — all business documents
  - `candidate-cvs` (private) — uploaded resumes
- **Path convention:** `/{company_id}/{category}/{filename}`
- **Access control:** Storage policies reference `company_id` from path, enforced via RLS-like storage rules
- **Metadata:** `documents` table tracks file metadata, signing status, and expiration

### Consequences

- File access always scoped to company via path convention
- Signed URLs for temporary access to private documents
- `document_signatures` table tracks e-signature workflow
- PDF generation via `@react-pdf/renderer` for offer letters, reports

---

## ADR-007: AI Service Boundaries

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

AI features (resume screening, job description generation, chat) use Google Gemini but must have clear boundaries to prevent cost overruns, data leakage, and unpredictable behavior.

### Decision

- **Provider:** Google Gemini AI (gemini-2.5-flash model)
- **Access pattern:** Edge Functions invoke Gemini via server-side API — client never calls AI directly
- **Usage tracking:** Every AI call logged to `ai_usage_log` with company_id, feature, token count, latency
- **Rate limiting:** `rate_limits` table enforces per-company AI call quotas
- **Data boundary:** AI prompts receive only the necessary context (resume text, job details) — never raw PII beyond what's needed
- **Sensitive field exclusion:** `sensitive_field_registry` defines fields excluded from AI prompts

### Consequences

- AI cost is predictable and trackable per tenant
- No AI-generated content stored without explicit user action
- `screen-resume`, `generate-jd`, `generate-offer-content` are separate Edge Functions with independent error handling
- AI errors return graceful fallbacks (e.g., "AI unavailable, please try again later")

---

## ADR-008: Payroll Country Packs

**Status:** Accepted (planned)
**Date:** 2026-06-22

### Context

Payroll calculation differs significantly by country (tax rates, social security contributions, labor law requirements). A one-size-fits-all payroll module is not feasible.

### Decision

Payroll is implemented as country-specific "packs":

| Pack | Country | Key Features |
|------|---------|-------------|
| 9A | Thailand | Social Security (SSO), PF, PIT, provident fund |
| 9B | Global | Base salary calculation framework |
| 9D | Statutory | Filing framework for government submissions |

Each pack:
- Is a separate module with its own database tables
- Shares the `company_id` tenant key
- Has country-specific tax rate tables seeded via migrations
- Provides a common interface: `calculatePayroll(companyId, period) → PayrollResult`

### Consequences

- New countries require new pack development, not global config changes
- Tax rate updates are applied via database migrations (not code changes)
- Payroll data is isolated at the `company_id` level
- Statutory filing (9D) handles government reporting format requirements

---

## ADR-009: Provider Adapters for Messaging

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

AdminMate AI integrates with WhatsApp (Cloud API), LINE (Messaging API), and potentially other platforms. Each has different APIs, authentication, and message formats.

### Decision

Each messaging platform has a dedicated Edge Function:

| Platform | Webhook | Send Function | Auth Method |
|----------|---------|---------------|-------------|
| WhatsApp | `whatsapp-webhook` | Facebook Graph API | Bearer token |
| LINE | `line-webhook` | LINE Messaging API | Channel access token |
| In-app | N/A | `messaging-hub` | Supabase Auth |

Common interface via `messages` table:
- Normalized message format regardless of platform
- `platform` column identifies source
- `external_message_id` for deduplication
- `conversation_threads` tracks cross-platform conversations

### Consequences

- Adding a new platform = new Edge Function + new column in `messages`
- Unified message history regardless of platform
- Platform-specific formatting handled at send time (templates, flex messages)
- Webhook signature verification enforced per platform

---

## ADR-010: Environment Promotion Strategy

**Status:** Accepted (implemented)
**Date:** 2026-06-21

### Context

Code must move from local development → staging → production with confidence.

### Decision

| Environment | Supabase Project | Vercel Branch | Data |
|-------------|-----------------|---------------|------|
| Local | `supabase start` (Docker) | `localhost:5173` | Seed data only |
| Staging | Separate Supabase project | Vercel preview deploys | Anonymized production subset |
| Production | Primary Supabase project | Vercel main branch | Real data |

Promotion gates:
1. **Local:** `npm run type-check` + `npm run lint` + `npm test -- --run` pass
2. **Staging:** All of local + `npm run build` succeeds + E2E tests pass on preview URL
3. **Production:** All of staging + manual approval + no open P0/P1 findings in release checklist

Database migrations:
- Applied via `supabase db push` (staging) or Supabase Dashboard (production)
- No `supabase db reset` in production
- Migration files versioned in `supabase/migrations/` — never force-push

### Consequences

- Production database is never automatically migrated
- Staging mirrors production schema for realistic testing
- Feature flags (`company_feature_flags`) control rollout of new features per company
- Rollback = disable feature flag or apply reverse migration

---

*Generated by OpenCode AI — Release 26B.8 Architecture Decision Records*
