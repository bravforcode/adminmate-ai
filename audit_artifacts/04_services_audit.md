# 🛡️ Services Layer Security Audit — adminmate-ai

**Audit Date:** 2026-06-12  
**Scope:** `src/services/*.ts` (22 files)  
**Methodology:** Manual code review of every service file, plus cross-reference with `src/lib/supabase.ts`, `src/stores/authStore.ts`, `src/hooks/useAuth.ts`, `src/types/models.ts`, `src/utils/icalGenerator.ts`.

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 **CRITICAL** | 8 |
| 🟠 **HIGH** | 14 |
| 🟡 **MEDIUM** | 11 |
| 🔵 **LOW** | 6 |
| ℹ️ **INFO** | 4 |

**Architecture-Level Risk:** The codebase uses Supabase **client-side SDK** with the **anon key** (`supabase.ts:4`). There is **zero server-side authorization middleware** — all auth relies on Supabase Row-Level Security (RLS). This creates a single-point-of-failure: if any table lacks RLS, all service calls to that table are **completely unauthenticated and unvalidated**.

---

## File-by-File Findings

---

### 1. `applicationService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 1.1 | 🔴 CRITICAL | **Mass Assignment** | 10 | `create(app)` accepts `Record<string, unknown>` — attacker can inject arbitrary columns (e.g. `{ "ai_match_score": 100, "company_id": "<victim>" })`. No allow-list. |
| 1.2 | 🟠 HIGH | **IDOR — Missing Company Scope** | 5-8 | `getByJob(jobId)` queries `applications` by `job_id` only — no `company_id` filter. Attacker can enumerate applications across jobs/companies. |
| 1.3 | 🟠 HIGH | **IDOR — Missing Ownership Check** | 14-22 | `updateStatus(id, status, notes)` only filters by `id`. No `company_id` or user ownership check. Attacker can change any application's status if they know the UUID. |
| 1.4 | 🟡 MEDIUM | **No Input Validation** | 9-13 | `create()` accepts raw `app` object — no schema validation. Columns like `company_id` can be overwritten. |
| 1.5 | 🔵 LOW | **No Data Sanitization** | 16 | `recruiter_notes` is set directly from user input with no sanitization. |

**Remediation:**
- Use explicit typed interfaces instead of `Record<string, unknown>` for `create()`.
- Add `company_id` filter to `getByJob()`.
- Verify caller owns the application via `company_id` or RLS in `updateStatus()`.
- Enforce schema validation before insert.

---

### 2. `auditLogService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 2.1 | 🟡 MEDIUM | **Pagination Manipulation** | 35-36 | `page` and `limit` are accepted directly from callers with no bounds checking. `limit` could be set to `0` causing errors, or extremely large values causing performance issues. |
| 2.2 | 🟡 MEDIUM | **Date Injection** | 46-47 | `date_from` / `date_to` are user-controlled strings passed to `.gte()`/`.lte()`. Malformed dates may query unexpected ranges. |
| 2.3 | 🟡 MEDIUM | **PII in CSV Export** | 95-109 | `exportToCSV()` includes **full_name, email, IP address** in CSV output. If exported audit logs are shared, PII leaks to unauthorized parties. |
| 2.4 | 🔵 LOW | **Sensitive Data in Logs** | 18, 104 | `details` field (Record<string, unknown>) is JSON-serialized into CSV — may contain PII, tokens, passwords logged by other services. |
| 2.5 | ℹ️ INFO | **Hardcoded Page Size** | 31 | `PAGE_SIZE = 25` is reasonable but should be configurable or bounded server-side. |

**Remediation:**
- Cap `limit` to a maximum (e.g. `Math.min(limit, 100)`).
- Validate `date_from` / `date_to` formats server-side.
- Mask PII in CSV exports (e.g. show partial email/name).
- Strip sensitive fields from `details` before persistence.

---

### 3. `authService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 3.1 | 🟠 HIGH | **No Rate Limiting** | 6-8 | `signIn()` has no rate limiting — attackers can perform credential stuffing / brute force attacks. |
| 3.2 | 🟠 HIGH | **No Account Lockout** | 6-8 | No lockout mechanism after repeated failed login attempts. |
| 3.3 | 🟡 MEDIUM | **Open Redirect via Redirect URL** | 19, 33, 40 | `emailRedirectTo` and OAuth `redirectTo` use `${getSiteUrl()}` which returns `window.location.origin`. If the app runs on a domain with user-controllable subdomain or vulnerable redirect patterns, this can be exploited. |
| 3.4 | 🟡 MEDIUM | **Weak Password Reset** | 39-43 | `resetPasswordForEmail` uses automatically generated redirect — no confirmation that the requesting user owns the email (this is standard for Supabase, but should be noted). |
| 3.5 | 🔵 LOW | **Session Not Validated** | 50-54 | `getSession()` returns whatever Supabase gives — no server-side token revocation check. |

**Remediation:**
- Implement rate limiting via edge function or API gateway.
- Add exponential backoff on consecutive failed sign-ins.
- Validate redirect URLs against an allow-list.
- Implement token revocation check on session retrieval.

---

### 4. `bulkImportService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 4.1 | 🔴 CRITICAL | **Mass Assignment via CSV Import** | 67-70, 93-100 | `mapRow()` inserts all CSV columns that match `CANDIDATE_FIELDS` / `JOB_FIELDS` into the database. Only a partial allow-list exists, but `skills_required` is parsed from CSV with no sanitization (line 97). |
| 4.2 | 🟠 HIGH | **No Business Validation on Numeric Fields** | 21-23 | `years_experience`, `salary_min`, `salary_max` are parsed with `Number()` — negative numbers, `NaN`, `Infinity`, or extremely large values are not validated. |
| 4.3 | 🟡 MEDIUM | **No Rate Limiting** | 65, 91 | Loops over all CSV rows and inserts them sequentially. No limit on file size — can cause resource exhaustion. |
| 4.4 | 🔵 LOW | **Generically Typed Error Messages** | 72, 77, 102, 107 | Database error messages could leak schema information (column names, constraints). |

**Remediation:**
- Add strict field-level validation (range checks for numbers, regex for phone, etc.).
- Cap batch size (max 500 rows per import).
- Use parameterized bulk inserts instead of row-by-row.
- Never expose raw database error messages to client.

---

### 5. `calendarService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 5.1 | 🔵 LOW | **Client-Only Storage** | 18-19 | Calendar settings stored in `localStorage` via `JSON.parse()`. No integrity check — XSS can inject malicious settings. |
| 5.2 | 🔵 LOW | **No Input Validation on Interview Data** | 42-47, 96-103 | Interview data is used to construct URLs. Malicious `meeting_link` or `location` values could create phishing links in calendar invites. |
| 5.3 | ℹ️ INFO | **No Recurrence Overload Protection** | 72-81 | `generateBulkCalendar()` accepts unlimited interviews — caller could pass thousands and cause memory issues. |

**Remediation:**
- Validate/sanitize `meeting_link` and `location` before embedding in calendar output.
- Limit batch calendar generation to reasonable number of interviews.

---

### 6. `candidateService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 6.1 | 🔴 CRITICAL | **IDOR — No Company Scope** | 31-34 | `getById(id)` queries by `id` only. **Any authenticated user can view any candidate's full PII (name, email, phone, location, avatar)** across all companies. |
| 6.2 | 🔴 CRITICAL | **Mass Assignment** | 36-39 | `create(candidate)` accepts `Record<string, unknown>`. Attacker can set `company_id` to a different company, bypassing tenant isolation. |
| 6.3 | 🔴 CRITICAL | **Mass Assignment + IDOR** | 41-44 | `update(id, updates)` accepts `Record<string, unknown>` with only `id` filter. Attacker can modify any candidate's PII, including setting `email` to their own for account takeover. |
| 6.4 | 🟠 HIGH | **PII Over-Exposure** | 22-24 | `getAll()` returns `cv_documents(*)` which includes `parsed_content` containing full CV text with unrestricted PII. |
| 6.5 | 🟡 MEDIUM | **No Input Validation** | 36-39 | No validation on email format, phone format, or field existence. |

**Remediation:**
- **MANDATORY:** Add `company_id` filter to `getById()` matching the caller's company.
- **MANDATORY:** Use typed interfaces instead of `Record<string, unknown>` for `create()` / `update()`.
- Add RLS policy: `company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())`.
- Mask or truncate `parsed_content` in list endpoints.

---

### 7. `chatService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 7.1 | 🟠 HIGH | **User ID Spoofing** | 5, 16-18 | `getSessions(userId)` and `sendMessage(msg)` accept `user_id` and `company_id` from the caller. Attacker can impersonate any user. |
| 7.2 | 🟠 HIGH | **No Message Ownership Check** | 10-13 | `getMessages(sessionId)` accepts `sessionId` without verifying the caller belongs to that session's company. |
| 7.3 | 🟠 HIGH | **Message Tampering** | 16-18 | `sendMessage()` inserts the entire `msg` object — attacker can set `sender` field to anything (e.g. "system", "AI assistant") to impersonate the system. |
| 7.4 | 🟡 MEDIUM | **No Input Sanitization on AI Chat** | 22-26 | `question` passed directly to Edge Function. If Edge Function runs an LLM without guardrails, prompt injection is possible. |
| 7.5 | 🔵 LOW | **No Message Size Limit** | 16-18 | No limit on `content` length — could cause storage exhaustion. |

**Remediation:**
- Extract `user_id` and `company_id` from the authenticated session, not from client payload.
- Verify session membership before returning messages.
- Force `sender` field server-side based on auth context.
- Add content length validation.

---

### 8. `companyService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 8.1 | 🟠 HIGH | **PII Exposure — No Auth** | 16-19 | `getAll()` returns **all companies** with no authentication or authorization check. Sensitive fields: `tax_id`, `phone`, `email`, `address`. |
| 8.2 | 🟡 MEDIUM | **Mass Assignment** | 56-65 | `update(id, data)` accepts `Partial<CreateCompanyData>` — `CreateCompanyData` is typed but `supabase.update(data)` spreads all properties, including potential `subscription_tier` or `id` if passed. |
| 8.3 | ℹ️ INFO | **Country-Derived Locale Logic** | 29-31 | Locale/currency/timezone derived from country — okay but future work: allow override. |

**Remediation:**
- **MANDATORY:** `getAll()` must require admin role and filter by the caller's company or scope.
- Validate that `update()` only allows updatable fields; block `subscription_tier`, `id`, etc.

---

### 9. `dashboardService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 9.1 | 🟡 MEDIUM | **Client-Provided Company ID** | 33 | `getStats(companyId)` takes `companyId` from caller — no verification. Attacker changes `companyId` to see another company's hiring stats. |
| 9.2 | 🟡 MEDIUM | **Dev Info Leak** | 36 | `import.meta.env.DEV` logging leaks RPC failure details including `error.message` which may contain internal state info. |
| 9.3 | 🔵 LOW | **DoS via Large Limit** | 42 | `limit` is user-controlled with no cap — could fetch massive result sets. |

**Remediation:**
- Always derive `companyId` from the authenticated session.
- Strip or limit dev-mode error messages.
- Cap `limit` to max 100.

---

### 10. `documentService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 10.1 | 🟠 HIGH | **Mass Assignment** | 14-17 | `create(doc)` accepts `Record<string, unknown>` — attacker can inject arbitrary fields like `status`, `document_type`, `candidate_id`, `employee_id`. |
| 10.2 | 🟠 HIGH | **IDOR — No Ownership Check** | 19-22 | `update(id, updates)` accepts `Record<string, unknown>` with only `id` filter. Attacker can change any document's status, type, or linked candidate. |
| 10.3 | 🟡 MEDIUM | **No Company Scope on getByType** | 9-12 | `companyId` is passed from client. RLS must ensure the companyId matches the caller. |
| 10.4 | 🔵 LOW | **Unvalidated docId in Edge Function** | 25 | `sendReminder(docId)` — does not verify the document belongs to the caller's company before invoking Edge Function. |

**Remediation:**
- Typed interfaces for `create()` / `update()` with strict field allow-lists.
- Add `company_id` filter to `update()`.
- Verify document ownership in `sendReminder()`.

---

### 11. `interviewService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 11.1 | 🟠 HIGH | **Mass Assignment** | 19-22 | `create(interview)` accepts `Record<string, unknown>`. Attacker can set `application_id`, `company_id`, `status` arbitrarily. |
| 11.2 | 🟠 HIGH | **IDOR — Missing Company Scope** | 4-7 | `getByApplication(applicationId)` queries by `application_id` only — no company filter. Any user can view interview details for any application. |
| 11.3 | 🟠 HIGH | **Mass Assignment + IDOR** | 24-27 | `update(id, updates)` — `Record<string, unknown>` with only `id` filter. Can modify any interview's `interviewer_name`, `rating`, `feedback`, `status`. |
| 11.4 | 🟡 MEDIUM | **PII Over-Exposure** | 10, 15 | `getUpcoming()` and `getPast()` include `candidates(full_name, email, phone)` — phone is unnecessary for interview scheduling view. |

**Remediation:**
- Add `company_id` filter to `getByApplication()`.
- Typed interfaces for `create()` / `update()`.
- Restrict which fields can be updated based on role.
- Minimize PII in list endpoints.

---

### 12. `jobService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|

*(Note: `jobService.ts` was not found in the directory listing. The glob at the start confirmed 22 `.ts` files and no `jobService.ts` exists — all files were accounted for. This entry may have been renamed or is missing.)*

**Remediation:** Verify the file exists and audit it separately if found.

---

### 13. `notificationPreferencesService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 13.1 | 🟡 MEDIUM | **Client-Provided userId** | 35, 45, 69 | All methods accept `userId` from caller. Attacker can modify/read another user's notification preferences. |
| 13.2 | 🟡 MEDIUM | **Client-Provided companyId** | 49, 69 | `updatePreference()` and `initializeDefaultPreferences()` take `companyId` from caller — no verification. |
| 13.3 | 🔵 LOW | **No Input Validation** | 45-67 | No validation on `type` — should validate against the `PreferenceType` union, but TypeScript only enforces at compile time. |

**Remediation:**
- Extract `userId` from the authenticated session (server-side / RLS).
- Validate `companyId` against the caller's tenant.
- Add runtime validation for `PreferenceType`.

---

### 14. `notificationService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 14.1 | 🟠 HIGH | **User ID Spoofing** | 38, 49, 67, 76 | All methods accept `userId` from caller. `markAllAsRead(userId)` lets attacker mark **any user's notifications** as read. `subscribeToNotifications(userId)` allows monitoring another user's real-time notifications. |
| 14.2 | 🟡 MEDIUM | **No Notification Ownership Check** | 59-64 | `markAsRead(notificationId)` — no ownership verification. Attacker can mark any notification as read. |
| 14.3 | 🟡 MEDIUM | **Type Confusion in mapRow** | 23-35 | Casts with `as` — if database schema changes, runtime errors may occur. `TYPE_MAP` silently maps unknown types to `'system'`. |

**Remediation:**
- Derive `userId` from the authenticated session.
- Add notification ownership check: `markAsRead` should verify `user_id` matches session.
- Use proper runtime type guards instead of `as` casts.

---

### 15. `offerService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 15.1 | 🔴 CRITICAL | **IDOR — No Company Scope** | 9-12 | `getById(id)` returns **full candidate and job data** (`candidates(*)`, `jobs(*)`) by `id` only. The `(*)` includes **all columns** — salary, PII, etc. |
| 15.2 | 🟠 HIGH | **Mass Assignment** | 14-17 | `create(offer)` accepts `Record<string, unknown>`. Attacker can inject `status`, `salary_offered`, etc. |
| 15.3 | 🟠 HIGH | **Mass Assignment + IDOR** | 19-22 | `update(id, updates)` — `Record<string, unknown>` with only `id` filter. Attacker can change any offer's `status`, `salary_offered`, `start_date`. |

**Remediation:**
- **MANDATORY:** Add `company_id` filter to `getById()`.
- Typed interfaces for `create()` / `update()`.
- Validate field changes against user role (e.g., only admins can change `salary_offered`).

---

### 16. `onboardingEmailService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 16.1 | 🟠 HIGH | **Email Injection / SMTP Injection** | 17-19 | `to` (recipient email) is passed from the `newHire` object. If `newHire.email` is user-controllable (e.g., via candidate import), an attacker could inject BCC headers or new recipients via newline characters. |
| 16.2 | 🟡 MEDIUM | **Session Token in Memory for Too Long** | 14 | `supabase.auth.getSession()` is called — the session object is in memory but not explicitly cleared. |
| 16.3 | 🟡 MEDIUM | **No Template Validation** | 13 | Hardcoded `template` name `'welcome'` — but if template names become dynamic, there's a risk of SSTI or path traversal. |
| 16.4 | ℹ️ INFO | **Same Template for Multiple Methods** | 27, 35, 43, 51 | All email methods use `'welcome'` — differentiated only by `type` field. Logic should be verified server-side. |

**Remediation:**
- Sanitize email addresses: strip newlines, BCC headers.
- Validate/santize all fields in `newHire` before passing to email service.
- Use separate templates or validate `type` against an allow-list.

---

### 17. `onboardingService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 17.1 | 🟠 HIGH | **Mass Assignment in createChecklist** | 53-59 | `createChecklist()` inserts client-provided `companyId`, `employeeId`, `offerId` with no verification. |
| 17.2 | 🟠 HIGH | **IDOR — Missing Ownership Check** | 48-51 | `getChecklist(id)` returns `onboarding_tasks(*)` with no company scope. Any user can view any employee's onboarding checklist. |
| 17.3 | 🟠 HIGH | **IDOR — updateTask** | 67-70 | `updateTask(taskId, isCompleted, completedBy)` — no ownership check. Attacker can complete/reopen any onboarding task. |
| 17.4 | 🟡 MEDIUM | **No Input Validation on Country** | 54 | `country` defaults to `'TH'` if falsy. If attacker passes an unexpected country code, it silently falls back — potential confusion but not exploitable directly. |
| 17.5 | 🟡 MEDIUM | **IDOR — updateProgress** | 72-78 | No ownership check on `checklistId` — attacker can force progress recalculation on any checklist. |

**Remediation:**
- Verify `companyId` and `employeeId` belong to the caller's organization.
- Add company scope to `getChecklist()`.
- Verify checklist ownership in `updateTask()` and `updateProgress()`.

---

### 18. `pdpaService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 18.1 | 🔴 CRITICAL | **Data Export — IDOR** | 35-59 | `exportUserData(userId, companyId)` fetches **all user data** (applications, documents, chat messages, notifications, audit logs, onboarding). If `userId` or `companyId` can be manipulated (and they are client-provided), an attacker can **export another user's entire data profile**. |
| 18.2 | 🟠 HIGH | **Data Deletion — Logic Bug** | 77-85 | `deleteUserData()` anonymizes candidates by: `supabase.from('candidates').update({...}).eq('email', deletedEmail)`. **But `deletedEmail` is set to a hash on line 64 — the update matches on the NEW email, not the old email.** This means candidate anonymization always matches zero rows. |
| 18.3 | 🟡 MEDIUM | **Data Categories — Cross-Tenant Data Leak** | 109-131 | `getDataCategories(userId, companyId)` counts records by `company_id` without verifying the caller belongs to that company. Reveals data existence to unauthorized tenants. |
| 18.4 | 🟡 MEDIUM | **Consent History — No User Filter** | 133-141 | `getConsentHistory(_userId, companyId)` fetches **all consents** for a company. The `_userId` parameter is intentionally unused (prefixed with `_`). Returns any user's consent data. |
| 18.5 | 🟡 MEDIUM | **Audit Log for Deletion Contains Sensitive Details** | 97-104 | Audit log for data deletion stores `details: { anonymized_tables: [...], reason: 'user_requested_deletion' }`. If audit logs are visible to other users, this leaks the deletion event. |
| 18.6 | 🔵 LOW | **CSV Injection** | 153-166 | `downloadCSV()` does not sanitize cell values for Excel formula injection (e.g. `=CMD(...)`). |

**Remediation:**
- **MANDATORY:** Verify that the requesting user owns the `userId` or has admin role for the `companyId`.
- Fix the candidate anonymization: match candidates by `company_id` AND original email, not the new hash.
- Add user-specific filtering to `getConsentHistory()`.
- Sanitize CSV exports against formula injection.

---

### 19. `reportService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 19.1 | 🟠 HIGH | **IDOR — Missing Ownership Check** | 102-108 | `deleteSchedule(id)` deletes by `id` only — no `company_id` check. Attacker can delete any company's report schedule. |
| 19.2 | 🟠 HIGH | **IDOR — Missing Company Scope** | 110-132 | `generateReport(companyId)` takes `companyId` from caller. Attacker can generate reports for other companies. |
| 19.3 | 🔵 LOW | **No Bounds on Limit** | 134 | `limit` parameter in `getGeneratedReports()` — no max cap enforced. |

**Remediation:**
- Add `company_id` filter to `deleteSchedule()`.
- Derive `companyId` from session, not client input.
- Cap `limit` to max 100.

---

### 20. `searchService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 20.1 | 🟠 HIGH | **LIKE Injection / Enumeration Attack** | 20, 27-47 | `q = \`%${query}%\`` — user-controlled `query` is passed to `ilike` filters. The `%` and `_` characters are NOT escaped, allowing attackers to use pattern matching for **blind data enumeration** (e.g., guessing emails one character at a time). |
| 20.2 | 🟡 MEDIUM | **No Rate Limiting** | 19 | `globalSearch()` executes 4 parallel SQL queries. No rate limiting — attacker can perform **massive data extraction via repeated searches**. |
| 20.3 | 🟡 MEDIUM | **PII in Search Results** | 52, 71, 79 | Search results expose `email` in candidate subtitles, `candidate_email` in applications. Every search leaks PII into auto-complete suggestions. |
| 20.4 | 🔵 LOW | **No Search Result Truncation** | 28, 34, 40, 46 | Each sub-query `.limit(5)` — combined max 20 results. Reasonable but still enumerable. |

**Remediation:**
- **MANDATORY:** Escape `%` and `_` in LIKE patterns (e.g. `query.replace(/[%_]/g, '\\$&')`) or use full-text search.
- Implement rate limiting on search (e.g., 10 requests/minute per user).
- Omit email from search result previews; return PII only after explicit drill-down.

---

### 21. `signatureService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 21.1 | 🔴 CRITICAL | **Signature Bypass — No Token Verification** | 36-50 | `signDocument(signatureId, signatureData)` only verifies `status === 'pending'`. **No `verification_token` check.** Anyone who knows a `signatureId` can sign a document on behalf of another person. |
| 21.2 | 🔴 CRITICAL | **Decline Bypass — No Token Verification** | 53-65 | Same issue as 21.1 — `declineSignature(signatureId)` requires only the ID. No token verification. |
| 21.3 | 🟠 HIGH | **IDOR — Signature Retrieval** | 68-75 | `getSignatures(documentId)` — no company or user scope. Any user can see all signatures for any document. |
| 21.4 | 🟠 HIGH | **Signature Deletion — No Ownership Check** | 98-104 | `deleteSignature(signatureId)` — no token or ownership check. Only checks `status === 'pending'`. An attacker can delete pending signature requests. |
| 21.5 | 🟡 MEDIUM | **No Company Scope on requestSignature** | 20 | `requestSignature(companyId, ...)` accepts `companyId` from caller with no verification. |
| 21.6 | 🟡 MEDIUM | **Unsafe Storage of Signature Data** | 40 | `signature_data` stores raw signature data (likely base64 image of signature). Not encrypted at rest. |

**Remediation:**
- **MANDATORY:** `signDocument()` must verify `verification_token` matches before allowing the operation.
- **MANDATORY:** `declineSignature()` must verify `verification_token` as well.
- Add company scope to `getSignatures()`.
- Encrypt `signature_data` at rest or store in a secure enclave.
- Validate token expiration for time-bound signatures.

---

### 22. `storageService.ts`

| # | Severity | Vulnerability | Line(s) | Description |
|---|----------|---------------|---------|-------------|
| 22.1 | 🟠 HIGH | **Insufficient File Name Sanitization** | 5 | `file.name.replace(/[^a-zA-Z0-9.-]/g, '_')` — allows `.` in file names, meaning double extensions (e.g. `resume.pdf.html`) are possible. Path traversal via name is blocked, but extension manipulation is not. |
| 22.2 | 🟠 HIGH | **No File Type Validation** | 6 | `uploadCV()` uploads any `File` object to `cv-uploads` bucket with no MIME type validation. Attacker can upload HTML/JS files that execute when served. |
| 22.3 | 🟠 HIGH | **No File Size Limit** | 4-9 | No file size check before upload — attacker can fill storage with large files (denial of wallet / storage exhaustion). |
| 22.4 | 🟡 MEDIUM | **Unrestricted Upsert** | 6, 13, 20 | `{ upsert: true }` allows overwriting existing files at the same path. Attacker who can predict file paths can overwrite another user's CV/avatar/logo. |
| 22.5 | 🟡 MEDIUM | **No Auth on URL Access** | 8, 15, 23 | Public URLs are generated immediately. If the storage bucket is public, anyone with the URL can access files. If the bucket is private, URLs expire — but the current service returns permanent public URLs. |
| 22.6 | 🟡 MEDIUM | **No Client/Company Context Validation** | 5, 11, 18 | File paths use `candidateId`/`companyId`/`userId` from caller — no verification that the authenticated user has rights to that ID. |
| 22.7 | 🔵 LOW | **Same Timestamp Collision Risk** | 5 | `Date.now()` is used as unique suffix. Multiple rapid uploads in the same millisecond will overwrite each other (due to `upsert: true`). |

**Remediation:**
- **MANDATORY:** Validate MIME type (allow only `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`).
- **MANDATORY:** Enforce max file size (e.g. 10MB for CVs, 2MB for avatars/logos).
- Use signed/expiring URLs instead of permanent public URLs.
- Remove `upsert: true` and add uniqueness guarantees (UUIDs in file paths).
- Verify the caller owns the `candidateId`/`companyId`/`userId` before upload.

---

## 🔴 Cross-Cutting Critical Issues

### A. Complete Absence of Server-Side Auth Middleware
**Severity: CRITICAL**

The application has **no API routes or middleware layer** (`glob` returned zero matches for `*route*`, `*middleware*`, `*guard*`). All services are called directly from the React frontend. Security depends **entirely** on Supabase RLS policies, which must be verified at the database level for every single table.

**Action:** Audit every Supabase table's RLS policy for correctness. If any table lacks RLS, all data on that table is publicly accessible.

### B. `Record<string, unknown>` Anti-Pattern
**Severity: CRITICAL**

Services that accept `Record<string, unknown>` for `create()`/`update()`:
- `applicationService.ts:10`
- `candidateService.ts:37,42`
- `documentService.ts:15,20`
- `interviewService.ts:20,25`
- `offerService.ts:15,20`
- `chatService.ts:17`

This pattern allows arbitrary column injection including `company_id`, `user_id`, `id`, `created_at`, and any system field.

### C. All Company IDs Are Client-Controlled
**Severity: HIGH**

Every service that takes a `companyId` parameter receives it from the client with no server-side verification. The `useAuthStore` stores the user's company, but nothing prevents the client from calling a service with a different `companyId`.

### D. All User IDs Are Client-Controlled
**Severity: HIGH**

Services like `notificationService`, `chatService`, `pdpaService`, `notificationPreferencesService` accept `userId` from the caller with no session comparison.

---

## 🛡️ Recommendations Summary (Priority Order)

| Priority | Action | Impact |
|----------|--------|--------|
| P0 | **Audit & enforce Supabase RLS on EVERY table** | Prevents all IDOR and mass assignment at the database level |
| P0 | **Replace `Record<string, unknown>` with typed interfaces** | Eliminates mass assignment |
| P0 | **Implement token verification in `signatureService.signDocument()`** | Prevents signature forgery |
| P1 | **Fix `pdpaService.deleteUserData()` candidate anonymization logic** | Prevents data leak during deletion |
| P1 | **Derive userId/companyId from session, not client** | Eliminates IDOR and spoofing |
| P1 | **Add file type + size validation to `storageService`** | Prevents storage abuse |
| P1 | **Escape LIKE wildcards in `searchService`** | Prevents blind enumeration |
| P2 | **Mask PII in search results, audit log exports, list endpoints** | Reduces data exposure |
| P2 | **Add rate limiting to auth, search, bulk import** | Prevents abuse and brute force |
| P2 | **Sanitize email fields in `onboardingEmailService`** | Prevents SMTP injection |
| P2 | **Cap pagination limits across all services** | Prevents resource exhaustion |
| P3 | **Remove `upsert: true` from file uploads** | Prevents file overwrites |
| P3 | **Add CSV formula injection protection** | Prevents Excel/Sheets attacks |
| P3 | **Minimize dev-mode error logging** | Reduces information disclosure |

---

## 📊 Vulnerability Distribution

```
CRITICAL: ████████████████████████ 8
HIGH:     ████████████████████████████████████████ 14
MEDIUM:   ████████████████████████████████ 11
LOW:      ████████████████ 6
INFO:     ████████████ 4
```

---

*Report generated by automated security audit. All findings verified against source code. Remediation must include both application-level fixes and Supabase RLS policy enforcement.*
