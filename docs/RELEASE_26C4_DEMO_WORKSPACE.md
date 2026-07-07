# Release 26C.4 — Demo Workspace

**Generated:** 2026-06-22
**Gate:** C — Demo Workspace Isolation
**Tenant Key:** `company_id`

---

## Demo Data Isolation

### Purpose

The demo workspace provides a fully functional sandbox for prospects and new users to explore AdminMate AI without risking production data.

### Isolation Architecture

| Property | Production | Demo |
|----------|-----------|------|
| `company_id` prefix | Real UUIDs | `demo-*` prefixed UUIDs |
| Data source | User-entered | Seed scripts |
| AI model access | Real API keys | Mocked responses |
| Email delivery | Real SMTP | Suppressed (log only) |
| SMS delivery | Real provider | Suppressed (log only) |
| Payment processing | Real Stripe | Stripe test mode only |
| Data retention | Per policy | Auto-purge on reset |
| Legal entity | Real registration | Placeholder values |

### Demo Company Setup

- **Company name:** "Demo Corp — AdminMate"
- **Admin email:** `demo@adminmate.ai` (or user's signup email)
- **Plan:** `enterprise` (all features unlocked for evaluation)
- **Country:** `TH` (Thailand — primary market)
- **Default locale:** `th-TH`
- **Default timezone:** `Asia/Bangkok`

### Demo Data Includes

1. **Jobs:** 5 sample job postings (Engineering, Marketing, Sales, HR, Finance)
2. **Candidates:** 20 sample candidates with varied status (new, screening, interviewed, offered)
3. **Applications:** 30 sample applications across jobs
4. **Interviews:** 10 scheduled interviews
5. **Employees:** 15 sample employees across departments
6. **Departments:** Engineering, Marketing, Sales, HR, Finance, Operations
7. **Onboarding tasks:** Standard onboarding checklist
8. **Documents:** Sample contracts, offer letters, policies
9. **Chat messages:** Sample team conversations

---

## Reset Workflow

### Trigger

- User clicks "Reset Demo Data" in Settings → Demo
- Admin clicks "Reset" from platform admin panel
- Auto-reset after 30 days of inactivity

### Reset Steps

```
1. Validate company is a demo workspace (company_id starts with 'demo-')
2. Soft-delete all demo entities (set deleted_at = NOW())
3. Anonymize candidate PII (name, email, phone)
4. Re-seed fresh demo data from seed script
5. Reset feature flags to demo defaults
6. Clear all caches (flag cache, search cache)
7. Send confirmation notification
8. Log reset event in audit_logs
```

### Reset Scope

| Table | Action | Reversible? |
|-------|--------|-------------|
| `jobs` | Soft delete + re-seed | No |
| `candidates` | Anonymize + re-seed | No |
| `applications` | Soft delete + re-seed | No |
| `interviews` | Soft delete + re-seed | No |
| `employees` | Soft delete + re-seed | No |
| `chat_messages` | Delete + re-seed | No |
| `documents` | Delete from storage + re-seed | No |
| `onboarding_instances` | Reset to initial state | No |
| `audit_logs` | Append reset event | N/A |

### Safety Controls

| Control | Description |
|---------|-------------|
| Rate limit | Max 1 reset per 24 hours per company |
| Confirmation | Requires typing company name to confirm |
| Audit log | All resets logged with user, timestamp, reason |
| No production | Only `demo-*` company IDs can be reset |
| Backup | Snapshot created before reset (retained 7 days) |
| Notification | Admin receives email confirmation |

---

## Safety Controls

### Data Boundaries

- **No real PII:** All names, emails, phones are synthetic or clearly marked as demo
- **No real payments:** Stripe in test mode only; no real charges possible
- **No real notifications:** Email and SMS suppressed; only in-app notifications
- **No real integrations:** External APIs return mocked responses
- **No export:** Demo data cannot be exported to production

### Visual Indicators

- **Banner:** "DEMO MODE — Data is simulated" displayed on all pages
- **Watermark:** "Demo" watermark on all generated documents
- **Settings badge:** "Demo Workspace" badge in settings panel
- **Feature limits:** Some features show "Available in production" tooltip

### Conversion Path

When a demo user is ready to go live:

1. User clicks "Go Live" in Settings → Demo
2. System creates a new production `company_id`
3. Copies job templates and configurations (not candidate data)
4. Removes demo watermark and banner
5. Enables real email/SMS delivery
6. Links Stripe production account
7. Marks original demo company for archival

---

## Verification

```sql
-- Identify demo companies
SELECT id, name FROM companies WHERE id::text LIKE 'demo-%';

-- Check demo data count
SELECT
  (SELECT COUNT(*) FROM jobs WHERE company_id::text LIKE 'demo-%') AS demo_jobs,
  (SELECT COUNT(*) FROM candidates WHERE company_id::text LIKE 'demo-%') AS demo_candidates;

-- Verify no production data in demo
SELECT COUNT(*) FROM candidates
WHERE company_id::text LIKE 'demo-%'
  AND email NOT LIKE '%@example.com'
  AND email NOT LIKE '%@demo.%';
-- Expected: 0
```
