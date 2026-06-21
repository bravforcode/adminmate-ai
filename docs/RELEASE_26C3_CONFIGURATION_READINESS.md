# Release 26C.3 — Configuration Readiness

**Generated:** 2026-06-22
**Gate:** C — Configuration Readiness
**Tenant Key:** `company_id`

---

## Readiness Checks

Each new tenant must pass all nine readiness checks before any feature module can be activated.

---

### 1. Legal Entity

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Legal entity exists | `legal_entities` | `id`, `name`, `country_code` | ⬜ |
| Registration number set | `entity_registration_numbers` | `registration_number`, `registration_type` | ⬜ |
| Tax ID present | `legal_entities` | `tax_id` | ⬜ |
| Address registered | `entity_addresses` | `address_line1`, `city`, `country_code` | ⬜ |
| At least one entity active | `legal_entities` | `status = 'active'` | ⬜ |

**Gate Rule:** Payroll, compliance, and statutory filing modules require an active legal entity with tax registration.

---

### 2. Locale & Timezone

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Company default locale set | `companies` | `default_locale` | ⬜ |
| Company default timezone set | `companies` | `default_timezone` | ⬜ |
| Locale exists in `locale_configs` | `locale_configs` | `code` matches company locale | ⬜ |
| Timezone exists in `timezone_configs` | `timezone_configs` | `name` matches company timezone | ⬜ |

**Gate Rule:** Document generation, notification scheduling, and payroll processing require valid locale and timezone.

---

### 3. Roles

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| At least one role assigned | `user_roles` | user has role | ⬜ |
| Admin role exists for company | `roles` | `name = 'admin'` | ⬜ |
| RBAC seed applied | `roles`, `role_permissions` | seed data present | ⬜ |

**Gate Rule:** All CRUD operations require role-based permissions. Company must have at least one admin user.

---

### 4. Data Retention

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Retention policy defined | `companies` or config | retention_days set | ⬜ |
| Legal-hold mechanism available | N/A | function exists | ⬜ |
| Backup schedule configured | Infrastructure | backup policy | ⬜ |

**Gate Rule:** Data retention policy must be defined before processing employee PII. Legal-hold must be functional for compliance.

---

### 5. Templates

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Contract template exists | `contract_templates` | at least 1 active template | ⬜ |
| Email notification templates | `message_templates` | onboarding, offer, exit templates | ⬜ |
| Document templates seeded | `document_templates` | company letterhead, offer letter | ⬜ |

**Gate Rule:** Onboarding and offboarding workflows require at least one contract template and notification templates.

---

### 6. Approvals

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Approval workflow configured | `approval_workflows` | at least 1 workflow | ⬜ |
| Approver assigned | `approval_steps` | step with assigned approver | ⬜ |
| Messaging approval enabled | Feature flag | `messaging_enabled` | ⬜ |

**Gate Rule:** Messaging module requires approval workflow. Salary changes and leave requests require approval chains.

---

### 7. Provider Config

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Email provider configured | `integrations` | SMTP or provider API key | ⬜ |
| SMS provider configured (optional) | `integrations` | Twilio/SNS credentials | ⬜ |
| Chat platform connected (optional) | `chat_platform_connections` | active connection | ⬜ |
| Storage bucket configured | `storage` | company bucket exists | ⬜ |

**Gate Rule:** Notifications require at least email provider. File uploads require storage bucket.

---

### 8. Payroll Country Pack

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Country pack activated | `country_feature_flags` or `feature_flags.allowed_countries` | country matches | ⬜ |
| Tax tables loaded | `payroll_tax_tables` or config | country-specific rates | ⬜ |
| Social security config | `entity_tax_profiles` | SS registration number | ⬜ |
| Payroll cycle defined | `payroll_cycles` | pay frequency, cut-off dates | ⬜ |

**Gate Rule:** Payroll module requires active country pack with loaded tax tables and defined payroll cycle.

---

### 9. Billing Entitlement

| Check | Source Table | Required Fields | Status |
|-------|-------------|----------------|--------|
| Subscription active | `subscriptions` | `status = 'active'` | ⬜ |
| Plan limits defined | `plans` | employee limit, feature access | ⬜ |
| Stripe customer linked | `subscriptions` | `stripe_customer_id` | ⬜ |
| Payment method on file | Stripe | payment method attached | ⬜ |

**Gate Rule:** All paid features require active subscription within plan limits. Overage must be handled by billing module.

---

## Readiness Gate Summary

| # | Check | Required For | Blocker? |
|---|-------|-------------|----------|
| 1 | Legal Entity | Payroll, Compliance, Statutory | **Yes** |
| 2 | Locale/Timezone | Documents, Notifications, Payroll | **Yes** |
| 3 | Roles | All CRUD operations | **Yes** |
| 4 | Data Retention | PII processing | **Yes** |
| 5 | Templates | Onboarding, Offboarding | Soft |
| 6 | Approvals | Messaging, Salary changes | Soft |
| 7 | Provider Config | Notifications, File uploads | Soft |
| 8 | Payroll Country Pack | Payroll processing | **Yes** |
| 9 | Billing Entitlement | All paid features | **Yes** |

---

## Verification

```sql
-- Check readiness for a specific company
SELECT
  le.id IS NOT NULL AS has_legal_entity,
  c.default_locale IS NOT NULL AS has_locale,
  c.default_timezone IS NOT NULL AS has_timezone,
  (SELECT COUNT(*) FROM user_roles ur WHERE ur.user_id IN (
    SELECT up.user_id FROM user_profiles up WHERE up.company_id = c.id
  )) > 0 AS has_roles,
  s.status = 'active' AS has_active_subscription
FROM companies c
LEFT JOIN legal_entities le ON le.company_id = c.id AND le.status = 'active'
LEFT JOIN subscriptions s ON s.company_id = c.id
WHERE c.id = 'TARGET_COMPANY_ID';
```
