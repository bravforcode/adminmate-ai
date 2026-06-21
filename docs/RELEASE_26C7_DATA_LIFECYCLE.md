# Release 26C.7 — Data Lifecycle

**Generated:** 2026-06-22
**Gate:** C — Data Lifecycle Management
**Tenant Key:** `company_id`

---

## 1. Company Closure

### Trigger

- Account owner requests closure via Settings → Account → Close Account
- Admin deletes company from platform admin panel
- Subscription cancelled for 90+ days with no payment

### Closure Workflow

```
1. Validate closure request (owner confirmation required)
2. Set company status to 'closing'
3. Trigger 30-day grace period
4. Send final data export to owner email
5. After grace period:
   a. Anonymize all user PII
   b. Soft-delete all company data
   c. Retain audit logs for 7 years (legal requirement)
   d. Retain financial records for 7 years (tax requirement)
   e. Delete storage objects
   f. Remove Stripe customer
   g. Set company status to 'closed'
```

### Data Retention After Closure

| Data Type | Retention Period | Reason |
|-----------|-----------------|--------|
| Audit logs | 7 years | Legal compliance |
| Financial records | 7 years | Tax requirements |
| Employee records | 7 years | Labor law |
| Contracts | 7 years | Legal statute |
| Chat messages | 30 days | Grace period |
| Documents | 30 days | Grace period |
| User PII | Immediate anonymization | Privacy |

---

## 2. Employee Deletion & Retention

### Soft Delete

Employees are never hard-deleted while the company has active operations.

```sql
-- Soft delete employee
UPDATE employees
SET deleted_at = NOW(),
    deleted_by = auth.uid()
WHERE id = 'EMPLOYEE_ID'
  AND company_id = 'COMPANY_ID';
```

### Retention Rules

| Condition | Action | Retention Period |
|-----------|--------|-----------------|
| Active employee | Cannot delete | N/A |
| Terminated employee | Soft delete | 7 years from termination |
| Contractor | Soft delete | 3 years from contract end |
| Onboarding (incomplete) | Soft delete | 1 year from last activity |

### Employee Data After Deletion

| Field | Action |
|-------|--------|
| `first_name`, `last_name` | Anonymized to "Deleted Employee" |
| `email` | Anonymized to `deleted-{uuid}@anonymized.local` |
| `phone` | Cleared |
| `avatar_url` | Cleared |
| `salary` | Cleared |
| `bank_account` | Cleared |
| `national_id` | Cleared |
| `medical_info` | Cleared |
| Employment history | Retained (anonymized) |
| Payroll records | Retained (anonymized) |

---

## 3. Candidate Deletion

### Retention Rules

| Condition | Action | Retention Period |
|-----------|--------|-----------------|
| Candidate with active application | Cannot delete | N/A |
| Rejected candidate (no offer) | Soft delete | 2 years from last status change |
| Offered candidate | Soft delete | 3 years from offer date |
| Hired candidate | Converted to employee | N/A |

### Candidate Data After Deletion

| Field | Action |
|-------|--------|
| `first_name`, `last_name` | Anonymized |
| `email` | Anonymized |
| `phone` | Cleared |
| `resume_url` | Deleted from storage |
| `notes` | Retained (anonymized) |
| Application history | Retained (anonymized) |
| Interview feedback | Retained (anonymized) |

---

## 4. Document Retention

### Document Types & Retention

| Document Type | Retention Period | Legal Basis |
|--------------|-----------------|-------------|
| Employment contract | 7 years from end of employment | Labor law |
| Offer letter | 7 years from hire date | Contract law |
| Payslips | 7 years | Tax requirement |
| Tax documents | 7 years | Tax requirement |
| Policy acknowledgments | 7 years from end of employment | Compliance |
| Training records | 3 years from end of employment | Compliance |
| Medical certificates | 3 years from end of employment | Privacy |
| ID documents | 3 years from end of employment | Identity verification |
| Performance reviews | 3 years from end of employment | HR records |

### Document Deletion

```sql
-- Documents past retention are purged by scheduled job
-- Runs monthly, targets documents with deleted_at + retention_period < NOW()

DELETE FROM documents
WHERE deleted_at IS NOT NULL
  AND deleted_at + INTERVAL '7 years' < NOW()
  AND document_type IN ('contract', 'payslip', 'tax_document');
```

---

## 5. Data Export

### Export Types

| Export | Scope | Format | Rate Limit |
|--------|-------|--------|------------|
| Employee data | Single employee | JSON, CSV | 10/day |
| Company data | Full company | JSON | 1/month |
| Payroll data | Payroll records | CSV | 1/week |
| Audit logs | Audit trail | JSON | 1/month |
| Candidate data | Recruitment | CSV | 1/week |

### Export Workflow

```
1. User requests export via Settings → Data Export
2. System validates permissions (admin only for bulk)
3. System generates export file
4. File stored in secure storage (7-day expiry)
5. Download link sent to user email
6. Export logged in audit_logs
7. After 7 days, file is deleted from storage
```

### Export Restrictions

- No bulk PII export without admin + MFA verification
- Export limited to company_id scope (RLS enforced)
- Export logs retained for 7 years
- Rate limits prevent data exfiltration
- Exported data contains no API keys or secrets

---

## 6. Legal Hold

### Purpose

Legal hold prevents deletion or modification of data that may be relevant to ongoing litigation, regulatory investigation, or audit.

### Implementation

```sql
-- Legal hold table
CREATE TABLE IF NOT EXISTS legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    hold_reason TEXT NOT NULL,
    hold_scope VARCHAR(50) NOT NULL CHECK (hold_scope IN (
        'all', 'employees', 'candidates', 'documents', 'payroll', 'communications'
    )),
    target_ids UUID[],  -- Specific IDs to hold, NULL = all in scope
    imposed_by UUID NOT NULL REFERENCES auth.users(id),
    imposed_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    released_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'released'))
);
```

### Legal Hold Effects

| Operation | Effect During Hold |
|-----------|-------------------|
| Employee deletion | **Blocked** |
| Candidate deletion | **Blocked** |
| Document deletion | **Blocked** |
| Payroll record modification | **Blocked** |
| Audit log modification | **Blocked** (append-only) |
| Data export | **Permitted** (for legal review) |
| Backup creation | **Permitted** |

### Legal Hold Workflow

```
1. Legal team requests hold via Admin → Legal Holds
2. Admin specifies scope and target IDs
3. System creates legal_hold record
4. Deletion triggers check legal_holds before executing
5. Blocked operations return error: "Data under legal hold"
6. When hold is released:
   a. Set released_at and released_by
   b. Pending deletions can now proceed
   c. Hold record retained indefinitely (audit trail)
```

---

## 7. Backup & Retention

### Backup Schedule

| Backup Type | Frequency | Retention | Scope |
|------------|-----------|-----------|-------|
| Full database | Daily | 30 days | All tables |
| Incremental | Hourly | 7 days | Changed records |
| WAL archive | Continuous | 7 days | Point-in-time recovery |
| Storage backup | Daily | 30 days | All uploaded files |

### Backup Retention Policy

| Retention Tier | Period | Use Case |
|---------------|--------|----------|
| Hot (available) | 7 days | Quick restore |
| Warm (compressed) | 30 days | Recent recovery |
| Cold (archived) | 1 year | Compliance, audit |
| Frozen (immutable) | 7 years | Legal requirement |

### Recovery Procedures

| Scenario | Recovery Time | Procedure |
|----------|--------------|-----------|
| Accidental deletion | < 1 hour | Point-in-time restore |
| Data corruption | < 4 hours | Restore from latest backup |
| Ransomware attack | < 24 hours | Restore from immutable backup |
| Company closure audit | N/A | Provide archived backup |

### Backup Security

- All backups encrypted at rest (AES-256)
- Backups stored in separate geographic region
- Backup access requires platform_admin role
- Backup deletion requires two-person approval
- Backup integrity verified weekly (checksum validation)

---

## Verification

```sql
-- Check retention compliance
SELECT
  (SELECT COUNT(*) FROM employees WHERE deleted_at IS NOT NULL
   AND deleted_at > NOW() - INTERVAL '7 years') AS employees_in_retention,
  (SELECT COUNT(*) FROM candidates WHERE deleted_at IS NOT NULL
   AND deleted_at > NOW() - INTERVAL '2 years') AS candidates_in_retention,
  (SELECT COUNT(*) FROM documents WHERE deleted_at IS NOT NULL
   AND deleted_at > NOW() - INTERVAL '7 years') AS documents_in_retention;

-- Check legal holds
SELECT * FROM legal_holds WHERE status = 'active';

-- Check backup status
SELECT
  last_backup_at,
  backup_size_mb,
  backup_status
FROM companies
WHERE id = 'COMPANY_ID';
```
