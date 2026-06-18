# Phase 7D — Subscription Gating + Limits Report

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE — All tests pass  
**TypeScript**: 0 errors  
**Build**: PASS  
**E2E**: 51/51 PASS (29 auth + 22 a11y)

---

## Files Created

- `src/components/shared/SubscriptionGate.tsx` — Two components:
  - `SubscriptionGate` — Full-page gate with upgrade CTA
  - `InlineGate` — Inline overlay for individual buttons/actions

## Files Modified

- `src/pages/settings/BulkImportPage.tsx` — Wrapped with `SubscriptionGate feature="bulkImport"` (Pro only)
- `src/pages/ReportsPage.tsx` — Schedule Report button wrapped with `InlineGate feature="customReports"` (Pro only)

---

## Subscription Gating Strategy

| Feature | Free | Growth | Pro | Gate Type |
|---------|:----:|:------:|:---:|:---------:|
| HR Users | 1 | 5 | 20 | Hard limit |
| Employees | 50 | 500 | 5000 | Hard limit |
| Jobs | 1 | 10 | ∞ | Hard limit |
| Candidates | 5 | 100 | 1000 | Hard limit |
| AI Messages/mo | 10 | 100 | ∞ | Hard limit |
| E-signature | ❌ | ✅ | ✅ | Gate |
| PDPA Tools | ❌ | ✅ | ✅ | Gate |
| Bulk Import | ❌ | ❌ | ✅ | Gate (full page) |
| Custom Reports | ❌ | ❌ | ✅ | Gate (inline button) |
| Priority Support | ❌ | ❌ | ✅ | Gate |

---

## How Gates Work

### SubscriptionGate (Full Page)
- Wraps entire page content
- Shows lock icon, "Upgrade Required" title, description, and upgrade button
- Links to `/settings/billing`
- Used for: BulkImportPage

### InlineGate (Inline Overlay)
- Wraps individual buttons/actions
- Shows 50% opacity overlay with "Upgrade" button
- Used for: Schedule Report button in ReportsPage

---

## Usage Examples

```tsx
// Full page gate
<SubscriptionGate feature="bulkImport">
  <BulkImportPage />
</SubscriptionGate>

// Inline gate
<InlineGate feature="customReports">
  <Button>Schedule Report</Button>
</InlineGate>

// Check feature directly
import { hasFeature } from '../lib/subscriptions'
if (hasFeature(tier, 'documentSigning')) {
  // Show signing UI
}
```

---

## Rollback

- Remove `<SubscriptionGate>` wrapper → feature immediately accessible
- Remove `<InlineGate>` wrapper → button immediately clickable
- No database changes required for gating logic
