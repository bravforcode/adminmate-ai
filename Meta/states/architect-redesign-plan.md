# AdminMate AI — Corporate Blue Redesign Architecture

**Agent**: `architect` (Ruflow Project Gracia)  
**Date**: 2026-06-03  
**Scope**: Tailwind v4 theme, shared component library, layout retrofit, shadcn/ui customization  
**Constraint**: Every file ≤ 500 lines. Prefer composition over inheritance.

---

## 1. Tailwind v4 `@theme` Block

**File**: `src/index.css` (replace existing `@theme { … }`)

```css
@theme {
  /* ── Primary ────────────────────────────── */
  --color-primary:                    #003d9b;
  --color-on-primary:                 #ffffff;
  --color-primary-container:          #0052cc;
  --color-on-primary-container:       #c4d2ff;
  --color-primary-fixed:              #dae2ff;
  --color-primary-fixed-dim:          #b2c5ff;
  --color-on-primary-fixed:           #001848;
  --color-on-primary-fixed-variant:   #0040a2;
  --color-inverse-primary:            #b2c5ff;

  /* ── Secondary ──────────────────────────── */
  --color-secondary:                  #455e91;
  --color-on-secondary:               #ffffff;
  --color-secondary-container:        #abc3fd;
  --color-on-secondary-container:     #375082;
  --color-secondary-fixed:            #d8e2ff;
  --color-secondary-fixed-dim:        #afc6ff;
  --color-on-secondary-fixed:         #001a43;
  --color-on-secondary-fixed-variant: #2c4677;

  /* ── Tertiary ───────────────────────────── */
  --color-tertiary:                   #00418a;
  --color-on-tertiary:                #ffffff;
  --color-tertiary-container:         #0058b6;
  --color-on-tertiary-container:      #bfd3ff;
  --color-tertiary-fixed:             #d7e2ff;
  --color-tertiary-fixed-dim:         #abc7ff;
  --color-on-tertiary-fixed:          #001b3f;
  --color-on-tertiary-fixed-variant:  #004590;

  /* ── Error ──────────────────────────────── */
  --color-error:                      #ba1a1a;
  --color-on-error:                   #ffffff;
  --color-error-container:            #ffdad6;
  --color-on-error-container:         #93000a;

  /* ── Surface & Background ───────────────── */
  --color-background:                 #faf9ff;
  --color-on-background:              #051a3e;
  --color-surface:                    #faf9ff;
  --color-on-surface:                 #051a3e;
  --color-surface-bright:             #faf9ff;
  --color-surface-dim:                #ccdaff;
  --color-surface-variant:            #d8e2ff;
  --color-surface-container-lowest:   #ffffff;
  --color-surface-container-low:      #f1f3ff;
  --color-surface-container:          #e9edff;
  --color-surface-container-high:     #e1e8ff;
  --color-surface-container-highest:  #d8e2ff;

  /* ── Outline ────────────────────────────── */
  --color-outline:                    #737685;
  --color-outline-variant:            #c3c6d6;

  /* ── Inverse ──────────────────────────── */
  --color-inverse-surface:            #1d3054;
  --color-inverse-on-surface:         #edf0ff;

  /* ── App-specific ───────────────────────── */
  --color-app-background:             #E6F0FF;
  --color-success:                    #1e6e3c;
  --color-on-success:                 #ffffff;
  --color-success-container:          #d4edda;
  --color-on-success-container:       #155724;
  --color-warning:                    #b35900;
  --color-on-warning:                 #ffffff;
  --color-warning-container:          #fff3cd;
  --color-on-warning-container:       #856404;
  --color-info:                       #0052cc;
  --color-on-info:                    #ffffff;

  /* ── Typography ─────────────────────────── */
  --font-sans:   'Inter', 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif;
  --font-title:  'Inter', 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif;
  --font-body:   'Inter', 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif;
  --font-label:  'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
  --font-code:   'IBM Plex Sans', ui-monospace, monospace;

  --font-size-display-lg:        48px;
  --font-size-headline-lg:       32px;
  --font-size-headline-lg-mobile:24px;
  --font-size-headline-md:       24px;
  --font-size-title-lg:          20px;
  --font-size-body-lg:           16px;
  --font-size-body-md:           14px;
  --font-size-label-md:          12px;
  --font-size-code-sm:           12px;

  --leading-display-lg:     56px;
  --leading-headline-lg:    40px;
  --leading-headline-md:    32px;
  --leading-title-lg:       28px;
  --leading-body-lg:        24px;
  --leading-body-md:        20px;
  --leading-label-md:       16px;
  --leading-code-sm:        18px;

  --tracking-display-lg:    -0.02em;
  --tracking-headline-lg:   -0.01em;
  --tracking-label-md:      0.05em;

  /* ── Spacing ────────────────────────────── */
  --spacing-base:             4px;
  --spacing-xs:               4px;
  --spacing-sm:               8px;
  --spacing-md:               16px;
  --spacing-lg:               24px;
  --spacing-xl:               32px;
  --spacing-2xl:              48px;
  --spacing-3xl:              64px;
  --spacing-gutter:           24px;
  --spacing-margin-mobile:    16px;
  --spacing-margin-desktop:   32px;

  /* ── Radius ─────────────────────────────── */
  --radius-sm:   0.25rem;
  --radius-lg:   0.5rem;
  --radius-md:   0.75rem;
  --radius-xl:   1rem;
  --radius-full: 9999px;
}
```

**Notes**:
- `--leading-*` and `--tracking-*` are custom tokens. They are **not** native Tailwind v4 utilities, but we expose them via CSS custom properties so components can use `leading-[var(--leading-headline-lg)]` etc.
- All color values match the Corporate Blue spec exactly (the current file has `#003d9a` which is corrected to `#003d9b`).
- Added semantic `success`, `warning`, `info` tokens for UI states (not in the design system but required for functional completeness).

---

## 2. New Shared Components

All new components live under `src/components/shared/` (business-agnostic) or `src/components/ui/` (shadcn/ui overrides). We keep each file < 500 lines.

### 2.1 PageHeader
**File**: `src/components/shared/PageHeader.tsx`

```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode; // right-aligned button group
  breadcrumbs?: { label: string; href?: string }[];
}
```

**ClassName Patterns**:
```
outer:   flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6
inner:   space-y-1
title:   text-headline-lg-mobile sm:text-headline-lg font-semibold text-on-background tracking-[var(--tracking-headline-lg)]
sub:     text-body-md text-on-surface-variant
actions: flex items-center gap-2
```

---

### 2.2 StatCard
**File**: `src/components/shared/StatCard.tsx`

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: { value: string; up: boolean }; // e.g. { value: "+12%", up: true }
  tone?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'error' | 'default';
  onClick?: () => void;
}
```

**ClassName Patterns**:
```
card:      bg-surface rounded-xl border border-outline-variant p-5 relative overflow-hidden
            hover:shadow-md transition-shadow duration-200
bg-icon:   absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity
icon-wrap: w-10 h-10 rounded-lg flex items-center justify-center mb-3
            tone=primary  → bg-primary-container/20 text-primary
            tone=success  → bg-success-container text-success
label:     text-label-md font-label text-on-surface-variant uppercase tracking-[var(--tracking-label-md)]
value:     text-[32px] leading-[40px] font-semibold text-on-surface mt-1
trend:     text-body-md font-medium flex items-center gap-1
            up=true  → text-success
            up=false → text-error
```

---

### 2.3 ActionCard
**File**: `src/components/shared/ActionCard.tsx`

```tsx
interface ActionCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  dueLabel?: string;        // e.g. "Due today"
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
  onClick?: () => void;
}
```

**ClassName Patterns**:
```
card:       bg-surface rounded-xl border border-outline-variant p-5 flex items-start gap-4
             hover:bg-surface-container-low transition-colors cursor-pointer
icon-ring:  w-11 h-11 rounded-full flex items-center justify-center shrink-0
             tone=primary → bg-primary-container/20 text-primary
content:    flex-1 min-w-0
title:      text-title-lg font-semibold text-on-surface leading-title-lg
desc:       text-body-md text-on-surface-variant mt-1 line-clamp-2
due:        text-label-md font-label font-semibold mt-2
             tone=error ? text-error : text-primary
```

---

### 2.4 DataTable (redesign)
**File**: `src/components/shared/DataTable.tsx` (overwrite)

```tsx
interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => { label: string; icon?: any; onClick: () => void; tone?: 'error' }[];
  emptyText?: string;
  isLoading?: boolean;
}
```

**ClassName Patterns**:
```
wrapper:   overflow-hidden rounded-xl border border-outline-variant bg-surface
searchbar: p-3 border-b border-outline-variant bg-surface-container-low
            input wrapper → flex items-center gap-2 px-4 py-2 bg-surface rounded-full border border-outline-variant
header:    border-b border-outline-variant bg-surface-container-low
th:        py-3 px-4 text-label-md font-label font-semibold text-on-surface-variant uppercase tracking-[var(--tracking-label-md)]
row:       group relative transition-colors hover:bg-surface-container-low/60
            onRowClick ? cursor-pointer : ""
td:        py-3 px-4 text-body-md text-on-surface
action-col: absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity
            flex items-center gap-1 bg-surface-container-lowest/90 rounded-lg shadow-sm px-2 py-1 border border-outline-variant
arrow-btn: p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant
```

---

### 2.5 KanbanColumn & KanbanCard
**Files**: `src/components/shared/KanbanColumn.tsx`, `KanbanCard.tsx`

#### KanbanColumn
```tsx
interface KanbanColumnProps {
  title: string;
  count: number;
  tone?: 'primary' | 'secondary' | 'tertiary';
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}
```

**ClassName Patterns**:
```
column:    flex flex-col gap-3 min-w-[280px] max-w-[320px] flex-1
header:    flex items-center justify-between px-1
title:     text-title-lg font-semibold text-on-surface
count:     text-label-md font-label font-semibold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full
body:      bg-surface-container rounded-xl p-3 flex flex-col gap-3 min-h-[120px]
```

#### KanbanCard
```tsx
interface KanbanCardProps {
  candidateName: string;
  candidatePhoto?: string;
  role: string;
  aiMatch?: number; // 0–100, shown as badge if ≥ 0
  tags?: string[];
  dueDate?: string;
  onClick?: () => void;
}
```

**ClassName Patterns**:
```
card:      bg-surface rounded-lg border border-outline-variant p-3.5 cursor-pointer
            hover:shadow-sm hover:border-primary/30 transition-all
photo:     w-8 h-8 rounded-full object-cover bg-surface-container-high
name:      text-body-md font-semibold text-on-surface
role:      text-body-md text-on-surface-variant
match:     text-label-md font-label font-semibold px-2 py-0.5 rounded-full
             ≥80 → bg-success-container text-success
             ≥50 → bg-warning-container text-warning
             <50 → bg-error-container text-error
tag:       text-label-md font-label text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full
due:       text-label-md font-label text-error mt-2 flex items-center gap-1
```

---

### 2.6 AIInsightPanel
**File**: `src/components/shared/AIInsightPanel.tsx`

```tsx
interface AIInsightPanelProps {
  insights: {
    id: string;
    type: 'strength' | 'gap' | 'suggestion' | 'alert';
    message: string;
    action?: { label: string; onClick: () => void };
  }[];
  title?: string;
  className?: string;
}
```

**ClassName Patterns**:
```
panel:     w-[320px] shrink-0 bg-surface rounded-xl border border-outline-variant p-5 hidden lg:block
header:    flex items-center gap-2 mb-4
icon:      w-5 h-5 text-primary
headline:  text-title-lg font-semibold text-on-surface
insight:   flex gap-3 p-3 rounded-lg border border-outline-variant/50
             type=strength    → bg-success-container/30 border-success-container
             type=gap       → bg-warning-container/30 border-warning-container
             type=suggestion → bg-primary-container/20 border-primary-container
             type=alert     → bg-error-container/30 border-error-container
message:   text-body-md text-on-surface leading-body-md
action:    mt-2 text-body-md font-semibold text-primary hover:text-primary-container cursor-pointer
```

---

### 2.7 DocumentPreviewPanel
**File**: `src/components/shared/DocumentPreviewPanel.tsx`

```tsx
interface DocumentPreviewPanelProps {
  title: string;
  documentUrl?: string; // if absent, show placeholder
  watermarkText?: string;
  actions?: React.ReactNode;
  sticky?: boolean; // position: sticky; top: header-height + gutter
}
```

**ClassName Patterns**:
```
panel:       bg-surface rounded-xl border border-outline-variant overflow-hidden
             sticky ? sticky top-[calc(64px+24px)] : ""
header:      px-5 py-4 border-b border-outline-variant flex items-center justify-between
title:       text-title-lg font-semibold text-on-surface
viewport:    relative bg-surface-container-low min-h-[400px] flex items-center justify-center
iframe/pdf:  w-full h-full object-contain
watermark:   absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.06] rotate-[-30deg]
             text-display-lg font-bold text-on-surface select-none
```

---

### 2.8 OnboardingChecklist
**File**: `src/components/shared/OnboardingChecklist.tsx`

```tsx
interface OnboardingChecklistProps {
  title?: string;
  progress: number; // 0–100
  tasks: {
    id: string;
    label: string;
    done: boolean;
    dueDate?: string;
    assignee?: string;
    assigneePhoto?: string;
  }[];
  onToggle?: (id: string) => void;
}
```

**ClassName Patterns**:
```
outer:       bg-surface rounded-xl border border-outline-variant p-5
header:      flex items-center justify-between mb-4
title:       text-title-lg font-semibold text-on-surface
progress:    flex items-center gap-3
  bar-bg:    h-2 w-24 bg-surface-container-high rounded-full overflow-hidden
  bar-fill:  h-full bg-primary rounded-full transition-all duration-500
  text:      text-label-md font-label font-semibold text-primary
task-row:    flex items-start gap-3 py-3 border-t border-outline-variant/50
  checkbox:  w-5 h-5 rounded border-2 border-outline flex items-center justify-center shrink-0
             done ? bg-primary border-primary text-on-primary : ""
  label:     text-body-md text-on-surface
             done ? line-through text-on-surface-variant : ""
  meta:      text-label-md font-label text-on-surface-variant mt-0.5 flex items-center gap-2
photo:       w-5 h-5 rounded-full object-cover
```

---

### 2.9 ChatPanel
**File**: `src/components/shared/ChatPanel.tsx`

```tsx
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isTyping?: boolean;
  placeholder?: string;
  className?: string;
}
```

**ClassName Patterns**:
```
panel:       bg-surface rounded-xl border border-outline-variant flex flex-col h-[600px]
header:      px-5 py-4 border-b border-outline-variant flex items-center gap-2
  icon:      w-5 h-5 text-primary
  title:     text-title-lg font-semibold text-on-surface
messages:    flex-1 overflow-y-auto p-4 space-y-4
  user-bubble:   max-w-[80%] ml-auto bg-primary text-on-primary px-4 py-2.5 rounded-xl rounded-tr-sm
  assistant-bubble: max-w-[80%] bg-surface-container-low px-4 py-2.5 rounded-xl rounded-tl-sm text-on-surface
  time:      text-label-md font-label text-on-surface-variant mt-1
input-bar:   p-3 border-t border-outline-variant flex items-center gap-2
  input:     flex-1 bg-surface-container-low rounded-full px-4 py-2 text-body-md
             focus:outline-none focus:ring-2 focus:ring-primary/20
  send-btn:  w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center
             hover:bg-primary-container transition-colors disabled:opacity-50
```

---

### 2.10 SearchBar
**File**: `src/components/shared/SearchBar.tsx`

```tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}
```

**ClassName Patterns**:
```
wrapper:   relative flex items-center w-full
icon:      absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none
input:     w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-full border border-outline-variant
           text-body-md text-on-surface placeholder:text-on-surface-variant/60
           focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
           transition-all duration-200
```

---

### 2.11 BentoGrid / BentoSection
**Files**: `src/components/shared/BentoGrid.tsx`, `BentoSection.tsx`

#### BentoSection (semantic wrapper)
```tsx
interface BentoSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}
```

**ClassName Patterns**:
```
section:   space-y-4
header:    flex items-end justify-between
  title:   text-title-lg font-semibold text-on-surface
  sub:     text-body-md text-on-surface-variant
```

#### BentoGrid
```tsx
interface BentoGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 'auto';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**ClassName Patterns**:
```
grid:      grid
  cols=1   → grid-cols-1
  cols=2   → grid-cols-1 sm:grid-cols-2
  cols=3   → grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  cols=4   → grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
  cols=auto→ grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  gap=sm   → gap-3
  gap=md   → gap-4
  gap=lg   → gap-6
```

---

## 3. Layout Component Modifications

### 3.1 Sidebar
**File**: `src/components/layout/Sidebar.tsx` (overwrite)

**Exact Changes**:
- **Active state**: `border-l-4 border-primary bg-surface-container-low text-primary font-semibold` (was `border-l-3` — invalid Tailwind; also `bg-primary-container/15` is replaced by `bg-surface-container-low` per the spec).
- **Inactive state**: `text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface` (keep existing).
- **Child items** (sub-nav): active gets `text-primary font-medium bg-surface-container-low/50` instead of `bg-primary-container/15`.
- **“New Request” button**: keep at bottom, but restyle to:
  ```
  w-full bg-primary text-on-primary py-2.5 px-4 rounded-lg text-label-md font-label font-semibold
  tracking-[var(--tracking-label-md)] uppercase hover:bg-primary-container transition-colors
  flex items-center justify-center gap-2 shadow-sm shadow-primary/20
  ```
- **Logo area**: use `bg-primary-container` for the icon square, `text-on-primary-container` for the letter.
- **Width**: keep `w-[260px]`.
- **Mobile overlay**: `bg-black/30 backdrop-blur-sm` (add `backdrop-blur`).
- **Scrollbar**: add `scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-transparent` (requires a small CSS utility or native `scrollbar-width: thin`).

---

### 3.2 Header
**File**: `src/components/layout/Header.tsx` (overwrite)

**Exact Changes**:
- **Container**: `h-16 fixed top-0 right-0 left-0 md:left-[260px] z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant flex items-center px-4 md:px-6`
- **Search bar**: rounded-full container with border.
  ```
  hidden md:flex relative flex-1 max-w-md
  outer: flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full border border-outline-variant
         focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all
  input: bg-transparent outline-none text-body-md text-on-surface placeholder:text-on-surface-variant/60 flex-1
  icon:  text-on-surface-variant
  ```
- **Notification / Help buttons**: icon-only, `p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant`.
- **User avatar**: replace initials circle with a styled avatar.
  ```
  w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center
  text-label-md font-label font-semibold ring-2 ring-surface ring-offset-2 ring-offset-surface-container-low
  ```
- **Language switcher**: keep existing but style as `p-2 rounded-full hover:bg-surface-container`.

---

### 3.3 AppLayout
**File**: `src/components/layout/AppLayout.tsx` (overwrite)

**Exact Changes**:
```
root:      min-h-screen bg-app-background flex
sidebar:   <Sidebar />
main-wrap: flex-1 md:ml-[260px] flex flex-col min-h-screen
header:    <Header />
content:   <main className="flex-1 pt-20 md:pt-24 px-4 md:px-8 pb-8 max-w-[1440px] mx-auto w-full">
             {was pt-24 p-4 md:p-8 — adjust to exact 80px/96px top padding and explicit horizontal gutters}
mobile:    <MobileNav />
toaster:   keep existing toast styles, but update to use surface colors:
           style={{ borderRadius: '12px', background: '#051a3e', color: '#faf9ff', fontSize: '14px' }}
```

---

### 3.4 MobileNav
**File**: `src/components/layout/MobileNav.tsx` (overwrite)

**Exact Changes**:
- **Background**: `bg-surface/95 backdrop-blur-md border-t border-outline-variant`.
- **Active item**: `text-primary bg-primary-container/15` (tinted background on active).
- **Inactive item**: `text-on-surface-variant`.
- **Safe area**: keep `safe-bottom` padding.
- **Icon sizing**: `w-6 h-6`.
- **Label**: `text-label-md font-label`.

---

## 4. shadcn/ui Customizations

Because `src/components/ui/` is currently empty, shadcn/ui is not yet installed. The following assumes standard installation via `npx shadcn@latest init` (or the Vite equivalent).

### 4.1 Global overrides (`src/components/ui/globals.css` or inside `src/index.css`)

All shadcn primitives should map to our `--color-*` tokens. Since we already define them in `@theme`, shadcn's default `zinc` / `slate` tokens will be overridden if we alias them. A simpler approach: after installing shadcn, replace its `@theme` block with our own (we already have it).

### 4.2 Component-specific overrides

| Component | Customization |
|-----------|---------------|
| **Button** | `variant=default` → `bg-primary text-on-primary hover:bg-primary-container`  <br> `variant=secondary` → `bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim`  <br> `variant=outline` → `border-outline-variant bg-transparent hover:bg-surface-container-low`  <br> `variant=ghost` → `hover:bg-surface-container-low`  <br> `variant=destructive` → `bg-error text-on-error hover:bg-error-container hover:text-on-error-container`  <br> `size=default` → `h-10 px-4 py-2 rounded-lg text-body-md font-semibold`  <br> `size=sm` → `h-8 px-3 rounded-md text-label-md font-label font-semibold tracking-[var(--tracking-label-md)] uppercase`  <br> `size=lg` → `h-12 px-6 rounded-xl text-body-lg font-semibold`  <br> `size=icon` → `h-9 w-9 rounded-full` |
| **Card** | `bg-surface border-outline-variant rounded-xl shadow-none` (we remove default shadow to keep the flat corporate look) |
| **Dialog** | `bg-surface border-outline-variant rounded-xl` (no heavy shadow; use subtle border) |
| **Input** | `bg-surface-container-low border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/60 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary` |
| **Badge** | `variant=default` → `bg-primary-container text-on-primary-container`  <br> `variant=secondary` → `bg-secondary-container text-on-secondary-container`  <br> `variant=outline` → `border-outline-variant text-on-surface`  <br> `variant=destructive` → `bg-error-container text-on-error-container` |
| **Avatar** | `ring-2 ring-surface ring-offset-2 ring-offset-surface-container-low` |
| **DropdownMenu** | `bg-surface border-outline-variant rounded-xl shadow-sm` |
| **Tabs** | `trigger` active → `bg-surface-container-low text-primary font-semibold border-b-2 border-primary`  <br> `trigger` inactive → `text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high` |
| **Select** | `bg-surface-container-low border-outline-variant rounded-lg text-on-surface focus:ring-2 focus:ring-primary/20` |
| **Tooltip** | `bg-inverse-surface text-inverse-on-surface text-label-md font-label rounded-lg px-2 py-1` |
| **Toast** | map to our toaster styling in AppLayout |

### 4.3 Utility: `src/lib/utils.ts`

Ensure `cn()` utility is available (it usually is via `clsx` + `tailwind-merge`). Add a small helper for tone-based color maps if needed:

```ts
export const toneMap = {
  primary:   { bg: 'bg-primary-container/20', text: 'text-primary', ring: 'ring-primary/20' },
  secondary: { bg: 'bg-secondary-container/30', text: 'text-secondary', ring: 'ring-secondary/20' },
  tertiary:  { bg: 'bg-tertiary-container/20', text: 'text-tertiary', ring: 'ring-tertiary/20' },
  success:   { bg: 'bg-success-container', text: 'text-success', ring: 'ring-success/20' },
  error:     { bg: 'bg-error-container', text: 'text-error', ring: 'ring-error/20' },
  warning:   { bg: 'bg-warning-container', text: 'text-warning', ring: 'ring-warning/20' },
  default:   { bg: 'bg-surface-container-high', text: 'text-on-surface', ring: 'ring-outline-variant' },
} as const;
```

---

## 5. File Inventory & Size Budget

| File | Lines (est.) | Domain |
|------|--------------|--------|
| `src/index.css` | ~120 | Theme tokens |
| `src/components/shared/PageHeader.tsx` | ~45 | Shared |
| `src/components/shared/StatCard.tsx` | ~55 | Shared |
| `src/components/shared/ActionCard.tsx` | ~50 | Shared |
| `src/components/shared/DataTable.tsx` | ~140 | Shared |
| `src/components/shared/KanbanColumn.tsx` | ~35 | Shared |
| `src/components/shared/KanbanCard.tsx` | ~65 | Shared |
| `src/components/shared/AIInsightPanel.tsx` | ~70 | Shared |
| `src/components/shared/DocumentPreviewPanel.tsx` | ~55 | Shared |
| `src/components/shared/OnboardingChecklist.tsx` | ~90 | Shared |
| `src/components/shared/ChatPanel.tsx` | ~95 | Shared |
| `src/components/shared/SearchBar.tsx` | ~35 | Shared |
| `src/components/shared/BentoGrid.tsx` | ~40 | Shared |
| `src/components/shared/BentoSection.tsx` | ~35 | Shared |
| `src/components/layout/Sidebar.tsx` | ~120 | Layout |
| `src/components/layout/Header.tsx` | ~55 | Layout |
| `src/components/layout/AppLayout.tsx` | ~28 | Layout |
| `src/components/layout/MobileNav.tsx` | ~35 | Layout |
| `src/components/layout/UserMenu.tsx` | ~55 | Layout |
| `src/components/layout/NotificationBell.tsx` | ~20 | Layout |
| `src/lib/utils.ts` (add toneMap) | ~25 | Utility |

All are well under the 500-line limit.

---

## 6. Migration Order (recommended)

1. **Phase 0**: Backup current `src/index.css`, then replace `@theme` block.
2. **Phase 1**: Rewrite layout shell (`AppLayout`, `Header`, `Sidebar`, `MobileNav`) — this gives the new visual frame immediately.
3. **Phase 2**: Install shadcn/ui primitives (if not present) and apply overrides.
4. **Phase 3**: Build shared components in this order (each unlocks pages):
   - `SearchBar`, `PageHeader`, `StatCard`, `BentoGrid`, `BentoSection`
   - `DataTable`
   - `KanbanColumn`, `KanbanCard`
   - `ActionCard`, `OnboardingChecklist`
   - `AIInsightPanel`, `DocumentPreviewPanel`
   - `ChatPanel`
5. **Phase 4**: Refactor pages to consume new shared components.
6. **Phase 5**: Verify no orphaned Tailwind classes (e.g., `bg-blue-100`, `text-green-600` from old Dashboard) remain.

---

## 7. Design Compliance Checklist

| Token | Spec Value | `@theme` Var |
|-------|------------|--------------|
| Primary | `#003d9b` | `--color-primary` ✅ |
| Background | `#faf9ff` | `--color-background` ✅ |
| App Background | `#E6F0FF` | `--color-app-background` ✅ |
| Surface Container Low | `#f1f3ff` | `--color-surface-container-low` ✅ |
| Outline Variant | `#c3c6d6` | `--color-outline-variant` ✅ |
| Inter (display/head/body) | — | `--font-sans`, `--font-title`, `--font-body` ✅ |
| IBM Plex Sans (label/code) | — | `--font-label`, `--font-code` ✅ |
| Display LG | 48/56 700 -0.02em | `text-[48px] leading-[56px] font-bold tracking-[-0.02em]` |
| Headline LG | 32/40 600 -0.01em | `text-[32px] leading-[40px] font-semibold tracking-[-0.01em]` |
| Headline LG Mobile | 24/32 600 | `text-[24px] leading-[32px] font-semibold` |
| Label MD | 12/16 600 0.05em | `text-[12px] leading-[16px] font-semibold tracking-[0.05em]` |
| Radius LG / DEFAULT | 0.5rem | `--radius-lg` ✅ |
| Radius XL | 1rem | `--radius-xl` ✅ |

---

*End of Architecture Document.*
