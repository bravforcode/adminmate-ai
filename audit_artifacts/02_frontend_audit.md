# Frontend Audit — AdminMate AI

## Router & Navigation

### ISSUE-RTR-001: No 404 / Not Found handler
The router at `src/router/index.tsx` has no catch-all wildcard route. Any invalid URL renders a blank page with no feedback to the user.

### ISSUE-RTR-002: `/hiring` route is referenced but never defined
`Sidebar.tsx:21` and `MobileNav.tsx:8` reference `/hiring`, and `HiringPage.tsx` exists at `src/pages/hiring/HiringPage.tsx`. However, `src/router/index.tsx` has NO route for `/hiring` and never imports `HiringPage`. Clicking "Hiring" navigates to `/hiring` which hits the non-existent 404 handler, rendering a blank page.

### ISSUE-RTR-003: Recruitment > Interviews missing from sidebar navigation
`src/lib/navigation.ts:10-26` (`navItems`) has no entry for `/recruitment/interviews`. `MobileNav.tsx` also omits it. The route exists at `src/router/index.tsx:79-81` and `InterviewsPage.tsx` is implemented, but it's unreachable via the main navigation. The recruiting section only shows Jobs, Candidates, and Pipeline.

### ISSUE-RTR-004: Dead code — `App.tsx` is an orphaned legacy app
`src/main.tsx` bootstraps the app via `<RouterProvider router={router} />` using `src/router/index.tsx`. However, `src/App.tsx` contains a completely separate, older single-page implementation (233 lines) with mock data, a flat `activePage` state pattern, and page components from `src/components/*View.tsx` files. This entire class of components (DashboardView, PipelineView, JdGeneratorView, ResumeScreeningView, OnboardingManagerView, OnboardingChecklistView, OnboardingAssistantView, CvBuilderView, SettingsView, LoginView, Header, etc.) is dead code, never imported by the actual router-based app.

### ISSUE-RTR-005: AuthGuard `isLoading` persists as `true` after hydration
`authStore.ts:47` initializes `isLoading: true`, but `persist.partialize` at line 62 only saves `user, profile, company`. On page refresh, Zustand hydrates stored auth data but `isLoading` resets to `true`, causing `AuthGuard` to render a spinner indefinitely until the stored data is re-read. This is a race condition that blocks rendering.

### ISSUE-RTR-006: Lazy loading inconsistent between login page and rest of app
Login, Register, ForgotPassword are lazy-loaded at the top level without `AuthGuard`. But `/setup-company` uses `AuthGuard` (with `requireCompany={false}`). If an authenticated user without a company lands directly on `/setup-company`, the flow is correct. However, the parent route at `/` wraps everything in `AuthGuard` — which is correct, but requires `company` check. Fine for now but fragile.

## State Management

### ISSUE-STM-001: Chat messages not persisted
`useChat.ts` uses local `useState` for `messages`, not `useQuery` or any persistence layer. Navigating away from ChatPage (even to another tab and back) loses the entire chat history. The messages ARE saved to Supabase via `chatService.sendMessage()` but are never loaded/rehydrated on page entry.

### ISSUE-STM-002: uiStore `language` conflicts with i18n
`uiStore.ts:20` defaults `language` to `'th'`, but `i18n.ts` uses `LanguageDetector` with `localStorage` detection key `'adminmate-language'`. The `LanguageSwitcher` component syncs both, but on first load they may diverge — especially if `uiStore` is not persisted but i18n localStorage IS set.

### ISSUE-STM-003: Dashboard reports query uses `company?.id` as query key but refetch interval is static
`DashboardPage.tsx:47` uses `refetchInterval: 300_000` (5 min), which is reasonable. But the query key includes `company?.id` — if company changes (e.g., after setup), the query re-fetches correctly via key change. No issue per se, but no optimistic updates are used.

### ISSUE-STM-004: React Query cache invalidation uses literal strings vs constants inconsistently
Some hooks use `KEYS` constants (`useJobs.ts`, `useCandidates.ts`), others use inline string arrays (`useDocuments.ts`, `useOffers.ts`, `useInterviews.ts`, `useOnboarding.ts`). This makes refactoring query keys error-prone.

### ISSUE-STM-005: No React Query DevTools
`@tanstack/react-query` is used but `ReactQueryDevtools` is never mounted. This makes debugging cache states impossible in dev.

## Page-by-Page Review

### DashboardPage (`src/pages/DashboardPage.tsx`)
- **ISSUE-DSH-001**: Hardcoded trend text `"+2 this week"` on line 57 — not real data
- **ISSUE-DSH-002**: Dynamic Tailwind classes `bg-${color}-100` and `text-${color}-600` on lines 14, 15 will NOT work with Tailwind v4 JIT compiler. The full class names must exist at compile time. This breaks all StatCard icon coloring.
- **ISSUE-DSH-003**: StatCard is defined as an inline function component inside DashboardPage, re-created every render. Should be extracted or memoized.
- **ISSUE-DSH-004**: No error state — if the query fails, the user sees `0` for all stats with no error message.
- **ISSUE-DSH-005**: Hardcoded "Loading stats..." text should use i18n.

### LoginPage / RegisterPage (`src/pages/auth/`)
- No significant issues. Form validation via Zod, error handling via toast, redirect works. Password visibility toggle works correctly.
- **ISSUE-AUTH-001**: `RegisterPage` sends user to `/login` after registration success, but the user is not automatically logged in. The registration flow creates the account but the user must login separately — no auto-login after signup.

### ForgotPasswordPage (`src/pages/auth/ForgotPasswordPage.tsx`)
- **ISSUE-FPW-001**: No form validation — uses raw `useState` instead of `react-hook-form` + Zod, inconsistent with LoginForm and RegisterForm.
- **ISSUE-FPW-002**: No loading/disabled state on the submit button during the async call. Users can double-submit.
- **ISSUE-FPW-003**: No client-side email format validation — an invalid email is sent to the server unnecessarily.

### JobsPage (`src/pages/recruitment/JobsPage.tsx`)
- **ISSUE-JOB-001**: No department/status filter — only a text search. Users cannot filter by active/closed/draft status.
- **ISSUE-JOB-002**: No pagination — large job lists will render all at once.
- UI pattern is consistent: search → form toggle → list. Good empty state and loading state coverage.

### JobDetailPage (`src/pages/recruitment/JobDetailPage.tsx`)
- **ISSUE-JDT-001**: `job.responsibilities` and `job.requirements` checked via `.length > 0` — if they are null/undefined from the API, this will crash. Type safety is missing (uses `any`).
- No significant UI issues; back link works.

### PipelinePage (`src/pages/recruitment/PipelinePage.tsx`)
- **ISSUE-PPL-001**: Header text says "Drag candidates between stages" but NO drag-and-drop is implemented. `KanbanBoard.tsx` renders static columns with no DnD library (no `@hello-pangea/dnd`, `react-beautiful-dnd`, etc.). This is misleading UX.
- **ISSUE-PPL-002**: `KanbanBoard.tsx:11` — `useApplications(selectedJobId)` with `enabled: !!jobId`. If `selectedJobId` is empty string, `''` is falsy → `enabled: false`. Correct behavior, but the initial state shows "Select an active job" prompt. Good UX.
- **ISSUE-PPL-003**: `ApplicationCard` component is imported but was never read in this audit — screen for missing imports needed.

### CandidatesPage (`src/pages/recruitment/CandidatesPage.tsx`)
- Well-structured. Has search, loading, empty state, and create form flow.
- **ISSUE-CAN-001**: CandidateForm button has `data-testid="add-candidate"` but the search input has no test ID.
- **ISSUE-CAN-002**: `filtered` may be `undefined` when `candidates` is loading, but the `map` at line 49 is protected by the conditional at line 48. Safe.

### CandidateDetailPage (`src/pages/recruitment/CandidateDetailPage.tsx`)
- **ISSUE-CDL-001**: `company?.id!` non-null assertion on line 40 — if company ID is null/undefined, this crashes with "Cannot read property of undefined".
- **ISSUE-CDL-002**: No loading state for the CV upload/parse operation after upload is triggered.
- **ISSUE-CDL-003**: Back link is hardcoded to `/recruitment/candidates` — doesn't preserve where the user came from (e.g., from pipeline or job detail).

### InterviewsPage (`src/pages/recruitment/InterviewsPage.tsx`)
- **ISSUE-INT-001**: `pastLoading` is destructured but never used (line 10). If past interviews are still loading, no loading indicator is shown.
- **ISSUE-INT-002**: The `selectedAppId` state controls whether `ScheduleInterviewForm` is rendered, but there's no visible trigger to SET `selectedAppId` — no "Schedule Interview" button in the upcoming interviews list.
- **ISSUE-INT-003**: After submitting feedback (`InterviewFeedbackForm`), the past interviews query is not invalidated.

### HiringPage (`src/pages/hiring/HiringPage.tsx`)
- **ISSUE-HIR-001 (CRITICAL)**: This page is NOT in the router (see ISSUE-RTR-002). Users can never access it.
- Code quality is otherwise acceptable: loading/empty states, proper OfferForm integration, PDF download.

### DocumentsPage (`src/pages/DocumentsPage.tsx`)
- **ISSUE-DOC-001**: The status update `<select>` at line 101-109 — selecting the disabled "Update status" option sets `e.target.value` to `''`, which triggers `updateDoc.mutate({ id: doc.id, data: { status: '' } })`. This sends an invalid mutation to Supabase instead of being a no-op.
- **ISSUE-DOC-002**: `handleReminder` uses dynamic `import()` for supabase on every call — inefficient. Already imported at top of file on line 28.
- **ISSUE-DOC-003**: Hardcoded status color classes may not exist in Tailwind config (e.g., `bg-teal-50`, `text-teal-700`). These are not standard Tailwind v4 tokens.
- **ISSUE-DOC-004**: Good empty state. Good search/filter. Good stats cards. Good overdue logic.

### OnboardingMgmtPage (`src/pages/OnboardingMgmtPage.tsx`)
- **ISSUE-ONB-001**: `showTasks` state typed as `any` — should be `typeof checklists[number] | null`.
- **ISSUE-ONB-002**: Modal uses fixed positioning with `bg-black/20` overlay, but clicking the overlay does NOT close the modal. Users must click the X button.
- **ISSUE-ONB-003**: `handleToggleTask` calls both `updateTask.mutateAsync` and `recalc.mutateAsync` sequentially — if the first succeeds but the second fails, the UI shows incorrect progress until next refetch.

### ChatPage (`src/pages/ChatPage.tsx`)
- **ISSUE-CHT-001**: Messages are NOT persisted across navigation (see ISSUE-STM-001).
- **ISSUE-CHT-002**: Hardcoded "Sorry, cannot answer" fallback text in Thai only (line 32 of `useChat.ts`) — not i18n'd.
- **ISSUE-CHT-003**: `ChatInterface.tsx` has a suggestion button click handler that calls `handleSend()` via `setTimeout(fn, 100)`. This is fragile — the `input` state may not have updated yet when `handleSend` fires.
- **ISSUE-CHT-004**: Hardcoded English text for empty state heading, description, suggestions — all should be i18n'd.

### ReportsPage (`src/pages/ReportsPage.tsx`)
- **ISSUE-RPT-001**: "Export CSV" button has no `onClick` handler — purely decorative.
- **ISSUE-RPT-002**: Only pipeline chart is implemented. No time-series data, no hiring velocity, no source attribution, no department breakdown. Very minimal.
- **ISSUE-RPT-003**: No loading state for the chart — while `pipeline` query loads, empty charts render.
- **ISSUE-RPT-004**: `PIPELINE_STAGES` used for chart labels, but `labelKey` is a translation key — the chart shows raw key strings (e.g., `pipeline.applied`) instead of translated labels.

### SettingsPage (`src/pages/settings/SettingsPage.tsx`)
- **ISSUE-SET-001**: `useUpdateOffer` imported on line 6 but never used.
- **ISSUE-SET-002**: Company form schema includes `website_url` but the form has no input field for it.
- **ISSUE-SET-003**: No password change functionality in the "Account" section.

### CompliancePage (`src/pages/settings/CompliancePage.tsx`)
- **ISSUE-CMP-001**: Compliance checklist is entirely static — always shows the same `AlertTriangle` or `CheckCircle` icons regardless of actual DB state. The `consents` query result is never used to determine check status.
- **ISSUE-CMP-002**: Data Retention section is entirely hardcoded static text — not configurable or editable.
- **ISSUE-CMP-003**: `handleDeletion` has no error handling for when the RPC call fails — if `anonymize_candidate_data` fails but the status update succeeds, data is in an inconsistent state.
- **ISSUE-CMP-004**: After approving/rejecting a deletion request, the `deletionRequests` query is not invalidated, so the UI doesn't reflect the change until manual refresh.

### CompanySetupPage (`src/pages/onboarding/CompanySetupPage.tsx`)
- **ISSUE-CST-001**: `useAuthStore.getState().profile!` with non-null assertion on line 49 — crashes if profile is null (e.g., fresh account without profile row).
- **ISSUE-CST-002**: Industry options are hardcoded with inline Thai translations — not i18n'd.
- **ISSUE-CST-003**: No back/cancel button. Users who accidentally land here must complete setup or close the tab.

## Component Quality

### Accessibility (Critical Gap)
- **ISSUE-ACC-001**: Zero `aria-label`, `aria-describedby`, or `role` attributes found across ALL `.tsx` component files. This is a complete accessibility failure. Every interactive element (buttons, inputs, nav links) is unlabeled for screen readers.
- **ISSUE-ACC-002**: Password visibility toggle buttons in LoginForm and RegisterForm have no accessible name.
- **ISSUE-ACC-003**: Sidebar close button (`X` icon) has no accessible name.
- **ISSUE-ACC-004**: No focus management for modals — when InterviewFeedbackForm or OnboardingTasks modals open, focus is not trapped inside.
- **ISSUE-ACC-005**: No skip-to-content link.

### General Component Issues
- **ISSUE-CMPQ-001**: Dynamic Tailwind classes (`bg-${color}-100`, `text-${color}-600`) are used in `DashboardPage.tsx:14-15`. These break with Tailwind v4 JIT because the class names must exist as complete strings at build time.
- **ISSUE-CMPQ-002**: `UserMenu.tsx:34` and `:38` — both "Profile" and "Settings" menu items navigate to `/settings`. There's no dedicated Profile page.
- **ISSUE-CMPQ-003**: `index.css:18-24` uses hardcoded hex colors (`#e2e8f0`) for `.kanban-col` instead of Tailwind color tokens — inconsistent with the design system.
- **ISSUE-CMPQ-004**: No `<title>` changes on page navigation — browser tab always shows default title.
- **ISSUE-CMPQ-005**: `src/translations.ts` contains a third translation system (inline JS object with EN/TH keys) that is completely unused in the router-based app. Dead code alongside `src/types.ts` (which defines types for the old app).

### Import Verification (Spot Check)
- `LoginForm.tsx` — all imports resolved
- `RegisterForm.tsx` — all imports resolved
- `KanbanBoard.tsx` — `useApplications` and `useJobs` correct
- `CVUploader.tsx` — all imports correct
- `PDFDownloadButton.tsx` — `@react-pdf/renderer` imported, component exists in `package.json` dependencies
- `ScheduleInterviewForm.tsx` — all imports correct
- `InterviewFeedbackForm.tsx` — all imports correct

## i18n Coverage

### Translation Files Matrix

| Locale | common.json | recruitment.json | hiring.json | onboarding.json | documents.json | compliance.json |
|--------|-------------|------------------|-------------|-----------------|----------------|-----------------|
| **en** | Present | Present | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| **th** | Present | Present | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| **vi** | Present | **MISSING** | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| **id** | Present | **MISSING** | **MISSING** | **MISSING** | **MISSING** | **MISSING** |

### i18n Configuration (`src/lib/i18n.ts:13`)
Declares namespaces: `['common', 'recruitment', 'hiring', 'onboarding', 'documents', 'compliance']`

**4 out of 6 namespaces have ZERO translation files** (hiring, onboarding, documents, compliance). Any component calling `useTranslation('hiring')` etc. will fall back to showing raw key strings.

### Missing `recruitment.json` for VI and ID
Vietnamese and Indonesian users will see raw keys like `jobs.title`, `jobs.create_first` instead of translated text on Recruitment pages.

### Missing keys in VI and ID `common.json`
VI and ID translations are notably incomplete compared to EN/TH:
- `auth` section is missing: `create_account_subtitle`, `forgot_password_subtitle`
- `common` section is missing: `all`, `active`, `inactive`, `total`, `name`, `email`, `phone`

### Hardcoded English Text (Should Use i18n)
Pages with un-localized text:
| Page | Location | Text |
|------|----------|------|
| DashboardPage | `:53` | "Welcome, User." |
| DashboardPage | `:54` | "Here is your recruitment overview for today." |
| DashboardPage | `:62` | "Loading stats..." |
| ChatPage | `:7` | "Mate AI Assistant" |
| ChatPage | `:8` | "Ask questions about company policies..." |
| ChatInterface | `:32-33` | "Mate AI Assistant", "Ask me anything..." |
| ChatInterface | `:61` | Placeholder text |
| ChatInterface | `:5-10` | All suggestion strings |
| DocumentsPage | `:38` | "Track and manage employment documents..." |
| DocumentsPage | `:43-52` | All stat card labels: "Total Documents", "Pending Action", "Overdue" |
| DocumentsPage | `:103` | "Update status" |
| DocumentsPage | `:117` | "No documents found" |
| InterviewsPage | `:18-19` | "Interviews", subtitle |
| InterviewsPage | `:23-24` | "Upcoming", "Past" tabs |
| InterviewsPage | `:43` | "No upcoming interviews" |
| InterviewsPage | `:66` | "No past interviews" |
| OnboardingMgmtPage | `:32-33` | "Onboarding", subtitle |
| OnboardingMgmtPage | `:57` | "View Tasks" |
| OnboardingMgmtPage | `:65` | "Accepted Offers", empty state |
| PipelinePage | `:10` | "Drag candidates between stages..." |
| HiringPage | `:21-23` | "Hiring & Offers", subtitle |
| SettingsPage | `:37-38` | "Settings" title, subtitle |
| CompliancePage | `:62-63` | "Compliance" title, subtitle |
| CandidateDetailPage | `:39` | "Upload CV" heading |
| CandidateDetailPage | `:44` | "Parsed CV Data" heading |
| JobDetailPage | various | "Description", "Responsibilities", "Requirements", "Required Skills", "Deadline:" |
| ReportsPage | `:28-29` | "Analytics & Reports", subtitle |
| ReportsPage | `:38` | "Hiring Pipeline" |
| ReportsPage | `:49` | "Pipeline Distribution" |
| ForgotPasswordPage | `:38` | Email input label |
| ForgotPasswordPage | `:40-41` | Submit, back link |
| LoginForm | `:42` | Email placeholder "you@company.com" |
| LoginForm | `:51` | Password placeholder |
| RegisterForm | `:45` | Name placeholder "Somchai Jaidee" |
| RegisterForm | `:53` | Email placeholder |

## Accessibility & UX

### Color Contrast
- **Past interviews have `opacity-70`** on the entire card (`InterviewsPage.tsx:68`) — this includes body text which will fail WCAG AA contrast requirements.
- **OnboardingMgmtPage modal overlay** uses `bg-black/20` — very light overlay that may not sufficiently dim background content, reducing modal focus.

### Responsive Layout
- Mobile nav bar at bottom (`MobileNav.tsx`) — good pattern for mobile. However, it only includes 5 items (Dashboard, Recruitment, Hiring, Onboarding, Chat), excluding Settings, Reports, Pipeline, and Interviews.
- Sidebar slides in/out on mobile via `translate-x` transition — works correctly with overlay backdrop.
- `AppLayout` wraps everything in `md:ml-[260px]` — correct offset on desktop.

### Form Label Check
- All `<form>` inputs in LoginForm, RegisterForm, CompanySetupPage, SettingsPage, ScheduleInterviewForm have associated `<label>` elements. Good.
- Search inputs on DocumentsPage, CandidatesPage, JobsPage use `placeholder` text but lack visual labels — debatable for search bars but not a critical violation.
- Password visibility toggle buttons lack labels (see ISSUE-ACC-002).

### Missing Features By Page
| Page | Missing Feature |
|------|----------------|
| Dashboard | Real-time stat updates (only polls every 5 min) |
| Pipeline | Drag-and-drop (advertised but not implemented) |
| Interviews | "Schedule Interview" trigger button |
| Reports | Export CSV functionality, time-series charts |
| Chat | Message persistence, session history loader |
| Settings | Password change, notification preferences |
| Compliance | Dynamic compliance check (DB-driven, not hardcoded) |
| Documents | Document creation/upload form |

---

## Critical Issues

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| ISSUE-RTR-002 | **CRITICAL** | `src/router/index.tsx` + `src/lib/navigation.ts` | `/hiring` route missing — HiringPage is unreachable |
| ISSUE-RTR-003 | **CRITICAL** | `src/lib/navigation.ts` | `/recruitment/interviews` missing from sidebar — InterviewsPage is unreachable via nav |
| ISSUE-RTR-005 | **CRITICAL** | `src/stores/authStore.ts:47` | `isLoading: true` persists after hydration, AuthGuard hangs on refresh |
| ISSUE-DSH-002 | **CRITICAL** | `src/pages/DashboardPage.tsx:14-15` | Dynamic Tailwind classes don't work with JIT — statcard icons have no colors |
| ISSUE-I18N-001 | **CRITICAL** | `public/locales/` | 4 of 6 declared i18n namespaces have ZERO translation files (hiring, onboarding, documents, compliance) |
| ISSUE-I18N-002 | **CRITICAL** | `public/locales/vi/`, `public/locales/id/` | Missing `recruitment.json` for VI and ID locales |
| ISSUE-ACC-001 | **CRITICAL** | All `.tsx` files | Zero ARIA attributes — complete accessibility failure |

## Medium Issues

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| ISSUE-RTR-001 | MEDIUM | `src/router/index.tsx` | No 404 catch-all route |
| ISSUE-RTR-004 | MEDIUM | `src/App.tsx` + legacy components | ~2000 lines of dead code (old mock-data App + View components) |
| ISSUE-STM-001 | MEDIUM | `src/hooks/useChat.ts` | Chat messages lost on navigation |
| ISSUE-STM-002 | MEDIUM | `src/stores/uiStore.ts` | uiStore language defaults to 'th' but i18n detector may pick 'en' |
| ISSUE-JOB-001 | MEDIUM | `src/pages/recruitment/JobsPage.tsx` | No department/status filter, no pagination |
| ISSUE-PPL-001 | MEDIUM | `src/pages/recruitment/PipelinePage.tsx` | Drag-and-drop advertised but not implemented |
| ISSUE-DOC-001 | MEDIUM | `src/pages/DocumentsPage.tsx:101` | Status dropdown triggers mutation on empty option selection |
| ISSUE-ONB-003 | MEDIUM | `src/pages/OnboardingMgmtPage.tsx:25-26` | Task toggle and progress recalc not atomic |
| ISSUE-RPT-001 | MEDIUM | `src/pages/ReportsPage.tsx:31` | Export CSV button has no click handler |
| ISSUE-RPT-004 | MEDIUM | `src/pages/ReportsPage.tsx:40` | Chart labels show raw translation keys not translated text |
| ISSUE-CMP-001 | MEDIUM | `src/pages/settings/CompliancePage.tsx` | Compliance checklist is fake (static, not DB-driven) |
| ISSUE-CHT-003 | MEDIUM | `src/components/chat/ChatInterface.tsx:36` | Fragile setTimeout for suggestion click |
| ISSUE-CMPQ-001 | MEDIUM | `src/pages/DashboardPage.tsx:14-15` | Dynamic Tailwind classes break JIT |
| ISSUE-CD-001 | MEDIUM | `src/pages/recruitment/CandidateDetailPage.tsx:40` | Non-null assertion on company?.id! may crash |
| ISSUE-CST-001 | MEDIUM | `src/pages/onboarding/CompanySetupPage.tsx:49` | Non-null assertion on profile! may crash on fresh accounts |
| ISSUE-SET-001 | MEDIUM | `src/pages/settings/SettingsPage.tsx:6` | Unused `useUpdateOffer` import |
| ISSUE-CMPQ-002 | MEDIUM | `src/components/layout/UserMenu.tsx:34,38` | Both Profile and Settings link to /settings |
| ISSUE-INT-002 | MEDIUM | `src/pages/recruitment/InterviewsPage.tsx` | No "Schedule Interview" trigger visible in upcoming list |
| ISSUE-CHT-002 | MEDIUM | `src/hooks/useChat.ts:32` | Fallback AI response text only in Thai |
| ISSUE-CST-003 | MEDIUM | `src/pages/onboarding/CompanySetupPage.tsx` | No back/cancel button on company setup |
| ISSUE-CMP-003 | MEDIUM | `src/pages/settings/CompliancePage.tsx:53-57` | No error handling for sequential DB operations in deletion handler |

## Low Issues

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| LOW-001 | LOW | Multiple pages | Extensive hardcoded English text (see i18n section table) |
| LOW-002 | LOW | `src/pages/auth/ForgotPasswordPage.tsx` | No loading state, no form validation |
| LOW-003 | LOW | `src/pages/recruitment/InterviewsPage.tsx:10` | `pastLoading` destructured but unused |
| LOW-004 | LOW | `src/components/CvBuilderView.tsx` + all View components | Dead code (~12 files) from legacy App.tsx |
| LOW-005 | LOW | `src/translations.ts` + `src/types.ts` | Dead code from legacy inline i18n system |
| LOW-006 | LOW | `src/index.css:18-24` | Hardcoded hex colors for `.kanban-col` should use Tailwind tokens |
| LOW-007 | LOW | `src/pages/DashboardPage.tsx:57` | Hardcoded "+2 this week" trend text |
| LOW-008 | LOW | `src/components/chat/ChatInterface.tsx:61` | Suggestion button uses setTimeout as workaround for state timing |
| LOW-009 | LOW | `src/pages/OnboardingMgmtPage.tsx:83` | Modal overlay click does not close modal |
| LOW-010 | LOW | `src/pages/auth/RegisterPage.tsx` | No auto-login after registration — user must login separately |
| LOW-011 | LOW | `public/locales/vi/common.json`, `public/locales/id/common.json` | Missing common translation keys vs EN/TH (all, active, inactive, total, name, email, phone) |

---

## Summary

| Category | Score | Notes |
|----------|-------|-------|
| Route completeness | 4/10 | 2 critical routes missing/unreachable, no 404 |
| State management | 5/10 | Auth hydration bug, no chat persistence |
| Page completeness | 5/10 | Most pages have loading/empty/error states but many hardcoded text |
| Component quality | 4/10 | Zero ARIA, dynamic Tailwind classes broken |
| i18n coverage | 2/10 | 4 namespaces missing entirely, 2 locales missing recruitment |
| Accessibility | 1/10 | No ARIA attributes anywhere, no focus management |
| Performance | 6/10 | Lazy loading on all routes, reasonable cache configs |
| **Overall** | **3.9/10** | |

### Top 3 Fix Priorities
1. Fix auth hydration bug (`isLoading: true` after refresh) — blocks app
2. Add missing `/hiring` route and sidebar entry for interviews
3. Add missing translation namespace files (hiring, onboarding, documents, compliance)
