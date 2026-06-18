# Phase 1 UI/UX Hardening Report

**Date:** 2026-06-17
**Sprint:** Phase 1 — Production Hardening
**Auditor:** Senior Frontend Architect / UX Engineer / Accessibility QA Lead / Release Engineer

---

## 1. Executive Verdict

| Item | Status |
| ---- | ------ |
| Phase 1 status | **COMPLETE** — All tasks executed, checks passed |
| Safe to continue to Phase 2 | **YES** |
| Main risk remaining | LoginPage 555-line refactor (Phase 2); 603 hardcoded hex values across 20+ files |
| Public launch readiness | **NOT YET** — Phase 2 needed for LoginPage + token canonicalization |
| Paid traffic readiness | **NOT YET** — Same as above |

---

## 2. What Changed

| Task | Files Changed | Impact | Risk |
| ---- | ------------- | ------ | ---- |
| Motion import standardization | 10 files (import path only) | All 14 motion components now use canonical `motion/react` | None — identical API |
| Dead code deletion | 2 files deleted | RippleButton.tsx, PremiumCard.tsx removed (zero imports) | None |
| MobileNav route coverage | 1 file rewritten, 5 i18n files updated | HR: 4 primary + overflow menu. Applicant: 4 primary + overflow menu. All routes accessible. | Low — new component, tested via E2E |
| Color token audit | 0 files changed | Audit document produced | None — read-only |
| LoginPage refactor plan | 0 files changed | Plan document produced | None — read-only |

---

## 3. Motion Import Standardization

| Before | After | Files Changed | Checks |
| ------ | ----- | ------------- | ------ |
| 12 files `framer-motion`, 4 files `motion/react` | **14 files `motion/react`**, 0 files `framer-motion` | 10 files (import path only) | TypeScript: PASS, Build: PASS, E2E: 172/172 PASS |

### Files migrated

| File | Import Before | Import After |
| ---- | ------------- |-------------|
| LoadingState.tsx | `framer-motion` | `motion/react` |
| ChatWidget.tsx | `framer-motion` | `motion/react` |
| UserMenu.tsx | `framer-motion` | `motion/react` |
| ApplicationDrawer.tsx | `framer-motion` | `motion/react` |
| AnimatedPage.tsx | `framer-motion` | `motion/react` |
| ScrollReveal.tsx | `framer-motion` | `motion/react` |
| StaggeredList.tsx | `framer-motion` | `motion/react` |
| AnimatedCounter.tsx | `framer-motion` | `motion/react` |
| GlobalSearch.tsx | `framer-motion` | `motion/react` |
| RequestSignatureModal.tsx | `framer-motion` | `motion/react` |

### Deleted files (zero imports confirmed)

| File | Reason |
| ---- | ------ |
| RippleButton.tsx | Dead code — zero imports across codebase |
| PremiumCard.tsx | Dead code — zero imports across codebase |

---

## 4. MobileNav Route Coverage

| Role | Direct Bottom Nav Items | More Menu Items | Missing Routes |
| ---- | ----------------------- | --------------- | -------------- |
| HR | Dashboard, Jobs, Candidates, Onboarding | Pipeline, Interviews, Hiring, Documents, Reports, Settings, Security, Notifications, PDPA, Audit Log, Import/Export | **NONE** |
| Applicant | Dashboard, Jobs, Applications, Profile | My Tasks | **NONE** |

### Implementation details

- Generated from shared `navItems` in `src/lib/navigation.ts` (same source as Sidebar)
- Role-aware: filters by `profile.role` from auth store
- Primary items selected by path matching against role-specific routes
- Overflow items shown in slide-up dialog with outside-click and Escape key dismiss
- Active state works via `NavLink` `isActive`
- Keyboard accessible: More button has `aria-expanded`, `aria-haspopup="dialog"`
- Screen reader: `aria-label="More navigation"` on dialog, `aria-label="Mobile navigation"` on nav bar

---

## 5. Accessibility Notes

| Area | Status | Evidence |
| ---- | ------ | -------- |
| Role cards keyboard activation | ✅ PASS | `LoginPage.tsx:274` — Enter + Space with `preventDefault()` |
| Hamburger aria-label | ✅ PASS | `Header.tsx:32` — Dynamic open/close label |
| Focus indicators | ✅ PASS | Global `:focus-visible` in `index.css:215-218` |
| `prefers-reduced-motion` | ✅ PASS | CSS media query `index.css:1319` + `MotionConfig reducedMotion="user"` in `main.tsx` |
| MobileNav keyboard access | ✅ PASS | More button: `aria-expanded`, `aria-haspopup`. Menu: Escape key dismisses, outside click dismisses |
| MobileNav screen reader | ✅ PASS | `aria-label="Mobile navigation"` on nav, `aria-label="More navigation"` on dialog |
| Interactive controls not aria-hidden | ✅ PASS | All `aria-hidden` instances are decorative elements |

---

## 6. Color Token Audit

### Existing Token Systems

| System | Location | Status | Usage |
|--------|----------|--------|-------|
| Core Brand Colors | `index.css:14-19` | ✅ Active | `--color-navy`, `--color-accent`, etc. |
| oklch Colors | `index.css:22-28` | ⚠️ UNUSED | `--color-primary-oklch`, etc. — declared but never referenced |
| Background & Surface | `index.css:31-33` | ✅ Active | `--color-bg`, `--color-surface`, `--color-surface-alt` |
| Text Colors | `index.css:36-38` | ✅ Active | `--color-text-primary`, etc. |
| Border Colors | `index.css:41-42` | ✅ Active | `--color-border`, `--color-border-subtle` |
| Semantic Colors | `index.css:45-47` | ✅ Active | `--color-error`, `--color-success`, `--color-warning` |
| Legacy Compat (MD3) | `index.css:50-59` | ✅ Active | `--color-primary`, `--color-on-surface`, etc. |

### Hardcoded Color Debt

| Pattern | Count | Top Files | Risk |
|---------|------:|-----------|------|
| `dark:text-[#hex]` | 443 | OnboardingMgmtPage (52), ReportsPage (51), DocumentsPage (45) | HIGH — dark mode broken if tokens change |
| `dark:border-[#hex]` | 173 | Multiple pages | HIGH — same risk |
| `dark:bg-[#hex]` | ~60 | Multiple pages | HIGH — same risk |
| Inline `style={{ color: '#...' }}` | 28 | LoginPage (all), LoginForm | HIGH — bypasses Tailwind dark mode |
| Tailwind `bg-blue-*`, `text-blue-*` | 7 | Button.tsx, InterviewCard, ApplicantDashboardPage | MEDIUM — not semantic |
| Tailwind `bg-gray-*`, `text-gray-*` | 15+ | Button.tsx, ButtonGroup, HiringPage | MEDIUM — not semantic |
| Tailwind `bg-slate-*` | 5 | LoadingState, DashboardPage | LOW — dark mode variants |

### Top 10 Files by Hardcoded Hex Count

| File | Count | Primary Pattern |
| ---- | ----: | --------------- |
| OnboardingMgmtPage.tsx | 52 | `dark:text-[#...]`, `dark:bg-[#...]` |
| ReportsPage.tsx | 51 | `dark:text-[#...]`, `dark:bg-[#...]` |
| DocumentsPage.tsx | 45 | `dark:text-[#...]`, `dark:bg-[#...]` |
| HiringPage.tsx | 44 | `dark:text-[#...]`, `dark:bg-[#...]` |
| DashboardPage.tsx | 39 | `dark:text-[#...]`, `dark:bg-[#...]` |
| BulkImportPage.tsx | 37 | `dark:text-[#...]`, `dark:bg-[#...]` |
| JobForm.tsx | 33 | `dark:text-[#...]`, `dark:bg-[#...]` |
| DocumentSigningPage.tsx | 28 | `dark:text-[#...]`, `dark:bg-[#...]` |
| ReportScheduler.tsx | 23 | `dark:text-[#...]`, `dark:bg-[#...]` |
| InterviewsPage.tsx | 22 | `dark:text-[#...]`, `dark:bg-[#...]` |

### Canonicalization Recommendation

**Recommended primary system: Semantic CSS custom properties**

Why:
1. Already partially implemented in `index.css` (`--color-primary`, `--color-on-surface`, etc.)
2. Works with both Tailwind (`bg-primary`) and inline styles
3. Dark mode via `.dark` class override (already configured with `@custom-variant dark`)
4. oklch tokens are unused — delete them to reduce confusion
5. Tailwind hardcoded colors (`bg-blue-600`, `text-gray-500`) should migrate to semantic tokens

**Phase 2 implementation strategy:**
1. Add dark mode overrides for all semantic tokens in `index.css`
2. Replace `dark:text-[#hex]` → `dark:text-text-primary` (or appropriate semantic token)
3. Replace `dark:bg-[#hex]` → `dark:bg-surface` (or appropriate semantic token)
4. Replace inline `style={{ color: '#...' }}` → className with semantic token
5. Replace Tailwind hardcoded colors → semantic tokens
6. Delete unused oklch tokens

---

## 7. LoginPage Refactor Plan

### Current State Analysis

| Problem | Evidence | Risk | Refactor Strategy | Acceptance Criteria |
| ------- | -------- | ---- | ----------------- | ------------------- |
| 555 lines of inline styles | `LoginPage.tsx` — every element has `style={{...}}` | HIGH — unmaintainable, no dark mode | Replace with Tailwind classes + CSS variables | Zero inline styles in LoginPage |
| Hardcoded hex colors | `#ffffff`, `#e2e8f0`, `#2563eb`, `#0f172a`, etc. throughout | HIGH — no dark mode support | Use semantic CSS variables (`bg-surface`, `border-border`, `text-primary`) | Zero hardcoded hex in LoginPage |
| JS hover handlers | `onMouseEnter`/`onMouseLeave` on role cards + back button (6 handlers) | MEDIUM — accessibility, performance | Convert to CSS `:hover` classes | Zero JS hover handlers |
| Role content hardcoded | `ROLE_CONTENT` object with 4 languages inline | MEDIUM — violates i18n pattern | Move to i18n JSON files (`login.*` namespace) | All strings via `t()` |
| No dark mode | Entire page is light-only | HIGH — half of users see broken theme | Add `.dark` variants via CSS variables | Works in both light and dark mode |
| Reduced motion not fully guarded | CSS animations (`animate-float1`, `animate-float2`) respect media query, but JS motion doesn't | LOW — already handled by MotionConfig | Verify all animations respect `prefers-reduced-motion` | No animations when reduced motion preferred |
| Role cards use `div[role="button"]` | `LoginPage.tsx:270,368` | LOW — works but not semantic | Convert to `<button>` elements | Semantic HTML, keyboard works |
| AuthLayout mismatch | LoginPage has unique visual design vs Forgot/Reset password pages | LOW — inconsistent brand | Unify visual language in Phase 2 | Consistent auth page design |

### Recommended Refactor Structure

```
LoginPage.tsx (target: ~150 lines)
├── RoleSelectStep
│   ├── Headline (from i18n)
│   ├── RoleCard × 2 (extracted component)
│   │   ├── Icon
│   │   ├── Title (from i18n)
│   │   ├── Description (from i18n)
│   │   ├── Feature list (from i18n)
│   │   └── CTA arrow
│   └── Language switcher
├── LoginFormStep
│   ├── Back button
│   ├── Role badge + heading (from i18n)
│   └── LoginForm component (already exists)
└── Footer
```

### i18n Keys to Add

```json
{
  "login": {
    "select_title": "...",
    "select_sub": "...",
    "hr_title": "...",
    "hr_sub": "...",
    "hr_f1": "...",
    "hr_f2": "...",
    "hr_f3": "...",
    "ap_title": "...",
    "ap_sub": "...",
    "ap_f1": "...",
    "ap_f2": "...",
    "back": "...",
    "signing_as": "...",
    "sign_in": "Sign In"
  }
}
```

### Implementation Phases

| Phase | Task | Est. Lines Changed | Risk |
| ----- | ---- | ------------------ | ---- |
| 2a | Extract role content to i18n | ~100 | Low |
| 2b | Replace inline styles with Tailwind | ~400 | Medium — visual regression risk |
| 2c | Convert JS hover to CSS | ~30 | Low |
| 2d | Add dark mode support | ~50 | Medium — needs manual QA |
| 2e | Convert role cards to `<button>` | ~20 | Low |

---

## 8. Tests / Checks Run

| Command | Result | Notes |
| ------- | ------ | ----- |
| `tsc --noEmit` | **PASS** — 0 errors | After all Phase 1 changes |
| `npx vite build` | **PASS** — 9.42s | 3534 modules, clean |
| `npx playwright test` | **PASS** — 172/172 | Dev server running, all spec files green |
| `npx eslint src/` | **PASS** — 0 errors, 18 warnings | Pre-existing warnings in test files |

---

## 9. Regressions Found

**No confirmed regressions found.**

- Motion import migration: 10 files changed, all API-compatible
- MobileNav rewrite: new component, all routes accessible, E2E passes
- Dead code deletion: zero imports confirmed before deletion

---

## 10. Phase 2 Recommendation

| Priority | Task | Risk | Est. Effort |
| -------- | ---- | ---- | ----------- |
| 1 | LoginPage refactor (i18n + Tailwind + dark mode) | Medium | 2-3 days |
| 2 | Color token canonicalization (dark mode overrides + replace hardcoded hex) | Medium | 3-5 days |
| 3 | Empty state rewrite (contextual copy per page) | Low | 1-2 days |
| 4 | Auth layout unification (LoginPage ↔ Forgot/Reset visual consistency) | Low | 1 day |
| 5 | Mobile chat/FAB polish | Low | 0.5 days |

**Do not start Phase 2 implementation until this report is reviewed and approved.**
