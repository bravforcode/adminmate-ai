# Release 30D — Hypercare

**Gate:** J (GA)
**Status:** Draft
**Last Updated:** 2026-06-22

---

## Goal

Provide elevated support and monitoring for the first 2-4 weeks post-GA. Catch and resolve production issues quickly.

## Scope

- 24/7 or extended-hours on-call coverage
- Daily health checks for first two weeks
- Priority issue resolution (P0: 1h, P1: 4h, P2: 24h)
- Customer-facing status page or communication channel
- Weekly hypercare review meetings

## Required Work

1. On-call rotation: team members assigned, escalation defined
2. Daily health check: error rates, latency, Supabase performance, customer reports
3. Issue triage: priority definitions, resolution SLAs, communication templates
4. Status page: public or internal, showing system health
5. Weekly review: metrics, issues, customer feedback, risk assessment
6. Exit criteria: hypercare period ends when stability thresholds met for 7 consecutive days
7. Handoff plan: transition from hypercare to standard support

## Non-Goals

- Permanent 24/7 staffing
- Feature development during hypercare
- Customer expansion or new onboarding during hypercare
- Post-mortem for non-critical issues

## Human Review Disclaimer

This document is AI-generated and requires human review before execution. On-call schedules, SLAs, and exit criteria should be validated by the team lead. Customer communication during hypercare should be reviewed for tone and accuracy. Hypercare exit requires explicit sign-off.
