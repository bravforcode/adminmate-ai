# ADR 002: Supabase as Backend

## Status

**Accepted**

Date: 2024-01-15

## Context

AdminMate AI needed a backend platform that provides:

- Authentication and authorization
- PostgreSQL database with real-time capabilities
- Row-Level Security for multi-tenancy
- File storage for documents and avatars
- Edge functions for custom business logic
- Fast setup with minimal DevOps overhead

We evaluated several options: raw PostgreSQL + Express, Firebase, Supabase, and AWS Amplify.

## Decision

We chose **Supabase** as the primary backend platform for AdminMate AI.

Supabase provides a hosted PostgreSQL database with built-in authentication, Row-Level Security, storage, and edge functions — all accessible through a REST API and client libraries. It eliminates the need to manage database infrastructure, auth servers, or storage systems separately.

## Consequences

### Positive

- **Rapid development** — Auth, database, storage, and functions available out of the box
- **PostgreSQL power** — Full SQL access, migrations, indexes, and extensions
- **Row-Level Security** — Multi-tenancy enforced at the database level without application code
- **Client libraries** — Official TypeScript/JavaScript SDK with strong type safety
- **Real-time subscriptions** — Built-in support for live data updates
- **Hosted infrastructure** — No server management, auto-scaling, backups handled by Supabase

### Negative

- **Vendor dependency** — Tied to Supabase's infrastructure and pricing model
- **Edge function limitations** — Deno-based runtime with limited Node.js ecosystem compatibility
- **Free tier limits** — Database size, bandwidth, and auth MAU caps require monitoring
- **Local development** — Supabase CLI local stack adds complexity to onboarding

### Risks

- Supabase pricing changes could impact costs at scale
- Edge function cold starts may affect latency for infrequently used endpoints
- Migration away from Supabase would require significant refactoring

## Alternatives Considered

1. **Firebase** — Rejected because: no SQL, limited querying capabilities, vendor lock-in is deeper, pricing scales poorly for database-heavy workloads.
2. **Raw PostgreSQL + Express** — Rejected because: requires building auth, storage, and security infrastructure from scratch. Higher maintenance burden.
3. **AWS Amplify** — Rejected because: complex configuration, less intuitive developer experience, harder to reason about costs.

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Project README](../README.md)
