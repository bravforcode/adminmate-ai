# 🔒 RLS & Migration Security Audit Report

**Project:** AdminMate AI  
**Audited:** 51 migration files + 2 policy files + seed.sql  
**Date:** 2026-06-12  
**Auditor:** Security Agent  

---

## Executive Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 5 | SECURITY DEFINER without search_path, plaintext tokens, NULL bypass, open RLS era |
| **HIGH** | 6 | Notification spam vector, unencrypted MFA backup codes, cv-uploads owner-only check, migration RLS gaps |
| **MEDIUM** | 8 | JWT claim trust, email-based RLS, missing security indexes, broken queue functions, public buckets |
| **LOW** | 3 | Salary exposure, trigger recursion edge case, dashboard DoS potential |

**Total Vulnerabilities:** 22  
**Remediation Priority:** P0 = Critical fix needed immediately; P1 = High within 1 sprint; P2 = Medium within 2 sprints  

---

## CRITICAL FINDINGS

### C-01: SECURITY DEFINER Functions Missing `search_path` (20+ functions)

**Severity:** CRITICAL  
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)  
**Vector:** PostgreSQL `search_path` hijacking  

Every SECURITY DEFINER function below runs with elevated privileges but does **not** set `search_path`. An attacker who can create objects (tables, functions) in any schema PostgreSQL searches before `public` can hijack these functions — the hijacked function runs with the owner's (usually `postgres`/`supabase_admin`) privileges.

#### Affected Functions & Files:

| # | Function | File | Line | Language |
|---|----------|------|------|----------|
| 1 | `get_user_company_id()` | `20240101000020_rls_functions.sql` | 4 | sql |
| 2 | `is_admin_or_hr()` | `20240101000020_rls_functions.sql` | 9 | sql |
| 3 | `is_company_admin()` | `20240101000020_rls_functions.sql` | 14 | sql |
| 4 | `handle_new_user()` | `20240101000023_triggers.sql` | 9 | plpgsql |
| 5 | `update_job_filled_count()` | `20240101000023_triggers.sql` | 47 | plpgsql |
| 6 | `get_pipeline_counts()` | `20240101000024_analytics_functions.sql` | 6 | sql |
| 7 | `get_applications_trend()` | `20240101000024_analytics_functions.sql` | 13 | sql |
| 8 | `get_avg_time_to_hire()` | `20240101000024_analytics_functions.sql` | 19 | sql |
| 9 | `anonymize_candidate_data()` | `20240101000026_anonymize_function.sql` | 9 | plpgsql |
| 10 | `audit_trigger_fn()` | `20240101000029_error_sanitization_audit.sql` | 16 | plpgsql |
| 11 | `get_gemini_usage_today()` | `20240101000029_error_sanitization_audit.sql` | 36 | sql |
| 12 | `health_check()` | `20240101000029_error_sanitization_audit.sql` | 47 | sql |
| 13 | `safe_user_company_id()` (v1) | `20240102000003_open_all_rls.sql` | 9 | sql |
| 14 | `safe_user_company_id()` (v2) | `20240102000004_hardened_rls.sql` | 14 | sql |
| 15 | `safe_user_role()` | `20240102000004_hardened_rls.sql` | 23 | sql |
| 16 | `log_activity()` | `20240102000006_activity_log.sql` | 75 | plpgsql |
| 17 | `get_dashboard_stats()` | `20240102000007_performance.sql` | 185 | sql |
| 18 | `get_recent_activity()` | `20240102000007_performance.sql` | 232 | sql |
| 19 | `get_candidates_with_applications()` | `20240102000007_performance.sql` | 289 | sql |
| 20 | `refresh_dashboard_stats()` | `20240102000007_performance.sql` | 296 | sql |
| 21 | `refresh_dashboard_stats_trigger()` | `20240102000009_auto_refresh_dashboard.sql` | 10 | plpgsql |

#### Correct Pattern (only 2 functions do this right):
```sql
-- 20240102000005_rate_limiting.sql:40,86 — THE ONLY CORRECT EXAMPLES
CREATE OR REPLACE FUNCTION check_rate_limit(...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public    -- ← THIS MUST BE ON EVERY SECURITY DEFINER FUNCTION
AS $$ ... $$;
```

**Remediation:** Append `SET search_path = public` to every SECURITY DEFINER function. For `LANGUAGE sql` functions, use the block syntax to support SET:
```sql
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() AND is_active = true
$$;
```

---

### C-02: Plaintext `access_token` in `chat_platform_connections`

**Severity:** CRITICAL  
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)  
**File:** `20240101000015_chat_platform_connections.sql`, Line 8

```sql
access_token TEXT,  -- ← API access tokens stored in plaintext!
```

LINE/WhatsApp access tokens are long-lived credentials. If the database is breached, attackers gain persistent access to these messaging platforms.

**Remediation:**  
1. Use Supabase Vault (`pgsodium`) for encrypted secrets:  
   `SELECT vault.create_secret('access_token_value', 'description');`  
2. If Vault is unavailable, use `pgcrypto` with `pgp_sym_encrypt()` and manage the key outside the database.  
3. Remove `access_token` from any client-facing views/APIs immediately.

---

### C-03: NULL Bypass in RLS — Profile-less Users See ALL Data

**Severity:** CRITICAL  
**CWE:** CWE-287 (Improper Authentication)  
**File:** `20240102000004_hardened_rls.sql`, Lines 28-131

**Vulnerability pattern (present in ~15 policies):**
```sql
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
--                                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
--                                              If user has no profile → NULL → TRUE → all rows!
```

Users authenticated via Supabase Auth but **without a `user_profiles` row** get `safe_user_company_id() = NULL`. The expression `(company_id = NULL OR NULL IS NULL)` evaluates to `(NULL OR TRUE)` = `TRUE` — all rows pass.

**Impact:** Cross-tenant data exposure. Any newly authenticated user (or one whose profile was deleted) sees every company's jobs, candidates, applications, offers, documents, interviews, onboarding data.

**Fixed by:** `20240104000001_fix_rls_null_bypass.sql` (removes the `IS NULL` bypass).  
**Action:** Verify the fix is deployed (20240104000001 ran after 20240102000004) and no gap existed in production.

---

### C-04: Open Season — All Tables `USING (true)` for Authenticated Users

**Severity:** CRITICAL  
**CWE:** CWE-287 (Improper Authentication) → CWE-200 (Information Exposure)  
**File:** `20240102000003_open_all_rls.sql`, Lines 15-82

**Every single table was opened:** `jobs`, `candidates`, `applications`, `documents`, `interviews`, `offers`, `onboarding_checklists`, `onboarding_tasks`, `cv_documents`, `chat_messages`, `notifications`.

```sql
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "jobs_write" ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
--                                                        ^^^^           ^^^^
```

**Impact:** ANY authenticated user (including attackers with stolen credentials or registrants from other companies) had full read/write access to ALL data across ALL tenants.

**Fixed by:** `20240102000004_hardened_rls.sql` (re-established company scoping).  
**Action:** Verify `20240102000003` never ran in production without `20240102000004` immediately following.

---

### C-05: MFA Backup Codes Unencrypted

**Severity:** CRITICAL  
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)  
**File:** `20240104000003_mfa_enrollment.sql`, Line 12

```sql
backup_codes JSONB,  -- ← MFA bypass keys in plaintext!
```

Backup codes allow persistent MFA bypass. If an attacker reads the database (via SQL injection, backup exposure, or compromised service_role), they can authenticate as any user regardless of MFA enrollment.

**Remediation:**  
1. Encrypt `backup_codes` with `pgp_sym_encrypt()` or Supabase Vault.  
2. Never return `backup_codes` in any API response after initial setup.  
3. Hash backup codes with bcrypt/scrypt at the application layer before storage.

---

## HIGH FINDINGS

### H-01: Notifications INSERT `WITH CHECK (true)` — Spam/Phishing Vector

**Severity:** HIGH  
**CWE:** CWE-287 (Improper Authentication)  
**File:** `20240101000021_rls_policies.sql`, Line 52

```sql
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
```

Any authenticated user can create notifications for **any** user_id. An attacker can:
- Phish users by sending fake notifications (`action_url` can point to malicious sites)
- Spam all users with thousands of notifications (denial of service)

**Fixed partially by:** `20240101000027_fix_missing_rls.sql` (line 29-31) adds `user_id IS NOT NULL AND company_id IS NOT NULL` but **does not restrict** `user_id = auth.uid()`.  
**Fully fixed by:** `20240104000001_fix_rls_null_bypass.sql` (line 61-62) adds `user_id = auth.uid()`.

**Action:** Verify the final fix is deployed.

---

### H-02: Storage `cv-uploads` UPDATE/DELETE Trusts `owner = auth.uid()` Only

**Severity:** HIGH  
**CWE:** CWE-287 (Improper Authentication)  
**File:** `20240104000007_storage_policies.sql`, Lines 20-34

```sql
CREATE POLICY "cv-uploads-update-owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cv-uploads' AND owner = auth.uid());
```

Issue: `owner` is set by the Supabase Storage API and **can be client-controlled** on upload. An attacker can:
1. Upload a file with `owner` set to another user's UUID
2. Then update or delete that user's files

**Missing:** Company ID validation. The INSERT policy checks `company_id` in the folder path, but UPDATE/DELETE policies skip it entirely.

**Remediation:** Add company_id check to UPDATE/DELETE policies:
```sql
CREATE POLICY "cv-uploads-update-company"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
    AND owner = auth.uid()
  );
```

---

### H-03: Applications RLS Uses Indirect Candidate Check (Not Direct company_id)

**Severity:** HIGH  
**CWE:** CWE-285 (Improper Authorization)  
**File:** `20240102000004_hardened_rls.sql`, Lines 46-59

```sql
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    -- ^^^ indirect through candidates table
  );
```

Applications table has its own `company_id` column, but the RLS policy traverses through `candidates` instead. This creates:
- **Subquery injection risk:** If `candidates.id` is ever manipulated or the subquery is expensive (DoS)
- **Data inconsistency:** An application with a `company_id` that doesn't match the candidate's company would be invisible
- **Performance:** Subquery evaluated per row

**Remediation:** Use direct `company_id` check (like jobs/docs/interviews):
```sql
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());
```

---

### H-04: New Table RLS Gaps During Migrations

**Severity:** HIGH  
**CWE:** CWE-862 (Missing Authorization)  
**Files:**
- `20240101000016_ai_usage_log.sql` — No RLS (fixed in 20240101000027)
- `20240101000017_rate_limits.sql` — No RLS (fixed in 20240101000027)
- `20240101000018_subscriptions.sql` — No RLS (fixed in 20240101000027)
- `20240103000001_unified_messages.sql` — Messages, threads, queue, sync log, health — all created with RLS but using `subquery` pattern instead of `safe_user_company_id()`

**Risk:** During the gap between table creation and RLS policy application, any authenticated user could read/modify these tables.

---

### H-05: Notification `link` Column — URL Injection Vector

**Severity:** HIGH  
**CWE:** CWE-601 (URL Redirection to Untrusted Site)  
**File:** `20240103000004_notifications.sql`, Line 12

```sql
link TEXT,  -- ← displayed/clicked by users with no URL validation
```

If the link column can be set via the notification INSERT policy (which was `WITH CHECK (true)` prior to fix), attackers can inject phishing URLs.

---

### H-06: `log_activity()` Function Marked `STABLE` But Performs INSERT

**Severity:** HIGH  
**CWE:** CWE-477 (Use of Obsolete Function)  
**File:** `20240102000006_activity_log.sql`, Line 42

```sql
LANGUAGE plpgsql
SECURITY DEFINER
STABLE          -- ← WRONG! This function performs INSERT, not STABLE
AS $$
  ...
  INSERT INTO activity_log (...)  -- ← mutation in a STABLE function!
  ...
$$;
```

A `STABLE` function promises it doesn't modify the database. PostgreSQL allows the INSERT but this is a contract violation. Parallel query planners may misbehave. Additionally, `SECURITY DEFINER` without `search_path` compounds the issue.

**Remediation:** Change to `VOLATILE` and add `SET search_path = public`.

---

## MEDIUM FINDINGS

### M-01: Document Signatures RLS Uses Email Match — Account Takeover Risk

**Severity:** MEDIUM  
**CWE:** CWE-285 (Improper Authorization)  
**File:** `20240104000005_document_signatures.sql`, Lines 27-29

```sql
CREATE POLICY "doc_sigs_read_company" ON document_signatures
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
```

If a user changes their email or if emails collide across companies, the signature data leaks. Also, the subquery `(SELECT email FROM auth.users WHERE id = auth.uid())` could be slow without proper indexing on `auth.users.email`.

---

### M-02: Storage JWT `company_id` Claim Trust

**Severity:** MEDIUM  
**CWE:** CWE-290 (Authentication Bypass by Spoofing)  
**File:** `20240104000007_storage_policies.sql`, Lines 9, 17

```sql
AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
```

Storage RLS extracts `company_id` from the JWT token. While JWTs are signed by Supabase, if the JWT secret is ever compromised, an attacker can forge claims and access any company's files. Additionally, if `company_id` is missing from the JWT claims (e.g., custom claims not configured), this returns `NULL`, matching no folders — effective denial of service.

---

### M-03: Missing Security-Relevant Indexes

**Severity:** MEDIUM  
**CWE:** CWE-779 (Logging Excessive Data) / Monitoring Blindness  
**Tables with missing indexes on security-relevant columns:**

| Table | Missing Index | Why Needed |
|-------|---------------|------------|
| `audit_logs` | `ip_address` | Incident investigation, IP-based threat hunting |
| `audit_logs` | `user_agent` | Bot detection, anomaly detection |
| `user_profiles` | `last_login_at` | Account inactivity detection, dormant account cleanup |
| `pdpa_consents` | `consent_given` | GDPR/PDPA audit queries |
| `data_deletion_requests` | `status` | Monitoring pending deletion requests |
| `user_rate_limits` | `action` alone | Per-action rate limit queries |
| `ai_usage_log` | `created_at` alone | Time-series AI cost analysis |

---

### M-04: Queue Processing Functions Have No SECURITY DEFINER and No GRANTs

**Severity:** MEDIUM  
**CWE:** CWE-862 (Missing Authorization)  
**File:** `20240103000002_queue_processor.sql`, Lines 2-86

Functions `process_message_queue`, `mark_queue_sent`, `mark_queue_failed`, `reset_stuck_messages`:
- Are NOT `SECURITY DEFINER`
- Have NO `GRANT EXECUTE` to any role
- Access `message_queue` which has RLS restricting to `service_role` only

The result: These functions **cannot be executed by any role** (authenticated users are blocked by RLS, service_role is not explicitly GRANTed). This breaks the entire message queue processing pipeline.

---

### M-05: Subquery RLS Instead of Function Call (Performance + Consistency)

**Severity:** MEDIUM  
**CWE:** CWE-710 (Improper Adherence to Coding Standards)  
**File:** `20240103000001_unified_messages.sql`, Lines 121-122

```sql
CREATE POLICY "messages_company_isolation" ON messages
    FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));
```

Instead of reusing `safe_user_company_id()`, this migration uses an inline subquery. This is:
1. **Slower** — subquery runs per row instead of being cached
2. **Inconsistent** — other tables use `safe_user_company_id()`, creating a different attack surface
3. **Different NULL behavior** — `auth.uid()` could return NULL for service_role calls, making the subquery return NULL and blocking access

---

### M-06: Public Buckets — company-logos & avatars

**Severity:** MEDIUM  
**CWE:** CWE-200 (Information Exposure)  
**File:** `20240104000007_storage_policies.sql`, Lines 37-40, 76-79

```sql
CREATE POLICY "company-logos-public-read"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'company-logos');
```

While intended for public display, if any sensitive file is accidentally placed in these buckets, it's world-readable. Recommended: add a file size/type constraint in the policy or implement a CDN-layer review.

---

### M-07: `companies` Table — `USING (true)` for SELECT

**Severity:** MEDIUM  
**CWE:** CWE-200 (Information Exposure)  
**File:** `20240102000008_fix_companies_read.sql`, Line 6

```sql
CREATE POLICY "companies_read" ON companies FOR SELECT TO authenticated USING (true);
```

Every authenticated user can see every company's name, tax_id, email, phone, address, industry, subscription tier. While `tax_id` may be considered PII under PDPA, this exposes company metadata cross-tenant.

**Note:** This was intentional per the comment (to avoid 403 on setup flow). But it creates a data leakage vector.

---

### M-08: `companies_insert` Policy Uses `auth.uid() IS NOT NULL` — Weak Check

**Severity:** MEDIUM  
**CWE:** CWE-287 (Improper Authentication)  
**File:** `20240102000008_fix_companies_read.sql`, Line 10

```sql
CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
```

Any authenticated user can create a company with **any** values for `tax_id`, `name`, `email`, etc. An attacker can:
- Create companies impersonating legitimate orgs
- Fill the database with junk rows (DoS)
- Set `subscription_tier = 'enterprise'` (no validation)

**Remediation:** Add constraints or a pre-insert trigger to validate company data.

---

## LOW FINDINGS

### L-01: Salary Information Stored in Plaintext

**Severity:** LOW  
**CWE:** CWE-200 (Information Exposure)  
**Files:** `20240101000004_jobs.sql:11-12`, `20240101000009_offers.sql:8`, `seed.sql`

```sql
salary_min NUMERIC(12,2),
salary_max NUMERIC(12,2),    -- jobs
salary_offered NUMERIC(12,2), -- offers
```

Salary data is considered sensitive under Thai PDPA. Consider application-level encryption for `offers.salary_offered`.

---

### L-02: Trigger Recursion — `update_updated_at()` Triggers on All Tables

**Severity:** LOW  
**CWE:** N/A  
**File:** `20240101000023_triggers.sql`, Lines 22-31

`update_updated_at()` sets `NEW.updated_at` in a `BEFORE UPDATE` trigger. While the function itself doesn't trigger further UPDATEs, if any AFTER UPDATE trigger on the same table performs an UPDATE, infinite recursion can occur.

---

### L-03: Dashboard Stats Refresh — Potential DoS Vector

**Severity:** LOW  
**CWE:** CWE-1050 (Excessive Platform Resource Consumption)  
**File:** `20240102000009_auto_refresh_dashboard.sql`, Lines 12-52

`REFRESH MATERIALIZED VIEW CONCURRENTLY` runs on **every write** to 7 tables. Under high write load, this can:
- Block concurrent refreshes
- Consume connection pool slots
- Degrade query performance

---

## ARCHITECTURAL FINDINGS

### A-01: RLS Policy Churn — Conflicting Policies Stacked Across Migrations

The RLS evolution went through 6 distinct phases:

| Phase | Migration | Policy State |
|-------|-----------|-------------|
| 1 | `20240101000021` | Company-scoped (`get_user_company_id()`) |
| 2 | `20240102000001-02` | Added self-read + company insert fixes |
| 3 | `20240102000003` | **ALL TABLES OPEN** `USING (true)` |
| 4 | `20240102000004` | Hardened company-scoped + **NULL BYPASS** |
| 5 | `20240102000008` | Companies `SELECT USING (true)` |
| 6 | `20240104000001` | Fix NULL bypass + tighten notifications |

**Risk:** If any migration was missed or applied out of order, the security posture is unpredictable. The `20240102000003` (open all) migration in particular is dangerous if not immediately followed by `20240102000004`.

**Remediation:** Create a consolidated `supabase/rls_review.sql` that defines all current RLS policies in one place, then drop all old policies to prevent stack conflicts.

---

### A-02: Hardcoded UUIDs in seed.sql

**File:** `supabase/seed.sql`, Lines 8-207

Every entity uses hardcoded UUIDs (e.g., `'11111111-1111-...'`). While acceptable for seed data:
- `testlogin99@gmail.com` and its UUID (`a07ac229-65da-488a-a2e5-0aeec1474510`) are hardcoded — an attacker could use these IDs for enumeration attacks
- Test user is `admin` role with full access

---

### A-03: `health_check()` Exposes Internal Database Information

**File:** `20240101000029_error_sanitization_audit.sql`, Lines 38-47

```sql
'db_size_mb', (SELECT ROUND(pg_database_size(current_database()) / 1048576.0, 2)),
'active_connections', (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active')
```

Exposes database size and active connection count to any caller. Useful for monitoring but aids reconnaissance. Function is `SECURITY DEFINER` without `search_path` (see C-01).

---

## COMPLIANCE MAPPING

| Regulation | Relevant Findings | Status |
|-----------|-------------------|--------|
| **PDPA (Thailand)** | C-02 (plaintext tokens), C-05 (backup codes), L-01 (salary), M-07 (company tax_id) | Partially compliant |
| **GDPR (EU)** | `pdpa_consents`, `data_deletion_requests`, `anonymize_candidate_data` exist | Structure compliant |
| **OWASP Top 10:2021** | A01 (C-04), A04 (C-01), A05 (C-02/C-05), A07 (H-01) | Multiple violations |
| **SOC2 (Security)** | H-03 (indirect authz), M-03 (missing audit indexes) | Gaps in access control |

---

## REMEDIATION ROADMAP

### Phase 1 — Immediate (P0 — deploy within hours)
1. Add `SET search_path = public` to all 20+ SECURITY DEFINER functions
2. Encrypt `chat_platform_connections.access_token` using Supabase Vault
3. Verify `20240104000001_fix_rls_null_bypass.sql` is deployed and active
4. Encrypt or hash `mfa_enrollments.backup_codes`

### Phase 2 — Short-term (P1 — deploy within 1 sprint)
1. Fix `cv-uploads` UPDATE/DELETE storage policies to check company_id
2. Add company_id direct check to applications RLS instead of candidate subquery
3. Fix `log_activity()` `STABLE` → `VOLATILE`
4. Add `GRANT EXECUTE` for queue processing functions (or make them SECURITY DEFINER)

### Phase 3 — Medium-term (P2 — deploy within 2 sprints)
1. Add security indexes from M-03
2. Add `created_at` index to `ai_usage_log`
3. Consolidate all RLS policies into a single idempotent migration
4. Add file type/size validation to public storage policies
5. Validate company data on INSERT

---

## Files Not Audited (Out of Scope)

- `supabase/seed-test-user.sql` (not provided)
- Application-level code (Edge Functions, client-side RLS enforcement)
- Supabase Auth configuration (MFA enforcement, session length)
- Network-level security (WAF, CDN, IP allowlisting)

---

## Appendix: RLS Policy Decision Tree

To determine if a given RLS policy is correct, use this decision tree:

```
Is the policy for a bucket?
├── YES → Is the bucket PUBLIC? → Ensure SELECT only, no write without auth
│                                  Ensure company_id in folder path
│                                  Ensure company_id checked in JWT
└── NO  → Does the table have company_id?
         ├── YES → POLICY: company_id = safe_user_company_id()
         │         WRITE: + safe_user_role() IN ('admin','hr')
         │         EXCEPTION: user-scoped tables (chat_messages, notifications)
         │           → user_id = auth.uid() for own data
         │           → admin/hr can read all in company
         └── NO  → App-specific policy (e.g., auth schema)
```

---

*End of Audit Report — 22 vulnerabilities found across 51 migration files.*
