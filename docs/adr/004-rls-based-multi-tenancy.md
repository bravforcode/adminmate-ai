# ADR 004: RLS-Based Multi-Tenancy

## Status

**Accepted**

Date: 2024-02-01

## Context

AdminMate AI is a multi-tenant SaaS application where multiple organizations share a single PostgreSQL database. Each organization's data must be completely isolated — users from Organization A must never access, modify, or even see data from Organization B.

The challenges:

- Data isolation must be enforced at the database level, not just application code
- The same database tables serve all tenants
- Queries must be automatically scoped to the authenticated user's organization
- Admin users should only see their own organization's data
- No tenant should be able to escalate privileges to access other tenants' data

We evaluated application-level isolation, schema-per-tenant, database-per-tenant, and row-level security approaches.

## Decision

We use **Supabase Row-Level Security (RLS)** policies to enforce multi-tenancy at the database level.

Every table includes an `organization_id` column. RLS policies automatically filter queries based on the authenticated user's `organization_id` claim from their JWT token. This means:

1. **All data is filtered at the database layer** — even if application code has a bug, the database rejects unauthorized access
2. **RLS policies are declarative** — defined in SQL migrations, reviewed, version-controlled, and tested
3. **Service role bypass** — Admin operations that need cross-tenant visibility (e.g., platform analytics) use the service role key, which bypasses RLS
4. **No application-level filtering needed** — Components and services don't need to manually add `WHERE organization_id = X` to every query

Example RLS policy:
```sql
CREATE POLICY "Users can only see their org's data"
ON employees FOR SELECT
USING (organization_id = auth.jwt() ->> 'organization_id');
```

## Consequences

### Positive

- **Defense in depth** — Data isolation enforced at the database level, not just application code
- **Simpler application code** — No need to manually scope every query with tenant filters
- **Consistent enforcement** — Every query (REST, RPC, direct) is automatically filtered
- **Audit-friendly** — RLS policies are SQL objects that can be reviewed, tested, and version-controlled
- **Leverages PostgreSQL** — Uses native database security features, not custom middleware

### Negative

- **RLS complexity** — Policies can become complex for tables with multiple access patterns (read vs. write vs. admin)
- **Performance considerations** — RLS adds a WHERE clause to every query; proper indexing on `organization_id` is critical
- **Debugging difficulty** — RLS denials return empty results (not errors), which can be confusing to diagnose
- **Migration risk** — Adding RLS to existing tables requires careful migration to avoid breaking existing queries

### Risks

- Misconfigured RLS policies could leak data between tenants (mitigated by comprehensive testing)
- The service role key must never be exposed to the client (mitigated by env var management and Vercel server-side only)
- Edge functions that bypass RLS must be carefully audited

## Alternatives Considered

1. **Application-level filtering** — Rejected because: relies on every developer remembering to add tenant scoping to every query. One missed filter = data leak. No defense in depth.
2. **Schema-per-tenant** — Rejected because: creates database explosion with hundreds of schemas, makes migrations painful, and complicates cross-tenant analytics.
3. **Database-per-tenant** — Rejected because: highest isolation but enormous operational overhead. Not feasible for a SaaS with many small tenants.

## References

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-tenancy Patterns](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
