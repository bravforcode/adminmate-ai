# Release 30B — Production Promotion

**Gate:** J (GA)
**Status:** Draft
**Last Updated:** 2026-06-22

---

## Goal

Promote AdminMate AI from pilot/staging to production. Execute controlled production deployment with rollback capability.

## Scope

- Production deployment executed with blue-green or canary strategy
- DNS and SSL configured for production domain
- Production data migration plan executed
- Monitoring and alerting active from day one
- Rollback procedure tested and ready

## Required Work

1. Deployment strategy: blue-green, canary, or rolling update — team decides
2. DNS/SSL: production domain configured, certificates valid
3. Data migration: pilot customer data promoted to production, company_id isolation verified
4. Environment variables: production config loaded (no .env changes)
5. Monitoring: error rates, latency, Supabase metrics — alerting active
6. Rollback: procedure tested, team confident in execution under pressure
7. Smoke tests: core workflows validated in production post-deploy
8. Communication: team notified of production status, on-call roster set

## Non-Goals

- Multi-region deployment
- Auto-scaling configuration (can be post-GA)
- Full disaster recovery plan (can be post-GA)
- Customer-facing announcements

## Human Review Disclaimer

This document is AI-generated and requires human review before execution. Deployment strategy, data migration, and rollback procedures must be reviewed by engineering lead. DNS and SSL changes require infrastructure team sign-off. Production deployment should never proceed without explicit approval.
