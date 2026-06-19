# Technology Stack

**Analysis Date:** 2026-06-19

## Languages

**Primary:**
- **TypeScript 5.8** — strict mode enabled, used throughout the entire `src/` directory
- **React 19.0.1** — modern JSX transform (`react-jsx`), no class components except ErrorBoundary

**Secondary:**
- **CSS** via Tailwind v4 — CSS-based configuration (no `tailwind.config.js`)
- **JSON** for i18n translations — 60 locale files across 5 languages
- **Deno/TypeScript** for Supabase Edge Functions in `supabase/`

## Runtime

**Environment:**
- **Node.js** (^20+ likely) — based on Vite v6 + TypeScript 5.8 requirements
- **Vite v6.2** — dev server at `:5173`, ESNext module target

**Package Manager:**
- **npm** — `package-lock.json` present
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- **React 19** + **React DOM 19** — UI framework
- **React Router v7.1** — client-side routing (classic `createBrowserRouter`, not framework mode)
- **@tanstack/react-query v5.60** — server state management (queries + mutations)
- **Zustand v5** — lightweight client state management
- **Supabase JS v2.46** — backend SDK (auth, database, storage, realtime)
- **Tailwind CSS v4.1** — utility-first CSS via `@tailwindcss/vite` plugin

**Testing:**
- **Vitest v2.1** — test runner
- **@testing-library/react v16** — component testing
- **@testing-library/jest-dom v6** — DOM matchers
- **Playwright v1.49** — E2E testing with `@axe-core/playwright` for accessibility audits

**Build/Dev:**
- **Vite v6.2** — bundler with `@vitejs/plugin-react`
- **ESLint v9** — flat config with `typescript-eslint`
- **Prettier v3.4** — code formatter

**UI Libraries:**
- **Radix UI** — accessible headless primitives (Accordion, Avatar, Dialog, Dropdown, Select, Switch, Tabs, Toast, Tooltip)
- **Framer Motion v12** (via `motion` package) — page animations, staggered lists, scroll reveal
- **Lucide React v0.546** — icon library
- **Recharts v2.15** — charting for reports
- **@react-pdf/renderer v4.1** — PDF document generation (offer letters)

**Form Management:**
- **React Hook Form v7.54** + **@hookform/resolvers v3.9** — forms with Zod schema validation
- **react-dropzone v15** — file uploads
- **Zod v3.24** — currently only used via hookform resolvers; NOT used for API validation

## Key Dependencies

**Critical:**
- `@supabase/supabase-js`: Backend — all data access, auth, storage
- `@tanstack/react-query`: State synchronization — caching, refetching, mutation
- `zustand`: Auth + UI state — lightweight, no boilerplate
- `react-router-dom`: SPA navigation — lazy loading, guards
- `react-hook-form` + `zod`: Form validation — type-safe forms with schema validation

**Infrastructure:**
- `@sentry/react`: Error monitoring (optional — only loads if DSN configured)
- `i18next` + `react-i18next`: Internationalization (5 languages, 12 namespaces)
- `date-fns` + `date-fns-tz`: Date formatting
- `dompurify`: XSS sanitization
- `class-variance-authority`: Installed but NOT used (Button component uses plain object instead)
- `tailwind-merge` + `clsx`: Class merging (`cn()` utility)
- `react-hot-toast`: Toast notifications

## Configuration

**Environment:**
- `.env.local` and `.env.example` present
- Key configs: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_DEMO_MODE`

**Build:**
- `vite.config.ts` — React plugin, Tailwind plugin, path alias, manual chunk splitting
- `tsconfig.json` — strict mode, path aliases, ESNext module

## Platform Requirements

**Development:**
- Node.js ^18+
- npm ^9+
- Supabase local or remote instance
- `.env.local` file with Supabase credentials

**Production:**
- Deployed to **Vercel** (vercel.json present)
- Supabase project (hosted)
- Edge Functions for auth-session, log-client-error
- Sentry DSN optional

---

*Stack analysis: 2026-06-19*
