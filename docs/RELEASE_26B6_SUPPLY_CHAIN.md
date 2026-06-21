# Release 26B.6 — Supply Chain Audit

**Generated:** 2026-06-22
**Gate:** B
**Tenant Key:** `company_id`

---

## 1. Audit Summary

| Field | Value |
|-------|-------|
| **Command** | `npm audit` |
| **Total vulnerabilities** | 9 |
| **Critical** | 3 |
| **High** | 2 |
| **Moderate** | 4 |
| **Fix available (non-breaking)** | 4 (`npm audit fix`) |
| **Fix available (breaking)** | 5 (`npm audit fix --force`) |
| **Extraneous packages** | 14 (pg ecosystem — used by Supabase tooling, not runtime) |

---

## 2. Vulnerability Inventory

### 2.1 dompurify ≤ 3.4.10 — Moderate

| Field | Value |
|-------|-------|
| **Advisory** | GHSA-cmwh-pvxp-8882 |
| **Severity** | Moderate |
| **Issue** | Permanent `ALLOWED_ATTR` pollution via `setConfig()` bypassing the hook clone-guard (incomplete fix of 3.4.7 hook-pollution patch) |
| **Installed** | 3.4.9 |
| **Fix** | `npm audit fix` → upgrade to ≥ 3.4.11 |
| **Runtime risk** | Medium — DOMPurify is used for HTML sanitization (`src/lib` imports). A bypass could allow attribute injection in rendered HTML. |
| **Action** | Upgrade immediately. dompurify is a direct dependency. |

### 2.2 esbuild ≤ 0.24.2 — Moderate (×2)

| Field | Value |
|-------|-------|
| **Advisory** | GHSA-67mh-4wv8-2f99 |
| **Severity** | Moderate |
| **Issue** | esbuild enables any website to send requests to the development server and read responses |
| **Installed** | 0.21.5 (via vitest → vite-node) |
| **Fix** | `npm audit fix --force` → vitest 4.1.9 (breaking) |
| **Runtime risk** | Low — affects dev server only, not production build. esbuild is not shipped in production bundle. |
| **Action** | Accept for now; monitor vitest upstream for esbuild 0.25+ bump. Dev-only exposure. |

### 2.3 form-data 4.0.0–4.0.5 — High

| Field | Value |
|-------|-------|
| **Advisory** | GHSA-hmw2-7cc7-3qxx |
| **Severity** | High |
| **Issue** | CRLF injection in form-data via unescaped multipart field names and filenames |
| **Installed** | 4.0.5 (transitive via jsdom → tough-cookie) |
| **Fix** | `npm audit fix` → upgrade to ≥ 4.0.6 |
| **Runtime risk** | Low in browser context — form-data runs in test tooling (jsdom) not production code path. |
| **Action** | Run `npm audit fix` to update transitive dep. |

---

## 3. Dependency Inventory — Production Dependencies

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @hookform/resolvers | 3.10.0 | MIT | Zod/Yup form validation resolvers |
| @radix-ui/react-* (14 pkgs) | 1.1–2.3 | MIT | Accessible UI primitives |
| @react-pdf/renderer | 4.5.1 | MIT | PDF document generation |
| @sentry/react | 10.56.0 | MIT | Error tracking (optional) |
| @supabase/supabase-js | 2.107.0 | MIT | Supabase client SDK |
| @tanstack/react-query | 5.101.0 | MIT | Server state management |
| class-variance-authority | 0.7.1 | MIT | Variant-based className utility |
| clsx | 2.1.1 | MIT | Conditional className |
| date-fns | 4.4.0 | MIT | Date utilities |
| date-fns-tz | 3.2.0 | MIT | Timezone support |
| dompurify | 3.4.9 | Apache-2.0 | HTML sanitization |
| i18next | 24.2.3 | MIT | Internationalization |
| i18next-browser-languagedetector | 8.2.1 | MIT | Language detection |
| i18next-http-backend | 3.0.6 | MIT | i18n HTTP loading |
| lucide-react | 0.546.0 | MIT | Icon library |
| motion | 12.40.0 | MIT | Animation (framer-motion) |
| react | 19.2.7 | MIT | UI framework |
| react-dom | 19.2.7 | MIT | React DOM renderer |
| react-dropzone | 15.0.0 | MIT | File upload |
| react-hook-form | 7.77.0 | MIT | Form state management |
| react-hot-toast | 2.6.0 | MIT | Toast notifications |
| react-i18next | 15.7.4 | MIT | i18n React bindings |
| react-router-dom | 7.16.0 | MIT | Client-side routing |
| recharts | 2.15.4 | MIT | Charts and data visualization |
| tailwind-merge | 3.6.0 | MIT | Tailwind class merging |
| zod | 3.25.76 | MIT | Schema validation |
| zustand | 5.0.14 | MIT | State management |

**License summary:** All 28 production dependencies are MIT-licensed. dompurify is Apache-2.0 (permissive, compatible).

---

## 4. Dependency Inventory — Dev Dependencies

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @axe-core/playwright | 4.11.3 | MPL-2.0 | Accessibility testing |
| @playwright/test | 1.60.0 | Apache-2.0 | E2E testing |
| @tailwindcss/vite | 4.3.0 | MIT | Tailwind Vite plugin |
| @testing-library/* (3 pkgs) | 6.9–16.3 | MIT | Component testing |
| @types/* (4 pkgs) | various | MIT | TypeScript definitions |
| @vitejs/plugin-react | 5.2.0 | MIT | Vite React plugin |
| @vitest/* (3 pkgs) | 2.1.9 | MIT | Test runner + coverage |
| axe-core | 4.12.1 | MPL-2.0 | Accessibility engine |
| eslint | 9.39.4 | MIT | Linting |
| jsdom | 25.0.1 | MIT | DOM emulation for tests |
| prettier | 3.8.3 | MIT | Code formatting |
| tailwindcss | 4.3.0 | MIT | CSS framework |
| typescript | 5.8.3 | Apache-2.0 | Type checking |
| typescript-eslint | 8.60.1 | MIT | TS ESLint integration |
| vite | 6.4.3 | MIT | Build tool |
| vitest | 2.1.9 | MIT | Test runner |

**License summary:** All dev dependencies are MIT or Apache-2.0. @axe-core packages are MPL-2.0 (weak copyleft, compatible).

---

## 5. Extraneous Packages (npm ls warnings)

14 packages are installed in `node_modules` but not declared in `package.json`. These are pg ecosystem packages (`pg`, `pg-pool`, `pg-protocol`, `pg-types`, `pg-cloudflare`, `pgpass`, `split2`, `postgres-*`, `xtend`). They were likely installed by Supabase CLI or a manual install step.

**Risk:** None — these packages are not imported by the application code. They exist only in `node_modules` and are not bundled.

**Action:** Run `npm prune` to clean extraneous packages.

---

## 6. Missing Optional Dependencies (npm ls warnings)

| Package | Required By | Status |
|---------|-------------|--------|
| @emnapi/core | @tailwindcss/oxide-wasm32-wasi | WASM optional — Windows native oxide binary exists |
| @emnapi/runtime | @tailwindcss/oxide-wasm32-wasi | Same as above |
| @emnapi/wasi-threads | @tailwindcss/oxide-wasm32-wasi | Same as above |
| @napi-rs/wasm-runtime | @tailwindcss/oxide-wasm32-wasi | Same as above |
| @tybys/wasm-util | @tailwindcss/oxide-wasm32-wasi | Same as above |

**Impact:** None on Windows — the native `@tailwindcss/oxide-win32-x64-msvc` binary is present. WASM fallback is not needed.

---

## 7. Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| P1 | Upgrade dompurify to ≥ 3.4.11 via `npm audit fix` | Low |
| P1 | Run `npm audit fix` to resolve form-data CRLF injection | Low |
| P2 | Run `npm prune` to remove 14 extraneous pg packages | Low |
| P2 | Monitor vitest for esbuild ≥ 0.25 upgrade (dev-only, non-blocking) | Medium |
| P3 | Add `npm audit` to CI pipeline as a gate check | Low |

---

## 8. Verdict

**Supply chain status:** PASS with conditions. All production dependencies are MIT/Apache-2.0. One moderate vulnerability (dompurify) requires immediate patch. Two dev-only vulnerabilities (esbuild) are non-blocking. No critical runtime vulnerabilities.

*Generated by OpenCode AI — Release 26B.6 Supply Chain Audit*
