# Release 26E.5 — Document Management E2E

## Scope

Document upload, verification, e-signature, storage, and lifecycle management.

## Document Lifecycle

```
Upload → Virus Scan → Verification → Storage → Share/Sign → Archive → Purge
```

## Test Coverage

| Stage | Assertions |
|-------|------------|
| Upload | File type validation, size limits, storage quota check |
| Storage | Supabase Storage bucket, `company_id` path prefix |
| Verification | OCR/metadata extraction, completeness check |
| E-signature | Signature request, signer invite, completion tracking |
| Access control | Read/write/owner permissions, tenant isolation |
| Lifecycle | Version history, audit trail, retention policy |

## Storage Architecture

```
Supabase Storage
└── documents/
    └── {company_id}/
        ├── contracts/
        ├── onboarding/
        ├── policies/
        └── signatures/
```

## File Constraints

| Parameter | Limit |
|-----------|-------|
| Max file size | 25 MB |
| Allowed types | PDF, DOCX, PNG, JPG |
| Storage quota | Per plan (see 26E.4 entitlements) |
| Retention | Per company policy (configurable) |

## E-Signature Flow

1. Document owner initiates signature request
2. System generates signing link (tokenized, time-limited)
3. Signers receive email notification
4. Signers complete signature (click-to-sign or drawn)
5. System records signature metadata (IP, timestamp, signer identity)
6. Signed document stored with signature certificate
7. Audit log updated with full signing chain

## Security

- All uploads validated server-side (type, size, malware scan)
- Signed URLs for temporary access (15-minute expiry)
- RLS enforced: `storage.objects` policy checks `company_id` in path
- Audit log captures all document access events
- PII in documents encrypted at rest via Supabase Storage

## Integration Points

- Onboarding: Auto-request required documents from new hires
- Hiring: Contract attachment to offer letter
- HRIS: Employee document vault
- Compliance: Policy acknowledgment tracking
