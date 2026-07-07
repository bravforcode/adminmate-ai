# Release 26F.9 — Bank Export and Accounting

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Accounting Integration Architecture

### Integration Providers

| Provider | Category | Status | Migration |
|----------|----------|--------|-----------|
| `xero` | accounting | `schema_only` | `20240620000034_integration_adapters.sql` |
| `quickbooks` | accounting | `schema_only` | `20240620000034_integration_adapters.sql` |

### Current State

Accounting integrations have provider catalog entries and per-company config tables but no real API wiring.

---

## 2. Bank Export Flow

### Export Types

| Export | Format | Scope | Use Case |
|--------|--------|-------|----------|
| Bank file | CSV/BAI2 | Payroll run | Direct bank transfer |
| Accounting journal | CSV/XML | Financial data | Import to accounting system |
| Tax filing | PDF/XML | Statutory | Government submission |

### Bank Export Workflow

```
1. Payroll run completed (payroll_run_service)
2. HR requests bank export
3. System generates bank-formatted file
4. File stored in secure storage (7-day expiry)
5. Download link sent to finance admin
6. Export logged in audit_logs
7. File deleted after 7 days
```

### Bank File Format

| Country | Format | Standard |
|---------|--------|----------|
| Thailand | BAI2 / CSV | BOT standard |
| Singapore | GIRO / CSV | MAS standard |
| Vietnam | CSV / XML | SBV standard |
| Global | SWIFT MT101 / CSV | ISO 20022 |

---

## 3. Payroll-to-Accounting Sync

### Data Flow

```
Payroll Run → Journal Entries → Accounting System
                ↓
        Bank Export File → Bank Upload
```

### Journal Entry Structure

| Field | Description |
|-------|-------------|
| `date` | Transaction date |
| `account_code` | Chart of accounts code |
| `debit` | Debit amount |
| `credit` | Credit amount |
| `description` | Transaction description |
| `reference` | Payroll run ID |
| `department` | Cost center |

### Account Mapping

| Payroll Component | Account Code | Type |
|-------------------|-------------|------|
| Base salary | 5000 | Expense |
| Social security (employer) | 5010 | Expense |
| Provident fund (employer) | 5020 | Expense |
| Income tax | 2100 | Liability |
| Social security (employee) | 2110 | Liability |
| Net pay | 1000 | Asset (bank) |

---

## 4. Xero Integration (Planned)

| Requirement | Detail |
|-------------|--------|
| API | Xero Accounting API v2 |
| Auth | OAuth 2.0 (Authorization Code flow) |
| Scopes | `accounting.transactions`, `accounting.contacts` |
| Sandbox | Xero Demo Company available |
| Flow | OAuth → Get tenants → Create journal → Sync contacts |

### Xero Sync Objects

| Object | Xero Endpoint | AdminMate Source |
|--------|--------------|-----------------|
| Journal | `/api.xro/2.0/Journals` | Payroll journal entries |
| Contact | `/api.xro/2.0/Contacts` | Employees, vendors |
| Invoice | `/api.xro/2.0/Invoices` | Payroll liabilities |
| Bank Transaction | `/api.xro/2.0/BankTransactions` | Payroll payments |

---

## 5. QuickBooks Integration (Planned)

| Requirement | Detail |
|-------------|--------|
| API | QuickBooks Online API v3 |
| Auth | OAuth 2.0 |
| Scopes | `com.intuit.quickbooks.accounting` |
| Sandbox | QuickBooks Sandbox company available |
| Flow | OAuth → Get company → Create journal entry |

### QuickBooks Sync Objects

| Object | QB Endpoint | AdminMate Source |
|--------|------------|-----------------|
| JournalEntry | `/v3/company/{id}/journalentry` | Payroll journal |
| Vendor | `/v3/company/{id}/vendor` | Employees |
| Bill | `/v3/company/{id}/bill` | Payroll liabilities |
| Account | `/v3/company/{id}/account` | Chart of accounts |

---

## 6. Sandbox Verification Checklist

### Bank Export

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | Generate bank export CSV | Valid CSV with headers | ⬜ Pending |
| 2 | Country-specific format (Thailand) | BAI2 format generated | ⬜ Pending |
| 3 | File stored in secure storage | Accessible via signed URL | ⬜ Pending |
| 4 | File expires after 7 days | Auto-deletion scheduled | ⬜ Pending |
| 5 | Audit log created | Export event logged | ⬜ Pending |
| 6 | RLS: Finance admin only | Permission check enforced | ⬜ Pending |

### Xero/QuickBooks

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | OAuth flow initiation | Redirect to provider | ⬜ Planned |
| 2 | Token exchange | Access + refresh tokens stored | ⬜ Planned |
| 3 | Journal entry sync | Entry created in accounting system | ⬜ Planned |
| 4 | Contact sync | Employee created as vendor/contact | ⬜ Planned |
| 5 | Idempotency | Duplicate entries prevented | ⬜ Planned |
| 6 | Rate limiting | Respects API rate limits | ⬜ Planned |

---

## 7. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No Xero API integration | P1 | Implement OAuth + journal sync |
| No QuickBooks API integration | P1 | Implement OAuth + journal sync |
| No bank file generation | P0 | Implement BAI2/GIRO format generators |
| No country-specific formats | P2 | Add bank formats per payroll country |
| No automatic sync scheduling | P2 | Cron-based journal sync |
| No chart of accounts mapping | P2 | Configurable account code mapping |
