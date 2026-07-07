# Release 26F.8 — Job Board and EOR Partner Verification

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Job Board Integration Architecture

### Current State

No direct job board API integrations exist. Job postings are managed internally via `jobs` table and manual posting.

### Planned Integration Matrix

| Job Board | API | Auth | Status |
|-----------|-----|------|--------|
| LinkedIn Jobs | REST API v2 | OAuth 2.0 | Planned |
| Indeed | Publisher API | API key | Planned |
| JobStreet | Partner API | API key | Planned |
| JobsDB | Partner API | API key | Planned |
| Google for Jobs | Structured data | Schema.org markup | Planned |

### Job Posting Flow (Current)

```
1. HR creates job in jobs table
2. Job status = 'draft' → 'active'
3. HR manually copies to job boards
4. Applications come via email or direct input
5. No automated posting/sync
```

---

## 2. EOR (Employer of Record) Partner Integration

### Current State

No EOR partner API integrations exist. EOR management is manual via `legal_entities` and `contractor` tables.

### Planned EOR Partners

| Partner | Region | API | Status |
|---------|--------|-----|--------|
| Remote.com | Global | REST API | Planned |
| Deel | Global | REST API | Planned |
| Oyster HR | Global | REST API | Planned |
|Multiplier | APAC | REST API | Planned |

### EOR Data Model

| Table | Purpose |
|-------|---------|
| `legal_entities` | Company legal entities per country |
| `contractor` | Contractor records with EOR reference |
| `employees` | Employee records (direct + EOR) |

### EOR Integration Flow (Planned)

```
1. HR initiates hiring in target country
2. System checks if direct entity exists
3. If no entity → route to EOR partner
4. EOR API creates worker record
5. Contract generated via EOR
6. Onboarding triggered in AdminMate
7. Payroll synced from EOR
```

---

## 3. Job Board Posting Service (Planned)

### Service Interface

```typescript
interface JobBoardProvider {
  provider: string
  isConfigured(companyId: string): Promise<boolean>
  postJob(job: JobPosting): Promise<JobBoardResult>
  updateJob(externalId: string, job: JobPosting): Promise<JobBoardResult>
  deleteJob(externalId: string): Promise<JobBoardResult>
  getApplications(externalId: string): Promise<JobBoardApplication[]>
}
```

### `jobs` Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | UUID FK | Tenant scope |
| `title` | VARCHAR | Job title |
| `description` | TEXT | Job description |
| `department_id` | UUID FK | Department |
| `location_id` | UUID FK | Work location |
| `status` | VARCHAR | `draft`, `active`, `closed` |
| `salary_min` | NUMERIC | Minimum salary |
| `salary_max` | NUMERIC | Maximum salary |
| `employment_type` | VARCHAR | `full_time`, `part_time`, `contract` |

---

## 4. Sandbox Verification Checklist

### Job Board

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | Create job in AdminMate | Job saved with status=`draft` | ✅ Implemented |
| 2 | Publish job | Status changes to `active` | ✅ Implemented |
| 3 | List active jobs | Returns all `active` jobs for company | ✅ Implemented |
| 4 | Job board API posting (mock) | External ID returned | ⬜ Planned |
| 5 | Job board sync | Updates reflected externally | ⬜ Planned |
| 6 | RLS: Company A cannot see Company B jobs | Query returns empty | ✅ Migrated |

### EOR

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | Create legal entity | Entity saved with country | ✅ Implemented |
| 2 | List legal entities by country | Filtered results | ✅ Implemented |
| 3 | EOR partner API worker creation (mock) | Worker record created | ⬜ Planned |
| 4 | EOR contract sync | Contract stored in documents | ⬜ Planned |
| 5 | EOR payroll sync | Payroll records created | ⬜ Planned |

---

## 5. Google for Jobs (Structured Data)

### Implementation Path

Rather than direct API integration, use Schema.org `JobPosting` structured data:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Software Engineer",
  "description": "...",
  "datePosted": "2026-06-22",
  "validThrough": "2026-07-22",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Company Name"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {...}
  }
}
</script>
```

---

## 6. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No job board API integration | P1 | Implement LinkedIn/Indeed adapters |
| No automated job posting | P1 | Add job sync on publish |
| No application sync from boards | P2 | Pull applications via API |
| No EOR partner API integration | P1 | Implement Remote/Deel adapters |
| No EOR contract sync | P2 | Sync contracts from EOR |
| No EOR payroll sync | P2 | Sync payroll from EOR |
| No Google for Jobs markup | P3 | Add structured data to job pages |
