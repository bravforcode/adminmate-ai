# Release 32D — Provider Governance & Credential Lifecycle

**Gate:** L — Lifecycle Governance & Operational Maturity
**Date:** 2026-06-22
**Owner:** Platform & Integration Engineering
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Establish centralized governance over all third-party provider integrations — tracking credentials, rotation schedules, health status, cost, and contract lifecycle — eliminating the current pattern of ad-hoc provider management scattered across config files.

---

## Scope

### In Scope

1. **Provider registry** — Single source of truth for all external providers (email, SMS, payment, AI, e-signature, messaging, EOR, etc.).
2. **Credential lifecycle management** — Track credential expiry, automated rotation reminders, and grace periods before service degradation.
3. **Provider health dashboard** — Real-time status of each provider integration including last successful call, error rate, and latency.
4. **Cost tracking** — Log API call volumes per provider; surface cost anomalies.
5. **Contract management** — Track provider contracts, renewal dates, SLAs, and compliance status.
6. **Kill-switch inventory** — Centralized view of all provider kill-switches and their current state.
7. **Provider onboarding/offboarding workflow** — Structured process for adding new providers or decommissioning old ones.

### Out of Scope

- Provider adapter implementation (covered by Gate F / Release 26F series).
- Provider failure handling (covered by Gate F / Release 26F.13).
- SAML/SCIM configuration (covered by Gate F / Releases 26F.11–26F.12).

---

## Required Work Items

| # | Work Item | Priority | Evidence Target |
|---|-----------|----------|-----------------|
| 1 | Create `provider_registry` table (provider_id, provider_type, display_name, category, status, health_endpoint, config_ref) | P0 | Migration SQL |
| 2 | Create `provider_credentials` table (credential_id, provider_id, credential_type, expires_at, rotation_due_at, last_rotated_at, status) | P0 | Migration SQL |
| 3 | Create `provider_health_log` table (log_id, provider_id, status_code, latency_ms, error_message, checked_at) | P0 | Migration SQL |
| 4 | Create `provider_cost_log` table (cost_id, provider_id, company_id, api_calls, estimated_cost_usd, period_start, period_end) | P1 | Migration SQL |
| 5 | Create `provider_contracts` table (contract_id, provider_id, company_id, contract_ref, renewal_at, sla_terms, compliance_status) | P1 | Migration SQL |
| 6 | Build `providerGovernanceService.ts` — CRUD, health check, credential rotation reminders, cost aggregation | P0 | Unit tests |
| 7 | Build `ProviderGovernancePage.tsx` — Registry, health dashboard, credential status, cost charts | P0 | Component |
| 8 | Create `provider-health-check` Edge Function — periodic health probes | P1 | Edge function |
| 9 | Seed initial provider registry from existing integrations (Supabase, Stripe, email providers, LINE, etc.) | P0 | Seed script |
| 10 | Write unit tests for governance service | P0 | Test file |
| 11 | Write component tests for governance dashboard | P1 | Test file |
| 12 | Update docs: `phase-ledger.md`, `release-dependency-map.md` | P1 | Docs |

---

## Database Schema

```sql
-- Provider registry
CREATE TABLE provider_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN (
    'email', 'sms', 'payment', 'ai', 'esignature', 'messaging',
    'eor', 'calendar', 'storage', 'analytics', 'auth', 'other'
  )),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated', 'planned')),
  health_check_url TEXT,
  config_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, provider_name)
);

-- Credential tracking
CREATE TABLE provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_registry(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('api_key', 'oauth_token', 'service_account', 'webhook_secret', 'certificate')),
  expires_at TIMESTAMPTZ,
  rotation_due_at TIMESTAMPTZ,
  last_rotated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'rotated', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health check log
CREATE TABLE provider_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_registry(id) ON DELETE CASCADE,
  status_code INTEGER,
  latency_ms INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost tracking
CREATE TABLE provider_cost_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_registry(id) ON DELETE CASCADE,
  api_calls INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4) DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract management
CREATE TABLE provider_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_registry(id) ON DELETE CASCADE,
  contract_reference TEXT,
  renewal_at TIMESTAMPTZ,
  sla_uptime_percent NUMERIC(5,2),
  compliance_status TEXT DEFAULT 'unknown' CHECK (compliance_status IN ('compliant', 'non_compliant', 'unknown', 'pending_review')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
ALTER TABLE provider_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_registry" ON provider_registry
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_credentials" ON provider_credentials
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE provider_health_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_health" ON provider_health_log
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE provider_cost_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_cost" ON provider_cost_log
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE provider_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_contracts" ON provider_contracts
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);
```

---

## Provider Inventory (Seed Data)

| Provider | Type | Category | Notes |
|----------|------|----------|-------|
| Supabase Auth | auth | Core | Tenant authentication |
| Supabase Storage | storage | Core | File storage |
| Stripe | payment | Billing | Subscription & invoicing |
| Resend | email | Messaging | Transactional email |
| LINE Messaging API | messaging | Messaging | LINE integration |
| WhatsApp Business | messaging | Messaging | WhatsApp integration |
| Twilio | sms | Messaging | SMS delivery |
| Google Calendar | calendar | Integration | Calendar sync |
| OpenAI | ai | AI | GPT-based features |
| Google Gemini | ai | AI | Alternative AI provider |
| DocuSign | esignature | Documents | E-signature (planned) |
| Deel | eor | HR | Employer of Record |

---

## UI: Provider Governance Dashboard

### Page Layout

| Section | Content |
|---------|---------|
| Provider Grid | Cards showing provider name, status badge, health indicator |
| Credential Status | Table: provider, credential type, expiry, days until rotation due |
| Health Timeline | Line chart per provider showing latency and error rate over 30 days |
| Cost Overview | Bar chart of estimated costs by provider, month-over-month |
| Contract Calendar | Upcoming renewals with SLA terms |
| Kill-Switch Panel | Toggle switches for each provider's kill-switch state |

---

## Tests

| Test | Type | Scope |
|------|------|-------|
| `providerGovernanceService.test.ts` | Unit | CRUD, health check, rotation reminders |
| `providerGovernancePage.test.tsx` | Component | Dashboard, cards, empty/error states |
| `credentialExpiry.test.ts` | Unit | Expiry detection, grace period logic |
| `costAggregation.test.ts` | Unit | Cost calculation, period boundaries |

---

## Non-Goals

- This release does **not** implement actual credential rotation (provider-specific, requires secrets).
- This release does **not** create new provider adapters.
- This release does **not** modify existing integration code.
- This release does **not** touch `.env` or deploy.

---

## Dependencies

- **Gate F** (Provider & Integration Verification) — Existing provider adapters and kill-switches
- **Gate D** (Observability) — Health check infrastructure
- **Release 32A** (Continuous Security) — Secret scan integration

---

## Sign-Off Requirements

| Role | Responsibility |
|------|----------------|
| Platform Lead | Approve provider registry structure |
| Security Lead | Approve credential lifecycle policies |
| Product Owner | Approve dashboard scope and cost tracking |

---

*Generated by OpenCode AI — Release 32D Provider Governance & Credential Lifecycle*
