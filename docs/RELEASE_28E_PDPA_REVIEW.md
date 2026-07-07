# Release 28E — PDPA Review

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Conduct a thorough review of all PDPA (Personal Data Protection Act B.E. 2562) compliance workflows in AdminMate AI, verifying that data collection, processing, storage, and deletion align with Thai data protection law requirements.

---

## Scope

### In Scope

1. **Consent Collection** — Verify consent is collected for all personal data processing activities.
2. **Consent Withdrawal** — Verify consent withdrawal workflow blocks further processing.
3. **Data Subject Rights** — Verify DSAR (Data Subject Access Request) workflow is complete.
4. **Data Minimization** — Verify only necessary personal data is collected per purpose.
5. **Purpose Limitation** — Verify data is not used beyond stated purpose.
6. **Retention Compliance** — Verify retention periods align with PDPA requirements.
7. **Breach Notification** — Verify breach notification workflow exists (even if manual).
8. **Cross-Border Transfer** — Verify cross-border data transfer restrictions are documented.
9. **Data Processor Agreements** — Verify third-party data processor agreements are tracked.
10. **Privacy Policy** — Verify privacy policy is current and accessible.
11. **PDPA Officer** — Verify DPO/privacy officer designation is recorded.
12. **UI States** — PDPA-related pages show correct truthful UI state.
13. **Permissions** — `pdpa:read`, `pdpa:write`, `pdpa:manage`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit all consent collection points across the application | P0 |
| 2 | Verify consent withdrawal blocks processing | P0 |
| 3 | Verify DSAR workflow is complete and functional | P0 |
| 4 | Verify data minimization across all forms and imports | P0 |
| 5 | Verify retention periods are configurable and enforced | P0 |
| 6 | Verify breach notification workflow exists | P1 |
| 7 | Verify cross-border transfer restrictions documented | P1 |
| 8 | Verify data processor agreements tracked | P1 |
| 9 | Verify privacy policy is current | P0 |
| 10 | Verify DPO designation recorded | P0 |
| 11 | Document all findings in PDPA compliance report | P0 |
| 12 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement automated PDPA compliance checking.
- This release does **not** provide legal advice on PDPA interpretation.
- This release does **not** implement PDPA filing with the Personal Data Protection Committee.
- This release does **not** implement real-time consent analytics.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> PDPA compliance requires qualified legal review. This release documents the system's current state and identifies gaps — it does not certify compliance.
