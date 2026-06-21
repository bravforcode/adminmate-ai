# Release 26C.5 — Truthful UI

**Generated:** 2026-06-22
**Gate:** C — UI State Honesty
**Tenant Key:** `company_id`

---

## Principle

> **Every feature must accurately reflect its real state. No feature should appear available when it is not.**

The UI must never mislead users about what is functional, configured, or available on their plan.

---

## UI State Categories

### 1. `ComingSoon`

Feature exists in the UI but is not yet implemented in the backend.

| Component | Feature | Current State |
|-----------|---------|---------------|
| `PeopleAnalytics` | People Analytics dashboard | UI shell only; no data queries |
| `CompensationBands` | Compensation band management | UI shell only; no CRUD |
| `WorkforcePlanning` | Workforce planning | UI shell only; no calculations |
| `LearningPaths` | Learning & development paths | UI shell only; no enrollment |
| `EngagementSurveys` | Engagement survey builder | UI shell only; no distribution |
| `InternalMobility` | Internal job marketplace | UI shell only; no matching |
| `VendorManagement` | Vendor/contractor portal | UI shell only; no onboarding |

**UI Treatment:**
- Show module card with "Coming Soon" badge
- Clicking opens read-only preview page
- CTA button disabled: "Coming in Release 27"
- No data entry forms
- No API calls made

---

### 2. `NeedsConfiguration`

Feature is implemented but requires configuration before it can function.

| Component | Feature | Required Config |
|-----------|---------|-----------------|
| `PayrollRun` | Payroll processing | Legal entity, country pack, payroll cycle |
| `ComplianceFiling` | Statutory filing | Legal entity, tax registration |
| `Messaging` | Multi-channel messaging | Provider config, approval workflow |
| `Attendance` | Attendance tracking | Shift schedules, locations |
| `Leave` | Leave management | Leave types, accrual policies |
| `Performance` | Performance reviews | Review cycles, rating scales |
| `Benefits` | Benefits management | Benefit plans, enrollment rules |
| `SSO` | Single sign-on | SAML/OIDC provider config |
| `APIWebhooks` | API & webhooks | API key, webhook endpoints |

**UI Treatment:**
- Show module card with "Setup Required" badge
- Clicking opens configuration wizard
- CTA button: "Configure Now"
- Configuration progress indicator (e.g., "3 of 5 steps complete")
- Show which config items are missing

---

### 3. `SandboxOnly`

Feature works in demo/sandbox but is restricted in production.

| Component | Feature | Production Restriction |
|-----------|---------|----------------------|
| `AIAssistant` | AI chat assistant | Rate-limited; requires subscription |
| `AIResumeScreening` | AI resume screening | Requires AI credits |
| `AIMatching` | AI candidate matching | Requires AI credits |
| `BulkImport` | Bulk data import | Requires admin role |
| `Export` | Data export | Requires admin role; logged |

**UI Treatment:**
- Show module card with "Sandbox" badge in demo mode
- In production: show usage limits and billing info
- CTA button: "Try in Demo" (demo) or "Upgrade to Use" (production)
- Usage meter showing remaining credits

---

### 4. `PlanRestricted`

Feature exists but is not available on the user's current plan.

| Feature | Required Plan |
|---------|--------------|
| SSO Integration | Enterprise |
| Custom Branding | Pro, Enterprise |
| Advanced Reporting | Pro, Enterprise |
| API Access | Pro, Enterprise |
| Priority Support | Enterprise |

**UI Treatment:**
- Show module card with "Pro" or "Enterprise" badge
- Clicking opens plan comparison modal
- CTA button: "Upgrade Plan"
- Show feature comparison table

---

### 5. `Active`

Feature is fully functional and configured.

**UI Treatment:**
- Normal module card with status indicator
- Full CRUD operations available
- Real-time data updates
- No special badges

---

## Implementation Pattern

### Component Wrapper

```tsx
// Example: FeatureGate component
type FeatureState = 'active' | 'coming_soon' | 'needs_config' | 'sandbox_only' | 'plan_restricted'

interface FeatureGateProps {
  feature: string
  state: FeatureState
  configSteps?: string[]
  requiredPlan?: string
  children: React.ReactNode
}
```

### Service Integration

```typescript
// Check feature state before rendering
async function getFeatureState(featureKey: string, companyId: string): Promise<FeatureState> {
  const enabled = await isFeatureEnabled(featureKey, companyId)
  if (!enabled) {
    const config = await getConfigurationStatus(featureKey, companyId)
    if (!config.complete) return 'needs_config'
    const plan = await getPlanRestriction(featureKey, companyId)
    if (plan.restricted) return 'plan_restricted'
  }
  return 'active'
}
```

---

## Audit Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | All features have explicit state label | ⬜ |
| 2 | No feature shows "Available" when config is missing | ⬜ |
| 3 | Kill-switched features show correct state | ⬜ |
| 4 | Beta features show "Beta" badge when enrolled | ⬜ |
| 5 | Plan restrictions show upgrade CTA | ⬜ |
| 6 | Demo mode shows "Sandbox" indicators | ⬜ |
| 7 | Coming Soon features make no backend calls | ⬜ |
| 8 | All states are accessible (a11y compliant) | ⬜ |
