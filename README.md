# AdminMate AI — HR Management Platform for SEA SMEs

AI-powered HR platform covering recruitment, hiring, onboarding, and compliance for Thailand, Vietnam, and Indonesia.

## Tech Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS v4, TypeScript
- **State:** Zustand (auth/UI), TanStack React Query (server state)
- **Router:** React Router v7 (lazy-loaded routes)
- **Icons:** Lucide React
- **Charts:** Recharts
- **PDF:** @react-pdf/renderer
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- **AI:** Google Gemini 2.5 Flash
- **Email:** Resend
- **Chat:** LINE Messaging API, WhatsApp Cloud API
- **Monitoring:** Sentry
- **i18n:** i18next (EN, TH, ID, VI)
- **Deployment:** Vercel (frontend), Supabase (backend)

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Git
- Supabase CLI (optional, for local dev)
- Docker Desktop (optional, for local Supabase)

### Setup

```bash
# 1. Clone
git clone <repo-url>
cd adminmate-ai

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key

# 4. Run dev server
npm run dev
# → http://localhost:5173
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_APP_URL` | Yes | App URL (default: `http://localhost:5173`) |
| `VITE_APP_NAME` | Yes | App name (`AdminMate AI`) |
| `VITE_ENABLE_LINE` | No | Enable LINE integration |
| `VITE_ENABLE_WHATSAPP` | No | Enable WhatsApp integration |
| `VITE_ENABLE_ZALO` | No | Enable Zalo integration |
| `VITE_SENTRY_DSN` | No | Sentry error monitoring DSN |
| `GEMINI_API_KEY` | Yes | Google Gemini API key *(Edge Function secret only)* |
| `LINE_CHANNEL_ACCESS_TOKEN` | No | LINE OA channel token *(secret)* |
| `LINE_CHANNEL_SECRET` | No | LINE OA channel secret *(secret)* |
| `WHATSAPP_API_TOKEN` | No | WhatsApp Cloud API token *(secret)* |
| `WHATSAPP_PHONE_NUMBER_ID` | No | WhatsApp phone number ID *(secret)* |
| `WHATSAPP_VERIFY_TOKEN` | No | WhatsApp webhook verify token *(secret)* |
| `RESEND_API_KEY` | Yes | Resend email API key *(secret)* |
| `CRON_SECRET_KEY` | Yes | Shared secret for cron-triggered functions *(secret)* |

### Database Migration

```bash
# Link to Supabase project
supabase link --project-ref <your-project-ref>

# Push all 28 migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

### Edge Functions

```bash
# Set secrets
supabase secrets set GEMINI_API_KEY=<your-key>
supabase secrets set RESEND_API_KEY=<your-key>
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=<your-token>
supabase secrets set LINE_CHANNEL_SECRET=<your-secret>
supabase secrets set WHATSAPP_API_TOKEN=<your-token>
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<your-id>
supabase secrets set WHATSAPP_VERIFY_TOKEN=<your-token>
supabase secrets set CRON_SECRET_KEY=<random-secret>

# Deploy all functions
supabase functions deploy
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run type-check` | TypeScript type check |
| `npm run test` | Run unit tests (watch mode) |
| `npm run test:ui` | Vitest UI runner |
| `npm run test:coverage` | Test coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright with debug UI |
| `npm run clean` | Remove dist directory |

## Architecture

```
src/
├── App.tsx                    # Root component
├── main.tsx                   # Entry point (Vite + Sentry + QueryClient + i18n)
├── index.css                  # Tailwind v4 + global styles
├── types.ts                   # Shared TypeScript types
├── translations.ts            # Legacy inline translations (EN/TH)
├── vite-env.d.ts              # Vite type declarations
├── components/
│   ├── layout/                # AppLayout, Sidebar, Header, MobileNav, UserMenu
│   ├── auth/                  # Login, Register, ForgotPassword forms
│   ├── dashboard/             # KPI cards, recent activity widgets
│   ├── jobs/                  # Job creation, listing, detail cards
│   ├── candidates/            # Candidate list, detail, CV upload
│   ├── pipeline/              # Kanban board with drag-and-drop
│   ├── interviews/            # Interview scheduler, calendar
│   ├── offers/                # Offer letter builder, PDF generation
│   ├── documents/             # Document tracking, status badges
│   ├── onboarding/            # Checklist, task verifier, AI assistant
│   ├── reports/               # Recharts analytics
│   ├── settings/              # Company profile, account settings
│   ├── compliance/            # PDPA consent, data retention
│   ├── chat/                  # Mate AI chat interface
│   ├── pdf/                   # @react-pdf/renderer templates
│   └── shared/                # DataTable, EmptyState, ErrorBoundary, ConfirmDialog
├── pages/                     # Route-level page components
├── hooks/                     # TanStack Query hooks (useJobs, useCandidates, etc.)
├── services/                  # Supabase API service layer
├── stores/                    # Zustand stores (authStore, uiStore)
├── lib/                       # Config (supabase client, i18n, query-client, sentry)
└── router/                    # React Router v7 config, AuthGuard
```

See [docs/architecture.md](docs/architecture.md) for full architecture overview.

### Route Map

| Route | Page | Auth |
|-------|------|------|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/forgot-password` | ForgotPasswordPage | Public |
| `/setup-company` | CompanySetupPage | Authenticated (no company) |
| `/dashboard` | DashboardPage | Authenticated |
| `/recruitment/jobs` | JobsPage | Authenticated |
| `/recruitment/jobs/:id` | JobDetailPage | Authenticated |
| `/recruitment/candidates` | CandidatesPage | Authenticated |
| `/recruitment/candidates/:id` | CandidateDetailPage | Authenticated |
| `/recruitment/pipeline` | PipelinePage | Authenticated |
| `/recruitment/interviews` | InterviewsPage | Authenticated |
| `/hiring` | HiringPage | Authenticated |
| `/documents` | DocumentsPage | Authenticated |
| `/onboarding` | OnboardingMgmtPage | Authenticated |
| `/chat` | ChatPage | Authenticated |
| `/reports` | ReportsPage | Authenticated |
| `/settings` | SettingsPage | Authenticated |
| `/settings/compliance` | CompliancePage | Authenticated |
| `*` | NotFoundPage | — |

### Testing

See [docs/testing.md](docs/testing.md) for testing strategy.

### Deployment

See [docs/runbook.md](docs/runbook.md) for deployment guide.

### Launch Checklist

See [docs/launch-checklist.md](docs/launch-checklist.md).

### License

Proprietary. All rights reserved.
