# Architecture — AdminMate AI

## System Overview

AdminMate AI is a single-page application (SPA) built with React 19 and TypeScript, served by Vite 6, styled with Tailwind CSS v4, and backed by Supabase as the full-stack backend. The core value proposition is AI-assisted HR workflows for small-to-medium enterprises (SMEs) across Thailand, Vietnam, and Indonesia — with Google Gemini 2.5 Flash powering JD generation, resume parsing, AI screening, offer content, and the conversational Mate AI assistant.

### High-Level Data Flow

```
Browser (SPA) ──HTTP──▶ Vercel (static hosting)
    │
    ├── Supabase REST / Realtime (WebSocket) ──▶ Supabase PostgreSQL
    │
    ├── Edge Functions (invoked by client or cron) ──▶ Gemini API
    │                                                 ──▶ Resend Email
    │                                                 ──▶ LINE / WhatsApp
    │
    └── Sentry ──▶ Error telemetry
```

### Key Architectural Decisions

- **Zustand for client state** (auth session, UI sidebar collapsed state, language preference). Zustand is chosen for its minimal boilerplate and direct store manipulation — no reducers, no providers.
- **TanStack React Query for server state** — every Supabase table read goes through a custom hook (`useJobs`, `useCandidates`, etc.) that wraps `useQuery`. Mutations use `useMutation` with `queryClient.invalidateQueries` for cache coherence.
- **Supabase Realtime** subscriptions on the `chat_messages` and `notifications` tables give live updates without polling.
- **Lazy-loaded routes** via `React.lazy()` + `Suspense` keep the initial bundle small. Each page is code-split automatically.
- **i18next** with HTTP backend loads locale JSON files from `/public/locales/{en,th,id,vi}/` on demand. Language detection uses `i18next-browser-languagedetector`.

## Route Map

All protected routes are wrapped by the `AuthGuard` component, which:
1. Checks `authStore.session` — if null, redirects to `/login`.
2. Checks `authStore.company` — if null and route is not `/setup-company`, redirects to `/setup-company`.
3. Renders `ErrorBoundary` around the `AppLayout` to catch rendering errors.

| Route | Component | Lazy? | Description |
|-------|-----------|-------|-------------|
| `/login` | LoginPage | Yes | Email/password + Google OAuth |
| `/register` | RegisterPage | Yes | Company registration |
| `/forgot-password` | ForgotPasswordPage | Yes | Password reset |
| `/setup-company` | CompanySetupPage | Yes | First-time company profile |
| `/` | Redirect → `/dashboard` | — | Root redirect |
| `/dashboard` | DashboardPage | Yes | KPI cards, recent activity |
| `/recruitment/jobs` | JobsPage | Yes | Job list with CRUD |
| `/recruitment/jobs/:id` | JobDetailPage | Yes | Job detail + JD generation |
| `/recruitment/candidates` | CandidatesPage | Yes | Candidate list with filters |
| `/recruitment/candidates/:id` | CandidateDetailPage | Yes | Candidate detail + CV + screening |
| `/recruitment/pipeline` | PipelinePage | Yes | Kanban board (drag-and-drop stages) |
| `/recruitment/interviews` | InterviewsPage | Yes | Interview scheduler |
| `/hiring` | HiringPage | Yes | Offer letters, PDF generation |
| `/documents` | DocumentsPage | Yes | Document tracking table |
| `/onboarding` | OnboardingMgmtPage | Yes | Onboarding checklists |
| `/chat` | ChatPage | Yes | Mate AI assistant |
| `/reports` | ReportsPage | Yes | Analytics charts (Recharts) |
| `/settings` | SettingsPage | Yes | Company & account settings |
| `/settings/compliance` | CompliancePage | Yes | PDPA/data protection |
| `*` | NotFoundPage | Yes | 404 page |

## Component Tree

```
main.tsx
├── Sentry (ErrorBoundary wrapper)
├── QueryClientProvider (TanStack React Query)
├── I18nextProvider (i18next)
└── RouterProvider (React Router v7)
    └── createBrowserRouter()
        ├── /login → LoginPage
        ├── /register → RegisterPage
        ├── /forgot-password → ForgotPasswordPage
        ├── /setup-company → AuthGuard → CompanySetupPage
        ├── /* (catch-all) → NotFoundPage
        └── / (protected) → AuthGuard → ErrorBoundary → AppLayout
            ├── Sidebar
            │   ├── Logo
            │   └── NavItem[] (recursive, supports children)
            ├── Header
            │   ├── Breadcrumb / page title
            │   ├── LanguageSwitcher
            │   ├── NotificationBell (Realtime badge)
            │   └── UserMenu (profile dropdown, logout)
            ├── <Outlet /> (page content)
            │   ├── DashboardPage → KPI Cards, RecentActivity
            │   ├── JobsPage → JobTable, CreateJobDialog
            │   ├── JobDetailPage → JobForm, JdGeneratorView
            │   ├── CandidatesPage → CandidateTable, Filters
            │   ├── CandidateDetailPage → CvViewer, ResumeScreeningView
            │   ├── PipelinePage → KanbanBoard, CandidateCard
            │   ├── InterviewsPage → InterviewCalendar, Slots
            │   ├── HiringPage → OfferBuilder, OfferPdfPreview
            │   ├── DocumentsPage → DocumentDataTable
            │   ├── OnboardingMgmtPage → OnboardingChecklistView
            │   ├── ChatPage → ChatMessages, ChatInput
            │   ├── ReportsPage → ReportCharts (Recharts)
            │   ├── SettingsPage → SettingsForm
            │   └── CompliancePage → PdpaSettings
            ├── MobileNav (bottom tabs, visible < 768px)
            └── Toaster (react-hot-toast)
```

## Data Flow

### React Query Pattern

Every domain entity has a custom hook in `src/hooks/` that encapsulates query and mutation logic:

```
useJobs()           → useQuery('jobs', getJobs)
                   → useMutation(createJob, { onSuccess: invalidate 'jobs' })
                   → useMutation(updateJob, { onSuccess: invalidate ['jobs', id] })
                   → useMutation(deleteJob, { onSuccess: invalidate 'jobs' })
```

These hooks are the **only** way page components access data. No component calls `supabase.from(...)` directly.

### Zustand State Management

| Store | File | Purpose |
|-------|------|---------|
| `authStore` | `src/stores/authStore.ts` | `session`, `user`, `company`, `login()`, `logout()` |
| `uiStore` | `src/stores/uiStore.ts` | `sidebarOpen`, `language`, `toggleSidebar()`, `setLanguage()` |

Zustand stores are persisted via `zustand/middleware` using localStorage for session survival across page reloads.

### Supabase Realtime

```
// Chat messages — live updates as Mate AI responds
supabase.channel('chat-room').on('INSERT', ...).subscribe()

// Notifications — badge count updates in NotificationBell
supabase.channel('notifs').on('INSERT', ...).subscribe()
```

### Service Layer

`src/services/` contains pure functions that call `supabase.from(...)` or `supabase.functions.invoke(...)`. Services never manage UI state — they just return Promises.

| Service | Functions |
|---------|-----------|
| `authService.ts` | `signUp`, `signIn`, `signOut`, `resetPassword` |
| `companyService.ts` | `createCompany`, `getCompany`, `updateCompany` |
| `jobService.ts` | `getJobs`, `createJob`, `updateJob`, `deleteJob` |
| `candidateService.ts` | `getCandidates`, `createCandidate`, `updateCandidate` |
| `applicationService.ts` | `getApplications`, `updateStatus` |
| `interviewService.ts` | `getInterviews`, `scheduleInterview` |
| `offerService.ts` | `getOffers`, `createOffer`, `generateOfferPdf` |
| `documentService.ts` | `getDocuments`, `updateDocumentStatus` |
| `onboardingService.ts` | `getTasks`, `toggleTask`, `getChecklists` |
| `chatService.ts` | `getMessages`, `sendMessage`, `invokeMateAI` |
| `storageService.ts` | `uploadCv`, `getSignedUrl`, `deleteFile` |

## Database Schema

18 tables total across 28 migration files. Every table includes `company_id` for multi-tenant isolation and has corresponding Row-Level Security (RLS) policies.

### Core Tables

| Migration | Table | Purpose |
|-----------|-------|---------|
| `00001` | — | Enable `uuid-ossp`, `pgcrypto` extensions |
| `00002` | `companies` | Company profiles (name, logo, country, currency) |
| `00003` | `user_profiles` | Extended user data linked to `auth.users` |
| `00004` | `jobs` | Job postings with AI-generated descriptions |
| `00005` | `candidates` | Candidate profiles with parsed CV data |
| `00006` | `cv_documents` | Uploaded CV files with AI parse results |
| `00007` | `applications` | Job-candidate join with pipeline stage |
| `00008` | `interviews` | Scheduled interviews with calendar links |
| `00009` | `offers` | Offer letters with PDF generation metadata |
| `00010` | `documents` | Statutory document tracking |
| `00011` | `onboarding` | Employee onboarding checklists and tasks |

### Support Tables

| Migration | Table | Purpose |
|-----------|-------|---------|
| `00012` | `chat_messages` | Mate AI conversation history |
| `00013` | `notifications` | In-app notification queue |
| `00014` | `audit_logs` | Immutable action audit trail |
| `00015` | `chat_platform_connections` | LINE/WhatsApp webhook bindings |
| `00016` | `ai_usage_log` | Gemini API call tracking for quotas |
| `00017` | `rate_limits` | Per-company rate limiting counters |
| `00018` | `subscriptions` | Plan tiers (free, pro, enterprise) |
| `00019` | `pdpa_compliance` | PDPA consent records and deletion requests |

### Infrastructure Migrations

| Migration | Purpose |
|-----------|---------|
| `00020` | RLS helper functions (`get_company_id`, `is_company_member`) |
| `00021` | RLS policies on all 18 tables |
| `00022` | Performance indexes |
| `00023` | Database triggers (updated_at, audit logging) |
| `00024` | Analytics helper functions |
| `00025` | Storage bucket definitions with policies |
| `00026` | Data anonymization function (GDPR/PDPA compliance) |
| `00027` | Fix missing RLS on edge cases |

See `supabase/migrations/` for the complete DDL.

## Edge Functions

12 Edge Functions deployed on Supabase's Deno runtime:

| Function | Trigger | Purpose |
|----------|---------|---------|
| `generate-jd` | Client invoke | Gemini generates job description from role + industry |
| `parse-resume` | Client invoke | Gemini extracts structured data from CV (PDF/DOCX) |
| `screen-resume` | Client invoke | Gemini scores candidate against job requirements |
| `generate-offer-content` | Client invoke | Gemini drafts offer letter content |
| `mate-ai-chat` | Client invoke | Conversational HR assistant (Gemini) |
| `send-email` | Client invoke | Send transactional emails via Resend |
| `send-document-reminders` | Cron job | Scheduled reminders for pending documents |
| `line-webhook` | LINE webhook | Receive and respond to LINE messages |
| `whatsapp-webhook` | WhatsApp webhook | Receive and respond to WhatsApp messages |
| `_shared/` | Internal | Shared utils and message handler (LINE + WhatsApp router) |

### Edge Function Security

- All client-invoked functions verify the JWT via `supabase.auth.getUser()`.
- Cron-triggered functions validate `CRON_SECRET_KEY` from the `Authorization` header.
- Gemini API calls log to `ai_usage_log` for quota tracking.
- Error responses are sanitized — no raw Supabase or Gemini errors are returned to the client.

## Internationalization (i18n)

Four locales with lazy loading:

| Locale | Directory | Files |
|--------|-----------|-------|
| `en` | `public/locales/en/` | `common.json`, `recruitment.json`, `hiring.json`, `documents.json`, `onboarding.json`, `compliance.json` |
| `th` | `public/locales/th/` | Same structure |
| `id` | `public/locales/id/` | Same structure (partial — 5 files) |
| `vi` | `public/locales/vi/` | Same structure (partial — 5 files) |

A legacy `src/translations.ts` also exists with inline EN/TH translations for backward compatibility with earlier components, but the canonical i18n path is through i18next.

## Security & Multi-Tenancy

See [docs/security.md](docs/security.md) for the full security architecture.

In summary:
- **Authentication**: PKCE flow via Supabase Auth, JWTs with auto-refresh, Google OAuth provider.
- **Authorization**: Row-Level Security on every table, enforced by `company_id`. `AuthGuard` component redirects unauthenticated users.
- **Data Isolation**: Every query includes a `company_id` filter in the RLS policy — users never see data from other companies.
- **Secrets**: All sensitive keys (`GEMINI_API_KEY`, `RESEND_API_KEY`, LINE/WhatsApp tokens) are stored in Supabase Vault and injected as Edge Function secrets. Zero secrets in the client bundle.
