# Release 26E.8 — Localization, Timezone & RTL Verification

## Scope

Locale-aware rendering, timezone handling, RTL layout support, and internationalization (i18n) verification.

## Locale Infrastructure

| Component | Implementation |
|-----------|---------------|
| i18n framework | Custom (public/locales/ with 65 locale JSONs) |
| Number format | `Intl.NumberFormat` |
| Date format | `Intl.DateTimeFormat` |
| Currency | Locale-aware via config |
| Collation | Database-level (Supabase PostgreSQL) |

## Supported Locales

65 locale files in `public/locales/`. Core locales:

| Locale | Language | RTL | Status |
|--------|----------|-----|--------|
| en | English | No | Primary |
| th | Thai | No | ✅ |
| zh-CN | Chinese (Simplified) | No | ✅ |
| ja | Japanese | No | ✅ |
| ar | Arabic | Yes | Verification needed |
| he | Hebrew | Yes | Verification needed |

## Timezone Handling

| Layer | Strategy |
|-------|----------|
| Database | UTC stored (`timestamptz`) |
| API responses | ISO 8601 with timezone |
| Frontend display | Converted via user locale preference |
| Scheduling | Server timezone for appointments, display in user TZ |
| Reports | Filter by timezone, aggregate in UTC |

## Verification Checklist

### Date/Time

- [ ] Dates display correctly in all supported locales
- [ ] Time conversion handles DST transitions
- [ ] Date pickers respect locale first-day-of-week
- [ ] 12h vs 24h format per locale
- [ ] Relative time ("2 hours ago") localized

### Numbers & Currency

- [ ] Decimal separators correct (1,000.00 vs 1.000,00)
- [ ] Currency symbol placement (prefix vs suffix)
- [ ] Negative number formatting
- [ ] Percentage formatting
- [ ] Large number abbreviation (1K, 1,000, 1.000)

### RTL Support

- [ ] Layout mirrors for RTL locales
- [ ] Text alignment correct (RTL: right-aligned)
- [ ] Navigation direction correct
- [ ] Form labels positioned correctly
- [ ] Icons that imply direction (arrows) are mirrored
- [ ] Tables with directional content handled

### Cultural

- [ ] Name order (given-family vs family-given)
- [ ] Address format varies by locale
- [ ] Phone number format validation locale-aware
- [ ] Holiday calendar locale-specific
- [ ] Color meanings (no cultural conflicts)

## Edge Cases

- Mixed LTR/RTL content (e.g., Arabic text with English brand name)
- Locale switch without page reload
- Deep links with locale prefix
- URL encoding for non-ASCII characters
- Database collation for sorting (Thai, Chinese, Japanese)
