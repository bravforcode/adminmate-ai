# AdminMate AI — Design-to-Code Mapping Document

> **Bridge Agent Output** | Generated: 2026-06-03  
> **Scope:** Map 6 reference design files to current codebase, identify gaps, propose treatments.

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| Reference design screens | 6 |
| Current app pages | 22 |
| Pages with design reference | 6 |
| **Design gaps (no reference)** | **16** |
| Icon library conflict | Material Symbols → Lucide React |

**Recommendation:** Keep **Lucide React** for consistency and bundle size. Map Material Symbols names to Lucide equivalents. Adopt the Corporate Blue design system tokens already present in the codebase, aligned with the reference palette.

---

## 2. Design System Comparison

### 2.1 Color Palette — Already Aligned ✅

The current codebase already uses Tailwind v4 semantic tokens that closely match the reference Corporate Blue system:

| Reference Token | Current Token | Hex | Status |
|-----------------|---------------|-----|--------|
| `primary` | `primary` | `#003d9b` | ✅ Match |
| `surface` | `surface` | `#faf9ff` | ✅ Match |
| `background` | `background` | `#faf9ff` | ✅ Match |
| `app-background` | *(missing)* | `#E6F0FF` | ⚠️ Add to `@theme` |
| `on-surface` | `on-surface` | `#051a3e` | ✅ Match |
| `surface-container-low` | `surface-container-low` | `#f1f3ff` | ✅ Match |
| `surface-container-high` | `surface-container-high` | `#e1e8ff` | ✅ Match |
| `outline-variant` | `outline-variant` | `#c3c6d6` | ✅ Match |
| `error` | `error` | `#ba1a1a` | ✅ Match |
| `secondary` | `secondary` | `#455e91` | ✅ Match |

**Action:** Add `--color-app-background: #E6F0FF` to `src/index.css` `@theme` block to enable the sky-blue canvas used in reference designs.

### 2.2 Typography

| Reference | Current | Status |
|-----------|---------|--------|
| Inter (primary) | Inter ✅ | Match |
| IBM Plex Sans (labels/meta) | Noto Sans Thai (i18n fallback) | ⚠️ Partial |
| `display-lg` 48/700 | Custom class `.text-2xl` | ⚠️ Semantic gap |
| `headline-lg` 32/600 | Custom class `.text-xl` | ⚠️ Semantic gap |

**Action:** Add custom font-size utilities in `index.css` or use inline styles for display/headline levels to match reference exactly.

### 2.3 Layout Grid

| Reference | Current | Status |
|-----------|---------|--------|
| 260px fixed sidebar | 260px fixed sidebar ✅ | Match |
| 32px desktop margin (`p-margin-desktop`) | `md:p-6` (24px) | ⚠️ Increase to 32px |
| 16px mobile margin (`p-margin-mobile`) | `p-4` (16px) ✅ | Match |
| 24px gutter (`gap-gutter`) | `gap-6` (24px) ✅ | Match |
| 12-col bento grid | `grid-cols-1 lg:grid-cols-2` etc. | ⚠️ Adopt `grid-cols-12` |

### 2.4 Icons

| Reference | Current | Recommendation |
|-----------|---------|----------------|
| Material Symbols Outlined | Lucide React | **Keep Lucide** — already imported, tree-shakeable, familiar to React devs. Map icon names (see Section 6). |

---

## 3. Page-by-Page Mapping

### 3.1 Dashboard

| Attribute | Value |
|-----------|-------|
| **Reference file** | `adminmate_ai_dashboard/code.html` |
| **Current file** | `src/pages/DashboardPage.tsx` |
| **Layout components** | `src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx` |
| **Route** | `/dashboard` |

| Key Design Elements | Current State | Implementation Notes |
|---------------------|---------------|----------------------|
| Welcome header ("Good Morning, Sarah.") | ✅ Present — uses `profile?.full_name` | Keep; match `font-headline-lg` weight |
| 4-column bento stat cards | ⚠️ Basic grid `grid-cols-4` | Adopt `bg-surface rounded-xl border border-surface-container-high shadow-sm` styling from reference |
| Large watermark icon on cards (opacity 5→10%) | ❌ Missing | Add absolute-positioned icon (`opacity-5 group-hover:opacity-10`) |
| "Action Required" panel with priority badge | ❌ Missing | Create new `DashboardActions` component |
| Recent Candidates table with AI Match Score progress bars | ❌ Missing | Create `RecentCandidatesTable` component; use progress bar + hover `arrow_forward_ios` action |
| Row hover: light blue bg + revealed arrow | ❌ Missing | Add `group-hover:opacity-100` transition on action button |
| Status chips (Screening, Interviewed, Offered) | ⚠️ Basic badges | Match reference chip styling: soft-filled, no border, rounded-md |

**Implementation Priority:** HIGH — Dashboard is the landing page after login.

---

### 3.2 Recruitment Pipeline

| Attribute | Value |
|-----------|-------|
| **Reference file** | `adminmate_ai_recruitment_pipeline_luxury/code.html` |
| **Current file** | `src/pages/recruitment/PipelinePage.tsx` |
| **Layout components** | `src/components/pipeline/KanbanBoard.tsx`, `KanbanColumn.tsx`, `ApplicationCard.tsx`, `ApplicationDrawer.tsx` |
| **Route** | `/recruitment/pipeline` |

| Key Design Elements | Current State | Implementation Notes |
|---------------------|---------------|----------------------|
| Kanban columns: Applied, AI Screening, Interviewing, Offer | ⚠️ Present | Reference has bilingual headers (`/ สมัครแล้ว`); add i18n sub-labels |
| Column header with count badge | ⚠️ Partial | Match reference: `bg-surface-container-high rounded-full px-2 py-0.5` |
| Candidate cards with photo, name, match %, exp tags | ⚠️ Basic | Reference uses `rounded-xl`, `shadow-sm`, photo + initials fallback, skill tags |
| Active card highlight: left 4px primary border + ring | ❌ Missing | Add `border-l-4 border-l-primary ring-2 ring-primary-fixed` for selected card |
| "Processing..." pulse indicator on AI screening | ❌ Missing | Add `animate-pulse` dot for AI-processing candidates |
| Chat button on each card | ❌ Missing | Add `MessageCircle` icon button (Lucide) on card hover |
| Right-side AI Insights sidebar (360px fixed) | ❌ Missing | **Major gap.** Create `AiInsightsSidebar` component: candidate photo, overall match badge, verified skills list, experience timeline |
| JD Generation Tool button (top right) | ❌ Missing | Add to page header; links to `/recruitment/jobs/:id` JD generator |
| Bilingual labels (EN/TH) | ⚠️ Partial via i18n | Reference shows both languages simultaneously; current uses i18n switching. Keep i18n approach — cleaner UX. |

**Implementation Priority:** HIGH — Pipeline is a core differentiator.

---

### 3.3 Hiring & Documentation

| Attribute | Value |
|-----------|-------|
| **Reference file** | `adminmate_ai_hiring_compliance/code.html` |
| **Current file** | `src/pages/hiring/HiringPage.tsx` |
| **Layout components** | `src/components/offers/OfferForm.tsx`, `src/components/pdf/OfferLetterPDF.tsx` |
| **Route** | `/hiring` |

| Key Design Elements | Current State | Implementation Notes |
|---------------------|---------------|----------------------|
| Page title: "Hiring & Documentation" | ⚠️ Present | Reference has subtitle "Automated compliance & document generation for SEA region" — add |
| Document Generation Module (bento 3-col) | ❌ Missing | Create `DocumentGenerationModule`: P.N.D. 1, Labor Contract, BPJS cards with icon + hover border-primary |
| Document Tracking table | ⚠️ Partial | Current may use generic `DataTable`. Match reference: sticky headers, status badges, auto-remind toggle switch |
| Toggle switch custom styling | ❌ Missing | Reference uses custom peer-checked toggle. Use `shadcn/ui` Switch or custom Tailwind peer pattern |
| Right-side Document Preview panel (600px sticky) | ❌ Missing | **Major gap.** Create `DocumentPreviewPanel`: simulated document canvas with AI-filled fields (`bg-primary-container` highlight), watermark, signature blocks |
| Status badges: Sent, Draft, Signed | ⚠️ Basic | Match reference: `bg-secondary-container`, `bg-surface-variant`, custom green `#e6f4ea` for Signed |
| "Export Audit Log" button | ❌ Missing | Add to header actions |

**Implementation Priority:** MEDIUM — Feature-complete but needs visual upgrade.

---

### 3.4 Onboarding

| Attribute | Value |
|-----------|-------|
| **Reference file** | `adminmate_ai_onboarding_assistant/code.html` |
| **Current file** | `src/pages/OnboardingMgmtPage.tsx` |
| **Layout components** | `src/components/OnboardingChecklistView.tsx`, `OnboardingManagerView.tsx`, `OnboardingAssistantView.tsx` |
| **Route** | `/onboarding` |

| Key Design Elements | Current State | Implementation Notes |
|---------------------|---------------|----------------------|
| "Onboarding Hub" title with subtitle | ⚠️ Present | Match `font-headline-lg` + `font-body-lg` hierarchy |
| Progress bar (33% example) | ⚠️ Partial | Reference uses `h-2 rounded-full` with `bg-primary` fill — standardize |
| Checklist items with completed/ active/ pending states | ⚠️ Present | Reference: completed = check circle + strikethrough; active = ring-1 ring-primary + due date; pending = opacity-60 |
| "Start" button on active task | ❌ Missing | Add CTA button to active checklist item |
| Team Onboarding Status table | ❌ Missing | Create `TeamOnboardingTable`: employee, role, progress bar %, status chip (On Track / At Risk) |
| Mate AI assistant panel (right col, 400px) | ❌ Missing | **Major gap.** Create embedded `MiniChatInterface`: primary-container header, bot avatar, message bubbles, rounded input + send button |
| Quick Resources panel | ❌ Missing | Add `QuickResources` component: Employee Handbook, Health Benefits, Labor Law FAQ links with `open_in_new` icon |
| Glass card effect (`backdrop-filter: blur(10px)`) | ❌ Missing | Reference uses `.glass-card`. Current has `.glass` utility but it's not used here. Apply to onboarding cards. |

**Implementation Priority:** MEDIUM — Good candidate for glass-morphism treatment.

---

### 3.5 Reports

| Attribute | Value |
|-----------|-------|
| **Reference file** | `adminmate_ai_reports_luxury/code.html` |
| **Current file** | `src/pages/ReportsPage.tsx` |
| **Layout components** | `src/components/reports/` (only `.gitkeep` — empty) |
| **Route** | `/reports` |

| Key Design Elements | Current State | Implementation Notes |
|---------------------|---------------|----------------------|
| "Analytics & Reports" bilingual title | ⚠️ Present | Reference shows TH subtitle simultaneously; keep i18n switch approach |
| Period filter chips (Q3 2023, Q2 2023, YTD) | ❌ Missing | Add `PeriodFilterChips` component: rounded-full, active = `bg-surface-container-low text-primary` |
| KPI cards row (3 cards) | ⚠️ Partial | Current has charts but no KPI cards. Add: Recruitment Efficiency (24 days), Cost per Hire ($4,250), Onboarding Success (85%) |
| KPI card icon in tinted circle | ❌ Missing | Reference: `bg-primary-fixed rounded-full` with icon inside |
| Trend indicator badge (trending_up/down) | ❌ Missing | Add to KPI cards with color-coded text |
| Hiring Pipeline Analytics bar chart | ✅ Present via Recharts | Replace with custom-styled bars if needed; reference uses hover tooltips |
| Source Breakdown panel (LinkedIn, Direct, Referrals, Other) | ❌ Missing | Add `SourceBreakdown` component with colored dots + progress bars |
| Generated Reports table | ❌ Missing | Add `GeneratedReportsTable`: report name, category chip, date, hover arrow action |
| Hover row: arrow_forward revealed | ❌ Missing | Same pattern as Dashboard table |

**Implementation Priority:** MEDIUM — Charts exist; need KPI cards and tables.

---

### 3.6 Settings

| Attribute | Value |
|-----------|-------|
| **Reference file** | `adminmate_ai_settings_luxury/code.html` |
| **Current file** | `src/pages/settings/SettingsPage.tsx` |
| **Layout components** | `src/components/settings/` (none yet) |
| **Route** | `/settings` |

| Key Design Elements | Current State | Implementation Notes |
|---------------------|---------------|----------------------|
| "Settings" title with TH subtitle | ⚠️ Present | Reference uses `font-display-lg` — upgrade from `text-headline-md` |
| Save Changes button (top right) | ❌ Missing | Move save action from form bottom to page header |
| Company Profile section (8 cols) | ⚠️ Partial | Current has basic form. Reference: logo upload area with hover overlay, bilingual labels (English / Thai), Tax ID field with `font-code-sm` |
| Logo upload with hover edit overlay | ❌ Missing | Add `LogoUploader` component: `group-hover:bg-black/40` with edit icon |
| Current Plan card (4 cols) | ❌ Missing | **Major gap.** Create `PricingPlanCard`: gradient background, blur decoration, price display, usage bar (45k/50k), Manage Billing button |
| Regional Compliance section (6 cols) | ❌ Missing | **Major gap.** Create `RegionalComplianceCard`: TH (PDPA), VN (Decree 13), ID (PDP Law) toggles with country flag circle + status |
| Chat Integrations section (6 cols) | ❌ Missing | **Major gap.** Create `ChatIntegrationsCard`: LINE OA, WhatsApp, Zalo with brand colors, connect/disconnect buttons |
| Card shadow (`card-shadow`) | ⚠️ Partial | Reference uses `0 2px 4px rgba(0,0,0,0.05)`; current uses heavier shadow. Standardize to reference |

**Implementation Priority:** MEDIUM — Settings is functional but missing major sections.

---

## 4. Design Gaps (No Reference Design)

These pages exist in the current app but have **no corresponding reference design**. Proposed treatments follow the Corporate Blue system.

### 4.1 Authentication Pages

| Page | Current File | Route | Proposed Treatment |
|------|--------------|-------|-------------------|
| **LoginPage** | `src/pages/auth/LoginPage.tsx` | `/login` | Split-screen layout: left side = brand illustration on `app-background` (#E6F0FF), right side = clean white card with form. Use `surface` card with `outline-variant` border. Social login buttons (Google OAuth) as outlined buttons. |
| **RegisterPage** | `src/pages/auth/RegisterPage.tsx` | `/register` | Same split-screen. Multi-step form: Account → Company Profile. Progress indicator at top with `primary` active step. |
| **ForgotPasswordPage** | `src/pages/auth/ForgotPasswordPage.tsx` | `/forgot-password` | Minimal centered card on `app-background`. Success state with email sent illustration. |
| **CompanySetupPage** | `src/pages/onboarding/CompanySetupPage.tsx` | `/setup-company` | Full-screen wizard with sidebar progress (4 steps). Each step as a `surface` card. Use same form styling as Settings page. |

### 4.2 Recruitment Detail Pages

| Page | Current File | Route | Proposed Treatment |
|------|--------------|-------|-------------------|
| **JobDetailPage** | `src/pages/recruitment/JobDetailPage.tsx` | `/recruitment/jobs/:id` | Two-column layout: left (8 cols) = JobForm with JD preview, right (4 cols) = AI Actions panel (Generate JD, Post to Job Boards). Use `surface` cards with `outline-variant` borders. AI panel uses `primary-container` tint. |
| **CandidateDetailPage** | `src/pages/recruitment/CandidateDetailPage.tsx` | `/recruitment/candidates/:id` | Three-section layout: Header (photo + name + match score badge), Tabs (Overview / CV / Screening / Notes), AI Screening panel with score breakdown bars. Match score uses reference progress bar pattern. |

### 4.3 Support Pages

| Page | Current File | Route | Proposed Treatment |
|------|--------------|-------|-------------------|
| **InterviewsPage** | `src/pages/recruitment/InterviewsPage.tsx` | `/recruitment/interviews` | Calendar view (month grid) + upcoming list sidebar. Calendar uses `surface-container-low` for days with events, `primary` dot for interviews. List items use `surface` cards with time + candidate name. |
| **DocumentsPage** | `src/pages/DocumentsPage.tsx` | `/documents` | Table layout same as Hiring reference. Add document type icons, status badges, and "Send Reminder" action. Filter by status (Draft / Sent / Signed). |
| **ChatPage** | `src/pages/ChatPage.tsx` | `/chat` | Full-width chat interface. Header: `primary-container` with Mate AI avatar. Messages: user = `primary` bubble right-aligned; bot = `surface-container-low` left-aligned. Input bar: rounded-full with send button. Use same pattern as Onboarding embedded chat but full-screen. |
| **CompliancePage** | `src/pages/settings/CompliancePage.tsx` | `/settings/compliance` | Extend Settings design. PDPA consent log table, data retention policy editor, deletion request workflow. Use `error-container` for high-risk actions. |

### 4.4 System Pages

| Page | Current File | Route | Proposed Treatment |
|------|--------------|-------|-------------------|
| **NotFoundPage** | `src/pages/NotFoundPage.tsx` | `*` | Centered illustration (404 graphic in `primary-fixed` tint), "Page not found" headline, "Go to Dashboard" primary button. Keep minimal. |
| **GeminiMonitoringPage** | `src/pages/GeminiMonitoringPage.tsx` | *(internal)* | Admin-only. Table of AI usage logs with quota bars. Use `code-sm` font for API call IDs. Status colors: green under quota, red near limit. |
| **HealthPage** | `src/pages/HealthPage.tsx` | *(internal)* | System status dashboard. Service cards (Database, Auth, AI, Email) with status indicators. Green dot = healthy, red = down. Simple grid layout. |

---

## 5. Structural Differences Summary

| Aspect | Reference Design | Current App | Recommendation |
|--------|------------------|-------------|----------------|
| **Icon Library** | Material Symbols Outlined (Google Fonts) | Lucide React | Keep Lucide — lighter, React-native, already installed. Map equivalents (Section 6). |
| **i18n Approach** | Bilingual simultaneous labels (EN / TH on same line) | react-i18next with locale switching | **Keep i18n switching.** Simultaneous bilingual is cluttered. Add TH subtitle only where reference explicitly shows it (e.g., page subtitles). |
| **Background** | `#E6F0FF` sky-blue canvas with white cards | White/gray background | Add `app-background` token and apply to `body` or main wrapper for elevated feel. |
| **Card Elevation** | `shadow-sm` (subtle 2px) + tonal borders | Heavier shadows, some flat | Standardize to reference: `shadow-sm` + `border-outline-variant` for all cards. |
| **Grid System** | Explicit 12-column bento grid | Ad-hoc responsive grids | Adopt `grid-cols-12` with `col-span-X` for complex layouts (Dashboard, Settings, Reports). |
| **Navigation Active State** | Left 4px border + `bg-surface-container-low` | `border-l-3` + `bg-primary-container/15` | Align to reference: use `border-l-4 border-primary` + `bg-surface-container-low` for active nav. |
| **Buttons** | Solid `primary` fill, rounded-lg, semi-bold | Mix of styles | Standardize: Primary = `bg-primary text-on-primary rounded-lg font-semibold hover:opacity-90`. Secondary = outlined `border-primary text-primary`. |
| **Avatars** | Rounded-full with initials fallback | Mixed | Use `rounded-full` for user avatars, `rounded-lg` for company/logo. |
| **Progress Bars** | Thin (h-2), `rounded-full`, color-coded | Unknown | Standardize to `h-2 rounded-full` with `bg-primary` for good, `bg-error` for at-risk, `bg-outline-variant` for neutral. |
| **Tables** | Borderless rows, 1px dividers, hover bg shift, hidden actions | Basic table | Apply reference pattern: `divide-y divide-surface-container-high`, hover `bg-surface-container-low`, action buttons `opacity-0 group-hover:opacity-100`. |
| **Search Inputs** | Rounded-full with embedded icon | Rounded-full ✅ | Match reference: `bg-surface-container-low rounded-full pl-10 pr-4`. |

---

## 6. Icon Mapping: Material Symbols → Lucide React

Keep Lucide React. Use this mapping table when implementing reference designs:

| Material Symbols | Lucide Equivalent | Usage Context |
|------------------|-------------------|---------------|
| `dashboard` | `LayoutDashboard` | Nav item, KPI cards |
| `group_add` | `Briefcase` | Nav item (Recruitment) |
| `person_search` | `FileCheck` | Nav item (Hiring) |
| `assignment_ind` | `UserCheck` | Nav item (Onboarding) |
| `analytics` | `BarChart2` | Nav item (Reports) |
| `settings` | `Settings` | Nav item (Settings) |
| `notifications` | `Bell` | Header action |
| `help` | `HelpCircle` | Header action |
| `search` | `Search` | Search inputs |
| `add` | `Plus` | "New Request" button |
| `work` | `Briefcase` | Dashboard stat watermark |
| `person_add` | `Users` | Dashboard stat watermark |
| `draw` | `FileSignature` | Pending signatures watermark |
| `model_training` | `GraduationCap` | Onboarding watermark |
| `psychology` | `Brain` | AI Match task icon |
| `description` | `FileText` | Document/task icon |
| `arrow_forward_ios` | `ChevronRight` | Table row action |
| `chat` | `MessageCircle` | Candidate card chat |
| `auto_awesome` | `Sparkles` | AI actions, match badge |
| `verified` | `BadgeCheck` | Verified skills icon |
| `speed` | `Gauge` | Reports KPI icon |
| `payments` | `Banknote` | Cost per hire icon |
| `how_to_reg` | `UserCheck` | Onboarding success icon |
| `trending_up` | `TrendingUp` | Positive trend |
| `trending_down` | `TrendingDown` | Negative trend |
| `more_vert` | `MoreVertical` | Chart options |
| `receipt_long` | `Receipt` | P.N.D. 1 document |
| `contract` | `FileSignature` | Labor contract |
| `health_and_safety` | `HeartPulse` | BPJS/health icon |
| `send` | `Send` | Send for signature |
| `open_in_new` | `ExternalLink` | Open preview |
| `smart_toy` | `Bot` | Mate AI avatar |
| `check` | `Check` | Completed checklist |
| `domain` | `Building2` | Company profile |
| `edit` | `Pencil` | Logo edit overlay |
| `gavel` | `Scale` | Compliance/regional law |
| `forum` | `MessageSquare` | Chat integrations |
| `phone_iphone` | `Smartphone` | WhatsApp icon |
| `question_answer` | `MessageCircle` | Zalo icon |
| `close` | `X` | Close sidebar/panel |
| `menu` | `Menu` | Mobile hamburger |
| `language` | `Globe` | Language switcher |
| `filter_list` | `ListFilter` | Report filters |
| `check_circle` | `CheckCircle` | Success states |

---

## 7. Component Gaps to Create

Based on the mapping above, these **new shared components** should be created in `src/components/shared/`:

| Component | Purpose | Used By |
|-----------|---------|---------|
| `KpiCard` | Stat card with watermark icon, trend badge | Dashboard, Reports |
| `ActionPanel` | "Action Required" task list with priority | Dashboard |
| `RecentTable` | Hover-reveal actions, progress bars, status chips | Dashboard, Reports, Documents |
| `AiInsightsSidebar` | Right-fixed panel for candidate details | Pipeline |
| `DocumentPreviewPanel` | Simulated document with AI highlights | Hiring |
| `DocumentGenerationModule` | Bento grid of document type cards | Hiring |
| `MiniChatInterface` | Embedded chat for onboarding page | Onboarding |
| `ChecklistItem` | Completed / active / pending task states | Onboarding |
| `TeamOnboardingTable` | Progress + status for team view | Onboarding |
| `PeriodFilterChips` | Q1/Q2/Q3/YTD selector | Reports |
| `SourceBreakdown` | Horizontal bar chart with legend | Reports |
| `LogoUploader` | Image with hover edit overlay | Settings, CompanySetup |
| `PricingPlanCard` | Subscription display with usage | Settings |
| `RegionalComplianceCard` | Country toggles with flags | Settings, Compliance |
| `ChatIntegrationsCard` | LINE/WhatsApp/Zalo connectors | Settings |
| `StatusBadge` | Standardized status chip component | All tables |
| `ProgressBar` | Thin rounded bar with label | Tables, cards |

---

## 8. Tailwind Token Gaps

Add these to `src/index.css` within the `@theme` block:

```css
@theme {
  --color-app-background: #E6F0FF;
  --color-success-track: #c4d2ff;
  --font-display-lg: 'Inter', sans-serif;
  --font-label-md: 'IBM Plex Sans', 'Noto Sans Thai', sans-serif;
  
  /* Custom spacing */
  --spacing-gutter: 24px;
  --spacing-margin-desktop: 32px;
  --spacing-margin-mobile: 16px;
  
  /* Custom border radius (if not already present) */
  --radius-xl: 0.75rem;
}
```

Also update `AppLayout.tsx`:

```tsx
// Change:
<main className="flex-1 p-4 md:p-6 mt-16 ...">
// To:
<main className="flex-1 p-margin-mobile md:p-margin-desktop mt-16 ...">
```

---

## 9. Migration Roadmap

### Phase 1: Foundation (Week 1)
1. Add `app-background` and spacing tokens to `index.css`
2. Update `AppLayout.tsx` margins
3. Update `Sidebar.tsx` active state to match reference (`border-l-4`)
4. Create `StatusBadge`, `ProgressBar`, `KpiCard` shared components

### Phase 2: Core Pages (Week 2)
1. **Dashboard:** Add Action Panel + Recent Candidates table
2. **Pipeline:** Add AI Insights sidebar + enhance Kanban cards
3. **Reports:** Add KPI cards + Source Breakdown + Generated Reports table

### Phase 3: Supporting Pages (Week 3)
1. **Hiring:** Add Document Generation Module + Preview Panel
2. **Onboarding:** Add glass cards, Team table, Mini Chat, Resources
3. **Settings:** Add Plan card, Regional Compliance, Chat Integrations

### Phase 4: Gap Pages (Week 4)
1. Design treatments for Login, Register, JobDetail, CandidateDetail, Interviews, Chat, Compliance
2. NotFound, Health, GeminiMonitoring minimal designs

---

## 10. Appendix: File Inventory

### Reference Design Files
```
adminmate_ai/
├── DESIGN.md                          # Corporate Blue design system spec
adminmate_ai_dashboard/
├── code.html                          # Dashboard (384 lines)
adminmate_ai_hiring_compliance/
├── code.html                          # Hiring & Documentation (380 lines)
adminmate_ai_onboarding_assistant/
├── code.html                          # Onboarding Hub (361 lines)
adminmate_ai_recruitment_pipeline_luxury/
├── code.html                          # Pipeline + AI Insights (436 lines)
adminmate_ai_reports_luxury/
├── code.html                          # Analytics & Reports (401 lines)
adminmate_ai_settings_luxury/
├── code.html                          # Settings (356 lines)
```

### Current App Pages (22 total)
```
src/pages/
├── auth/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── ForgotPasswordPage.tsx
├── recruitment/
│   ├── JobsPage.tsx
│   ├── JobDetailPage.tsx
│   ├── CandidatesPage.tsx
│   ├── CandidateDetailPage.tsx
│   ├── PipelinePage.tsx
│   └── InterviewsPage.tsx
├── hiring/
│   └── HiringPage.tsx
├── onboarding/
│   └── CompanySetupPage.tsx
├── settings/
│   ├── SettingsPage.tsx
│   └── CompliancePage.tsx
├── DashboardPage.tsx
├── DocumentsPage.tsx
├── OnboardingMgmtPage.tsx
├── ChatPage.tsx
├── ReportsPage.tsx
├── NotFoundPage.tsx
├── GeminiMonitoringPage.tsx
└── HealthPage.tsx
```

---

*End of Design-to-Code Mapping Document*
