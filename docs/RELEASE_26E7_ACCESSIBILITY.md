# Release 26E.7 — Accessibility (WCAG 2.2 AA) Checklist

## Scope

WCAG 2.2 Level AA compliance audit for all AdminMate AI UI surfaces.

## Audit Tools

| Tool | Purpose |
|------|---------|
| axe-core | Automated WCAG scanning |
| Playwright a11y.spec.ts | Per-page accessibility assertions |
| Lighthouse a11y | Browser audit score |
| Manual screen reader | NVDA (Windows), VoiceOver (macOS) |

## WCAG 2.2 AA Checklist

### 1. Perceivable

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.1.1 Non-text Content | ⬜ | Alt text on all images, icons have `aria-label` |
| 1.2.1 Audio-only/Video-only | N/A | No media content |
| 1.3.1 Info and Relationships | ⬜ | Semantic HTML: headings, lists, tables |
| 1.3.2 Meaningful Sequence | ⬜ | DOM order matches visual order |
| 1.3.3 Sensory Characteristics | ⬜ | Instructions don't rely solely on color/shape |
| 1.3.4 Orientation | ⬜ | Portrait and landscape both functional |
| 1.3.5 Identify Input Purpose | ⬜ | `autocomplete` attributes on forms |
| 1.4.1 Use of Color | ⬜ | Color not sole indicator; icons/text supplementary |
| 1.4.2 Audio Control | N/A | No auto-playing audio |
| 1.4.3 Contrast (Minimum) | ⬜ | 4.5:1 text, 3:1 large text |
| 1.4.4 Resize Text | ⬜ | Functional up to 200% zoom |
| 1.4.5 Images of Text | ⬜ | No images of text |
| 1.4.10 Reflow | ⬜ | No horizontal scroll at 320px width |
| 1.4.11 Non-text Contrast | ⬜ | UI components 3:1 contrast |
| 1.4.12 Text Spacing | ⬜ | Functional with increased spacing |
| 1.4.13 Hover/Focus Content | ⬜ | Dismissable, hoverable, persistent |

### 2. Operable

| Criterion | Status | Notes |
|-----------|--------|-------|
| 2.1.1 Keyboard | ⬜ | All functionality via keyboard |
| 2.1.2 No Keyboard Trap | ⬜ | Focus always escapable |
| 2.1.4 Character Key Shortcuts | ⬜ | Remappable or disablable |
| 2.2.1 Timing Adjustable | N/A | No time limits |
| 2.2.2 Pause, Stop, Hide | ⬜ | Animations respect `prefers-reduced-motion` |
| 2.3.1 Three Flashes | N/A | No flashing content |
| 2.4.1 Bypass Blocks | ⬜ | Skip nav link present |
| 2.4.2 Page Titled | ⬜ | Descriptive `<title>` per route |
| 2.4.3 Focus Order | ⬜ | Logical tab order |
| 2.4.4 Link Purpose | ⬜ | Descriptive link text or `aria-label` |
| 2.4.5 Multiple Ways | ⬜ | Nav + search available |
| 2.4.6 Headings and Labels | ⬜ | Descriptive, hierarchical |
| 2.4.7 Focus Visible | ⬜ | Visible focus ring (Tailwind `focus-visible:ring`) |
| 2.4.11 Focus Not Obscured (Min) | ⬜ | Focused element not fully hidden |
| 2.5.1 Pointer Gestures | ⬜ | Single pointer for all actions |
| 2.5.2 Pointer Cancellation | ⬜ | `mouseup`/`click` not `mousedown` |
| 2.5.3 Label in Name | ⬜ | Accessible name matches visible label |
| 2.5.4 Motion Actuation | N/A | No motion-based triggers |

### 3. Understandable

| Criterion | Status | Notes |
|-----------|--------|-------|
| 3.1.1 Language of Page | ⬜ | `lang` attribute on `<html>` |
| 3.1.2 Language of Parts | ⬜ | Lang changes for mixed content |
| 3.2.1 On Focus | ⬜ | No context change on focus |
| 3.2.2 On Input | ⬜ | Predictable behavior on input |
| 3.2.3 Consistent Navigation | ⬜ | Nav location consistent |
| 3.2.4 Consistent Identification | ⬜ | Same icons/labels same function |
| 3.3.1 Error Identification | ⬜ | Errors described in text |
| 3.3.2 Labels or Instructions | ⬜ | All form fields labeled |
| 3.3.3 Error Suggestion | ⬜ | Correction suggestions provided |
| 3.3.4 Error Prevention | ⬜ | Confirmation for legal/financial actions |
| 3.3.7 Redundant Entry | ⬜ | Previously entered info auto-filled |
| 3.3.8 Accessible Authentication (Min) | ⬜ | No cognitive test for auth |

### 4. Robust

| Criterion | Status | Notes |
|-----------|--------|-------|
| 4.1.2 Name, Role, Value | ⬜ | ARIA roles on custom components |
| 4.1.3 Status Messages | ⬜ | `role="status"` for live regions |

## Testing Procedure

1. Run `axe-core` scan on every page
2. Run `a11y.spec.ts` in Playwright
3. Manual keyboard-only walkthrough
4. Screen reader walkthrough (primary flows)
5. Lighthouse a11y audit (target: ≥ 90)
