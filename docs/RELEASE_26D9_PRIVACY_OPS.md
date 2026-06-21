# Release 26D.9 — Privacy Operations

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** Legal & Privacy Engineering

## Overview

Define and implement privacy operations including Data Subject Access Request (DSAR) workflows, data retention policies, legal hold procedures, and breach response protocols.

## Objectives

- DSAR workflow automated with response within 30 days
- Data retention policies enforced automatically
- Legal hold process preserves relevant data
- Breach response plan ready for activation
- Privacy impact assessments conducted for new features

## DSAR Workflow

### Request Types

| Request Type | Description | Response Time |
|--------------|-------------|---------------|
| Access | Copy of personal data | 30 days |
| Deletion | Erasure of personal data | 30 days |
| Correction | Update inaccurate data | 30 days |
| Portability | Machine-readable export | 30 days |
| Restriction | Limit processing | 72 hours |

### DSAR Table

```sql
CREATE TABLE dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'deletion', 'correction', 'portability', 'restriction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  responder_id UUID,
  notes TEXT,
  export_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dsar_company ON dsar_requests(company_id);
CREATE INDEX idx_dsar_status ON dsar_requests(status);
```

### DSAR Processing

```typescript
// src/lib/dsar.ts

interface DSARRequest {
  id: string;
  company_id: string;
  user_id: string;
  request_type: 'access' | 'deletion' | 'correction' | 'portability' | 'restriction';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requested_at: Date;
}

async function processDSAR(request: DSARRequest): Promise<void> {
  // 1. Verify identity
  await verifyRequesterIdentity(request);

  // 2. Check for legal holds
  const holds = await checkLegalHolds(request.user_id);
  if (holds.length > 0 && request.request_type === 'deletion') {
    await rejectDSAR(request, 'Data under legal hold');
    return;
  }

  // 3. Process based on type
  switch (request.request_type) {
    case 'access':
    case 'portability':
      await exportUserData(request);
      break;
    case 'deletion':
      await deleteUserData(request);
      break;
    case 'correction':
      // Prompt for correction details
      break;
    case 'restriction':
      await restrictProcessing(request);
      break;
  }

  // 4. Notify completion
  await notifyDSARCompletion(request);
}
```

### Data Export Format

```json
{
  "export_version": "1.0",
  "export_date": "2024-06-20T00:00:00Z",
  "user_id": "usr_xyz789",
  "company_id": "comp_abc123",
  "data": {
    "profile": {
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "invoices": [...],
    "customers": [...],
    "activity_log": [...]
  }
}
```

## Data Retention

### Retention Schedule

| Data Category | Retention Period | Legal Basis |
|---------------|------------------|-------------|
| User Accounts | Account life + 1 year | Contract |
| Invoices | 7 years | Tax/Legal |
| Customer Data | Account life + 2 years | Contract |
| Audit Logs | 7 years | Legal obligation |
| Analytics Data | 2 years | Legitimate interest |
| Support Tickets | 3 years | Contract |
| Marketing Data | Until consent withdrawn | Consent |

### Retention Enforcement

```sql
-- Automated cleanup job
CREATE OR REPLACE FUNCTION enforce_data_retention()
RETURNS void AS $$
BEGIN
  -- Delete expired analytics
  DELETE FROM analytics_events
  WHERE created_at < now() - INTERVAL '2 years';

  -- Anonymize old user accounts
  UPDATE users
  SET email = 'deleted_' || id || '@anonymized.com',
      name = 'Deleted User',
      phone = NULL,
      deleted_at = now()
  WHERE deleted_at < now() - INTERVAL '1 year'
    AND email NOT LIKE 'deleted_%';

  -- Log retention actions
  INSERT INTO audit_log (action, resource_type, metadata)
  VALUES ('retention_enforcement', 'system', '{"timestamp": "' || now() || '"}');
END;
$$ LANGUAGE plpgsql;
```

## Legal Hold

### Legal Hold Table

```sql
CREATE TABLE legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  matter_name TEXT NOT NULL,
  description TEXT,
  custodian_user_ids UUID[],
  data_categories TEXT[],
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Hold Processing

```typescript
async function checkLegalHolds(userId: string): Promise<LegalHold[]> {
  return db.query(`
    SELECT * FROM legal_holds
    WHERE status = 'active'
      AND ($1 = ANY(custodian_user_ids) OR 'all' = ANY(data_categories))
      AND (end_date IS NULL OR end_date > now())
  `, [userId]);
}

// Before any data deletion, check for holds
async function safeDelete(userId: string, data: any): Promise<void> {
  const holds = await checkLegalHolds(userId);
  if (holds.length > 0) {
    throw new LegalHoldConflict(
      `Cannot delete data: ${holds.length} active legal hold(s)`,
      holds.map(h => h.matter_name)
    );
  }
  await performDeletion(data);
}
```

## Breach Response

### Breach Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Confirmed data exfiltration | Immediate |
| High | Unauthorized access detected | 1 hour |
| Medium | Potential vulnerability exploited | 4 hours |
| Low | Suspicious activity | 24 hours |

### Breach Response Plan

```
Phase 1: Detection & Containment (0-1 hours)
├── Identify scope of breach
├── Contain affected systems
├── Preserve evidence
└── Notify security team

Phase 2: Assessment (1-24 hours)
├── Determine data exposed
├── Identify affected users
├── Assess risk level
└── Legal consultation

Phase 3: Notification (24-72 hours)
├── Notify authorities (if required)
├── Notify affected users
├── Public disclosure (if required)
└── Partner notification

Phase 4: Recovery (1-4 weeks)
├── Remediate vulnerability
├── Restore normal operations
├── Monitor for recurrence
└── Update security measures
```

### Breach Notification

```typescript
interface BreachNotification {
  breach_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected_users: number;
  data_categories: string[];
  detection_date: Date;
  response_date: Date;
  description: string;
  remediation: string;
}
```

### Notification Templates

#### User Notification

```
Subject: Important Security Notice

Dear [User Name],

We are writing to inform you of a security incident that may have affected your data.

What happened: [Description]
What data was involved: [Categories]
What we're doing: [Actions taken]
What you can do: [Recommended actions]

We take the protection of your data seriously and apologize for any inconvenience.

Contact: privacy@adminmate.ai
```

#### Authority Notification

```
To: [Data Protection Authority]

Subject: Data Breach Notification - [Organization]

Incident Reference: [ID]
Date of Breach: [Date]
Date of Discovery: [Date]
Number of Individuals Affected: [Number]
Categories of Data: [List]
Measures Taken: [Description]
```

## Privacy Impact Assessment

### PIA Checklist

- [ ] Data flow mapping completed
- [ ] Legal basis documented
- [ ] Retention period defined
- [ ] Security measures reviewed
- [ ] Third-party processors assessed
- [ ] User rights facilitated
- [ ] DPO consulted (if required)

### PIA Table

```sql
CREATE TABLE privacy_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL,
  data_collected TEXT[] NOT NULL,
  legal_basis TEXT NOT NULL,
  retention_period TEXT NOT NULL,
  third_parties TEXT[],
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'rejected')),
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Acceptance Criteria

- [ ] DSAR workflow implemented and tested
- [ ] Data retention policies enforced
- [ ] Legal hold process documented
- [ ] Breach response plan approved
- [ ] Privacy impact assessment process defined
- [ ] Team trained on privacy operations
- [ ] Monitoring for compliance in place
