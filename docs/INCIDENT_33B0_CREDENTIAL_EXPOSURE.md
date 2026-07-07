# Incident Record: 33B.0 — Credential Exposure Containment

**Date:** 2026-06-22
**Severity:** MEDIUM (local dev keys, not production)
**Status:** CONTAINED

---

## What Was Found

### 1. Hardcoded Anon Key in Test Files (3 files)
- `tests/integration/release26a5.supabase-rls.integration.test.ts`
- `tests/integration/release26a51.rest-crud-privacy.integration.test.ts`
- `tests/integration/release26a52.deterministic-rls.test.ts`

**Key characteristics:** Local Supabase dev key (iss: `supabase-demo`, exp: `1983812996`)
**Risk:** LOW — default local dev key, not a production key
**Action required:** Replace with environment variable reference

### 2. Project Reference Exposed in Audit Artifact
- `audit_artifacts/05_infrastructure_audit.md` — Contains JWT exposing project ref

**Risk:** MEDIUM — exposes Supabase project reference
**Action required:** Redact project ref from documentation

### 3. Meta/states/ Documents in Git
- `Meta/states/` directory committed with audit documents
- Contains `service_role` references (no actual keys found in `eyJ` scan)

**Risk:** LOW — references only, no actual secret values
**Action required:** Add `Meta/states/` to `.gitignore`

---

## Containment Actions Taken

1. ✅ Confirmed `.env.local` is NOT in git
2. ✅ Confirmed no production keys in git history
3. ✅ Confirmed no Stripe live keys exposed
4. ✅ Confirmed no service_role keys exposed (only references)
5. ⏳ Test files need env var replacement
6. ⏳ Audit artifact needs redaction
7. ⏳ Secret scan pre-commit hook needed
8. ⏳ Destructive Docker command policy needed

---

## Root Cause

Integration tests were written with hardcoded anon keys for convenience during development. The local Supabase anon key is a well-known default value, but should still be treated as exposed.

---

## Impact Assessment

- **Production systems:** NOT AFFECTED (local dev keys only)
- **Local development:** NOT AFFECTED (keys are for local Supabase)
- **If shared externally:** LOW RISK (default dev keys, not production)
- **Rotation required:** Recommended for defense-in-depth

---

## Lessons Learned

1. Never hardcode any keys, even local dev defaults
2. Use environment variables for all Supabase configuration
3. Add secret scanning to pre-commit hooks
4. Audit artifacts should be in `.gitignore` or use placeholder values
