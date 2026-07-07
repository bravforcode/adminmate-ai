# Release 28F — Global Privacy

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Extend privacy compliance beyond PDPA to cover global data protection frameworks (GDPR, CCPA, etc.) — establishing the architectural foundation for multi-jurisdiction privacy support.

---

## Scope

### In Scope

1. **Jurisdiction Privacy Profiles** — Configurable privacy rule sets per jurisdiction (PDPA, GDPR, CCPA, LGPD, PIPA).
2. **Data Classification** — Classify personal data by sensitivity level and jurisdiction applicability.
3. **Processing Activity Registry** — Record all personal data processing activities with legal basis.
4. **Lawful Basis Tracking** — Track legal basis for each processing activity (consent, contract, legitimate interest, etc.).
5. **Data Protection Impact Assessment (DPIA)** — Foundation for DPIA workflow for high-risk processing.
6. **Vendor Privacy Assessment** — Track third-party vendor privacy posture and agreements.
7. **Privacy Request Dashboard** — Centralized view of all privacy requests across jurisdictions.
8. **UI States** — Global privacy pages show correct truthful UI state.
9. **Permissions** — `privacy:read`, `privacy:write`, `privacy:manage`, `privacy:audit`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for global privacy tables | P0 |
| 2 | Implement jurisdiction privacy profile service | P0 |
| 3 | Implement data classification tagging | P0 |
| 4 | Implement processing activity registry | P0 |
| 5 | Implement lawful basis tracking | P0 |
| 6 | Build privacy dashboard UI | P1 |
| 7 | Write tests: jurisdiction profile correctly scoped, DPIA triggers | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement GDPR-specific Article 30 (Record of Processing Activities) in full detail.
- This release does **not** implement automated data subject request routing by jurisdiction.
- This release does **not** implement real-time privacy impact scoring.
- This release does **not** replace qualified DPO or legal counsel for privacy compliance.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Global privacy compliance is jurisdiction-specific and requires qualified legal review for each applicable framework.
