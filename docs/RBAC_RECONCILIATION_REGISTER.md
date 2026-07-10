# RBAC Reconciliation Register

Phase 0.1 deliverable of the enterprise redesign/hardening mega plan. This register
supersedes prior audit documents for RBAC-specific findings: every entry below was
verified against live code in this repo, not inferred from a report. New findings go
here as they're confirmed; nothing is scheduled as a fix on citation alone.

## Status legend
- **Confirmed** — reproduced by reading the actual code path.
- **Fixed** — confirmed, then remediated in this pass.
- **Deferred** — confirmed real, but the correct fix needs a decision or broader change than this pass covers.
- **Refuted** — investigated, did not hold up.

---

## 1. `/portal/*` RBAC lockout — **Fixed**
Employee self-service routes (`/portal`, `/portal/profile`, `/portal/time-off`,
`/portal/payslips`) were gated `requiredRoles={HR_ROLES}`, locking out every
`employee`-role user from their own portal. Fixed by removing `requiredRoles` from
those four routes in `src/router/index.tsx` — any authenticated user can now reach
them. Verified via `npx tsc --noEmit -p .` and a full re-read of the route table.

## 2. `getDefaultRoute()` redirect loop — **Fixed**
`src/lib/navigation.ts`'s `getDefaultRoute()` previously always returned `/dashboard`
regardless of role, which combined with finding #1 produced a redirect loop for
non-HR users. Fixed to return `/portal` for any role not in `HR_ROLES`, `/dashboard`
otherwise.

## 3. Two independently-defined `HR_ROLES` constants — **Fixed**
`src/router/index.tsx:92` and `src/lib/navigation.ts:40` each defined their own
`HR_ROLES = ['admin', 'hr', 'manager']` array, with no shared source of truth —
any future edit to one without the other would silently desync route guards from
nav visibility. Fixed by exporting `HR_ROLES` from `navigation.ts` and importing it
in `router/index.tsx` instead of redefining it. Verified via `npx tsc --noEmit -p .`.

## 4. `/settings/compliance` nav/route mismatch — **Fixed**
Route guard (`router/index.tsx`) requires `requiredRoles={['admin']}` for
`/settings/compliance`, but the nav entry (`navigation.ts`) showed the link to the
full `HR_ROLES` set (`admin`, `hr`, `manager`). An `hr` or `manager` user would see
"Compliance" in the settings menu, click it, and get silently bounced back to
`/dashboard` by `AuthGuard` — a broken affordance, though not a security hole (the
route enforcement itself was already correctly admin-only). Fixed by narrowing the
nav entry's `roles` to `['admin']` to match the enforced route, rather than loosening
the route — compliance/legal data is a plausible deliberate admin-only boundary, and
expanding access is a security decision that shouldn't be made silently as a side
effect of a nav-consistency fix.

`/settings/audit-log`'s narrower `['admin', 'hr']` gate was checked against the same
pattern and found consistent between router and nav — no action needed there.

## 5. Router bypasses `permissionService.ts` (RBAC RPC layer) — **Deferred**
`AuthGuard.tsx` does a pure client-side string compare of `profile?.role` (the
legacy `user_profiles.role` column) against a `requiredRoles` prop. It never calls
the DB-backed `hasPermission`/`hasRole`/`hasAnyRole` RPCs in
`src/services/permissionService.ts`, even though those RPCs are the intended
source of truth for the modern RBAC system (`user_roles`/`roles`/`role_permissions`)
and are already called from 41 service-layer files.

**Why this isn't a live bug today:** `hasPermission`'s resource/action check (the
dominant call pattern in the 41 service files) resolves correctly via its legacy
fallback path (see finding #6) regardless of this gap, because service-layer calls
happen independently of route guarding. The router's own legacy-string compare
happens to already agree with the fallback path's mapping for `admin` and `employee`.

**Why it's deferred rather than fixed now:** naively wiring `AuthGuard` to
`hasAnyRole(HR_ROLES)` using the existing legacy-named `HR_ROLES` array
(`['admin', 'hr', 'manager']`) would be a regression, not a fix. `hasAnyRole`'s
fallback path (see `20240620000007_rbac_legacy_fallback.sql`) resolves
`user_profiles.role` through `map_legacy_role()` to modern role names
(`hr` → `hr_manager`, `manager` → `department_head`) before comparing — so an
`hr`-role or `manager`-role user's mapped name would never match the literal
strings `'hr'`/`'manager'` in `HR_ROLES`, silently locking them out of every
HR-facing route.

**Correct fix path (not yet implemented):** resolve role names once via
`user_role_names()` (which already applies the correct legacy-fallback + mapping)
and cache the *mapped* names in `authStore`, then compare against modern role
names — not wire raw legacy strings into the RPC-based checks. This requires
deciding the modern role taxonomy the router should gate on, which is broader than
a mechanical fix and belongs in its own pass.

## 6. `migrate_legacy_roles()` vs `map_legacy_role()` `'manager'` mapping drift — **Deferred**
Two migration-defined functions disagree on where legacy `'manager'` maps in the
modern RBAC system:
- `migrate_legacy_roles()` (`20240620000004_permission_helpers.sql`, one-time
  per-company backfill, never invoked by any application code per grep) maps
  `manager` → `manager`.
- `map_legacy_role()` (`20240620000007_rbac_legacy_fallback.sql`, the live fallback
  path used by every `has_role`/`has_permission`/`has_any_role`/`user_role_names`
  call today) maps `manager` → `department_head`.

Since `migrate_legacy_roles()` has no caller, `user_roles` is almost certainly
empty in production, meaning `map_legacy_role()`'s mapping (`department_head`) is
what's actually authoritative today. The drift is latent, not live — but it means
running `migrate_legacy_roles()` for a company today would silently diverge from
the fallback's own mapping for that same company's managers. Needs a decision on
which mapping is canonical before `migrate_legacy_roles()` is ever safely invoked.

## 7. `authStore.isAdminOrHR()` excludes `manager` — **Confirmed, unresolved**
`src/stores/authStore.ts:176` defines `isAdminOrHR: () => ['admin', 'hr'].includes(...)`
— narrower than the router/nav `HR_ROLES` set (`admin`, `hr`, `manager`). Used in
`useCandidatesWithApplications.ts`, `useEmployees.ts`, `useCandidates.ts`, and
`Header.tsx` to gate UI behavior within pages a `manager` can otherwise fully
navigate to (since `HR_ROLES` admits them at the route level).

Not fixed in this pass: this may be intentional (a `manager`/`department_head` is
plausibly meant to see a scoped view of employee/candidate data even though they
can reach the page), or it may be an oversight. Needs a product decision on
whether managers are supposed to get HR-caliber list views in these specific hooks
before changing behavior either way.

## 8. `useSessionRestore.ts` httpOnly-cookie fallback is dead code — **Confirmed, not yet fixed**
See Task 0.3a. `refreshAccessToken()` (`sessionApi.ts:46`) is defined but never
called from production code — the cross-device/cleared-storage session restore
path silently no-ops. Tracked as a separate task, not duplicated here.

## 9. `AuthGuard` `initSession` missing effect dependency — **Confirmed, not yet fixed**
See Task 0.3b. `AuthGuard.tsx:30-32`'s `useEffect` omits `initSession` from its
dependency array, unlike the correctly-written analogous effect in
`CompanySetupGuard` (lines 78-80). Tracked as a separate task.

---

## Route audit summary (`src/router/index.tsx`, full read)

All ~44 authenticated routes were checked against `HR_ROLES`. Results:
- ~40 HR-facing routes use `requiredRoles={HR_ROLES}` uniformly.
- `/settings/compliance` → `requiredRoles={['admin']}` — narrower, now confirmed
  intentional and nav-consistent (finding #4).
- `/settings/audit-log` → `requiredRoles={['admin', 'hr']}` — narrower, already
  nav-consistent, no action needed.
- `/documents/sign/:id` → uniquely combines `requiredRoles={HR_ROLES}` with
  `requireCompany={false}`. Not yet investigated further; presumed intentional
  (e-signature flow may need to be reachable before full company context loads).
  Flagged here so it isn't lost, not yet resolved.
- The four `/portal/*` routes → no `requiredRoles` (finding #1, fixed).

No other anomalies found among the authenticated routes.
