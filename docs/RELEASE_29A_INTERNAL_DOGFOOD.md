# Release 29A — Internal Dogfood

**Gate:** I (Pilot)
**Status:** Draft
**Last Updated:** 2026-06-22

---

## Goal

Validate AdminMate AI core functionality by deploying to internal team members only. Identify critical bugs, UX friction, and performance issues before any external exposure.

## Scope

- Deploy to internal staging environment with production-like data
- Internal team (engineering, product, support) uses AdminMate AI as daily driver for real admin tasks
- Collect structured feedback via internal channel or form
- Monitor error rates, response latency, and token consumption
- Fix P0/P1 bugs discovered during dogfood

## Required Work

1. Internal staging environment provisioned with realistic tenant data (company_id isolation verified)
2. Feature flags set to internal-only access
3. Feedback collection mechanism live (Slack channel, form, or issue tracker)
4. Monitoring dashboards active: error rates, p50/p95 latency, Supabase query performance
5. Bug triage process defined: who fixes what, SLA for P0 (<4h), P1 (<24h)
6. Daily standup or async check-in during dogfood window (min 5 business days)
7. Exit criteria documented and agreed upon before dogfood begins

## Non-Goals

- External user access
- Production data migration
- Marketing or announcement of any kind
- Performance optimization beyond critical path fixes
- New feature development during dogfood window

## Human Review Disclaimer

This document is AI-generated and requires human review before execution. All exit criteria, SLAs, and scope boundaries should be validated by the team lead before dogfood begins. Environment configurations and data seeding scripts must be reviewed by engineering.
