# Phase 8C — Subscription Limit Enforcement Audit

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE — All limits documented  
**Verdict**: Safe for beta (soft prompts). NOT safe for paid launch (no server-side enforcement).

---

## Enforcement Summary

| Feature | Free Limit | Growth Limit | Pro Limit | Current Enforcement | Risk |
|---------|:----------:|:------------:|:---------:|:-------------------:|:----:|
| HR users | 1 | 5 | 20 | **Not enforced** | Medium |
| Employees | 50 | 500 | 5000 | **Not enforced** | Medium |
| Jobs | 1 | 10 | ∞ | **Not enforced** | Medium |
| Candidates | 5 | 100 | 1000 | **Not enforced** | Medium |
| AI messages/mo | 10 | 100 | ∞ | **Not enforced** | Medium |
| Document signing | ❌ | ✅ | ✅ | **Not enforced** | Medium |
| PDPA tools | ❌ | ✅ | ✅ | **Not enforced** | Medium |
| Bulk import | ❌ | ❌ | ✅ | **UI-only gate** | Low |
| Custom reports | ❌ | ❌ | ✅ | **UI-only gate** | Low |
| Audit log days | 0 | 90 | 365 | **Not enforced** | Low |

---

## Detailed Audit by Feature

### 1. Job Creation
- **Service**: `src/services/jobService.ts`
- **Insert**: `supabase.from('jobs').insert(job)`
- **Limit check**: ❌ None
- **Server-side**: ❌ No
- **Client-side**: ❌ No
- **Risk**: Free user can create unlimited jobs

### 2. Candidate Creation
- **Service**: `src/services/candidateService.ts`
- **Insert**: `supabase.from('candidates').insert(input)`
- **Limit check**: ❌ None
- **Server-side**: ❌ No
- **Client-side**: ❌ No
- **Risk**: Free user can create unlimited candidates

### 3. HR User Invite
- **Service**: `src/services/companyService.ts`
- **Insert**: `supabase.from('user_profiles').insert(...)`
- **Limit check**: ❌ None
- **Server-side**: ❌ No
- **Client-side**: ❌ No
- **Risk**: Free user can invite unlimited HR users

### 4. Document Signing
- **Service**: `src/services/signatureService.ts`
- **Insert**: `supabase.from('document_signatures').insert(...)`
- **Limit check**: ❌ None
- **Server-side**: ❌ No
- **Client-side**: ❌ No
- **Risk**: Free user can request unlimited signatures

### 5. AI Chat Messages
- **Service**: `src/services/chatService.ts`
- **Insert**: `supabase.from('chat_messages').insert(msg)`
- **Limit check**: ❌ None
- **Server-side**: ❌ No
- **Client-side**: ❌ No
- **Risk**: Free user can send unlimited AI messages

### 6. Bulk Import
- **Service**: `src/services/bulkImportService.ts`
- **Insert**: `supabase.from('candidates').insert(mapped)`
- **Limit check**: ✅ UI-only via `<SubscriptionGate feature="bulkImport">`
- **Server-side**: ❌ No
- **Client-side**: ✅ Page-level gate
- **Risk**: Low — can bypass UI, but Pro-only feature

### 7. Custom Reports (Scheduled)
- **Service**: `src/services/reportService.ts`
- **Insert**: `supabase.from('report_schedules').insert(...)`
- **Limit check**: ✅ UI-only via `<InlineGate feature="customReports">`
- **Server-side**: ❌ No
- **Client-side**: ✅ Button-level gate
- **Risk**: Low — can bypass UI, but Pro-only feature

### 8. PDPA Tools
- **Service**: `src/services/pdpaService.ts`
- **Operations**: Export, delete, audit logging
- **Limit check**: ❌ None
- **Server-side**: ❌ No
- **Client-side**: ❌ No
- **Risk**: Free user can use PDPA tools

---

## What's Gated vs What's Not

### ✅ Gated (UI-only)
- Bulk import page → `<SubscriptionGate feature="bulkImport">`
- Schedule report button → `<InlineGate feature="customReports">`

### ❌ Not Gated (any tier can use)
- Job creation
- Candidate creation
- HR user invites
- Document signing requests
- AI chat messages
- PDPA export/delete
- Reports (viewing, not scheduling)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| Free user exceeds limits | Revenue loss | Medium | Soft prompts, upgrade CTAs |
| Free user bypasses UI gates | Revenue loss | Low | Acceptable for beta |
| Abuse of AI messages | Cost overrun | Medium | Monitor usage, add rate limits |
| Abuse of document signing | Cost overrun | Low | Low adoption in beta |

---

## Recommendations

### For Beta (NOW)
- ✅ **Acceptable**: UI-only gates with soft prompts
- ✅ **Acceptable**: No server-side enforcement
- ✅ **Acceptable**: Monitor usage manually
- ✅ **Acceptable**: Upgrade CTAs on limit-reached actions

### For Paid Launch (MUST-FIX)
- ❌ **Must add**: Server-side limit checks in Edge Functions
- ❌ **Must add**: RLS policies for limit enforcement
- ❌ **Must add**: Usage tracking in database
- ❌ **Must add**: Rate limiting on AI messages
- ❌ **Must add**: Automatic downgrade when limits exceeded

### Example Server-Side Enforcement (Future)
```sql
-- RLS policy for job creation
CREATE POLICY "Enforce job limit" ON jobs
FOR INSERT WITH CHECK (
  (SELECT COUNT(*) FROM jobs WHERE company_id = auth.uid()::uuid) <
  (SELECT max_active_jobs FROM subscriptions WHERE company_id = auth.uid()::uuid)
);
```

---

## Verdict

| Decision | Status | Rationale |
|----------|:------:|-----------|
| Safe for beta | ✅ | Soft prompts, upgrade notices, monitor manually |
| Safe for paid launch | ❌ | No server-side enforcement |
| Must-fix before real payments | ⚠️ | Add server-side limits for revenue protection |
