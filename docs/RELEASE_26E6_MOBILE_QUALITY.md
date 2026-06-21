# Release 26E.6 — Mobile, Browser & PWA Quality Matrix

## Scope

Cross-device quality assurance including mobile responsiveness, browser compatibility, and PWA readiness.

## Device/Browser Matrix

| Device | Browser | Viewport | Status | Spec |
|--------|---------|----------|--------|------|
| Desktop | Chromium | 1280×720 | Primary | All specs |
| Desktop | Firefox | 1280×720 | Future | — |
| Desktop | Safari (WebKit) | 1280×720 | Future | — |
| Tablet | Safari iPad | 768×1024 | — | mobile-audit |
| Mobile | Chrome Android | 375×812 | — | mobile-audit |
| Mobile | Safari iPhone | 390×844 | — | mobile-audit |

## Mobile Audit Spec (`mobile-audit.spec.ts`)

| Check | Assertion |
|-------|-----------|
| Touch targets | Min 44×44px for all interactive elements |
| Viewport | No horizontal scroll overflow |
| Text readability | Font size ≥ 14px for body text |
| Navigation | Hamburger/drawer accessible, back button works |
| Forms | Inputs properly sized, keyboard doesn't obscure inputs |
| Loading | Skeleton states, no layout shift on mobile |

## PWA Checklist

| Requirement | Status |
|-------------|--------|
| `manifest.json` | Present, icons defined |
| Service worker | Registered (if offline support enabled) |
| Theme color | Configured in `meta` tag |
| Display mode | `standalone` for PWA install |
| Offline fallback | Graceful degradation or offline page |
| Add to homescreen | iOS Safari + Chrome Android tested |

## Tailwind v4 Responsive Utilities

```css
/* Breakpoint conventions */
sm: 640px    /* Mobile landscape */
md: 768px    /* Tablet */
lg: 1024px   /* Desktop */
xl: 1280px   /* Large desktop */
2xl: 1536px  /* Ultra-wide */
```

## Navigation Quality

| Scenario | Expected |
|----------|----------|
| Back button | Returns to previous page, no blank screen |
| Deep link | Route resolved, auth gate applied |
| Refresh | Page reloads to same route |
| Tab switching | State preserved |
| Multi-tab | No race conditions on shared state |

## Performance Budgets (Mobile)

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5 s (3G) |
| Largest Contentful Paint | < 2.5 s (3G) |
| Time to Interactive | < 3.5 s (3G) |
| Total bundle (gzipped) | < 250 KB initial |
