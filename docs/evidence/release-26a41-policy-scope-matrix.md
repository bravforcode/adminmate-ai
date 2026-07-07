# Release 26A.4.1 — CRUD Scope Matrix

## Tenant Tables (7)

| Table | SELECT | INSERT | UPDATE | DELETE | Test Nos |
|-------|--------|--------|--------|--------|----------|
| chat_messages | Company A ✅ / Company B blocked ✅ / Employee own-only ✅ | Cross-tenant blocked ✅ | Cross-tenant blocked ✅ / company_id immutable ✅ | Cross-tenant blocked ✅ / own-only (role) ✅ | T1-T10 |
| chat_platform_connections | Company A ✅ / Company B blocked ✅ | Cross-tenant blocked ✅ | Cross-tenant blocked ✅ / admin-only ✅ | Cross-tenant blocked ✅ / admin-only ✅ | T25-T28 |
| messages | Company A ✅ / Company B blocked ✅ / Employee sender-only ✅ | Cross-tenant blocked ✅ | Cross-tenant blocked ✅ | Cross-tenant blocked ✅ | T11-T18 |
| conversation_threads | Company A ✅ / Company B blocked ✅ / Employee participant-only ✅ | Cross-tenant blocked ✅ | Cross-tenant blocked ✅ | Cross-tenant blocked ✅ | T19-T24 |
| message_queue | Anonymous denied ✅ / Authenticated denied ✅ | Anonymous denied ✅ / Authenticated denied ✅ | N/A (service_role ALL) | N/A (service_role ALL) | T29-T32 |
| platform_sync_log | Anonymous denied ✅ / Authenticated denied ✅ | Anonymous denied ✅ / Authenticated denied ✅ | N/A (service_role ALL) | N/A (service_role ALL) | T33-T36 |
| system_health | Anonymous denied ✅ / Authenticated denied ✅ | Anonymous denied ✅ / Authenticated denied ✅ | N/A (service_role ALL) | N/A (service_role ALL) | T37-T40 |

## Global Reference Tables (4)

| Table | Auth SELECT | Company B SELECT | Auth INSERT | Auth UPDATE | Auth DELETE | Test Nos |
|-------|-------------|------------------|-------------|-------------|-------------|----------|
| document_type_configs | ✅ | ✅ | Denied ✅ | Denied ✅ | Denied ✅ | T41-T45 |
| immigration_case_types | ✅ | ✅ | Denied ✅ | Denied ✅ | Denied ✅ | T46-T50 |
| th_tax_brackets | ✅ | ✅ | Denied ✅ | Denied ✅ | Denied ✅ | T51-T55 |
| th_social_security_rules | ✅ | ✅ | Denied ✅ | Denied ✅ | Denied ✅ | T56-T60 |

## RLS Functions + Policy Conditions (10)

| Check | Test No |
|-------|---------|
| safe_user_company_id returns Company A | T61 |
| safe_user_company_id returns Company B | T62 |
| safe_user_role returns correct role | T63 |
| chat_select has company_id scoping | T64 |
| messages_select has company_id scoping | T65 |
| document_type_configs DELETE = service_role | T66 |
| th_tax_brackets DELETE = service_role | T67 |
| th_social_security_rules DELETE = service_role | T68 |
| immigration_case_types DELETE = service_role | T69 |
| message_queue ALL = service_role | T70 |

## RLS Enabled + Functions + Triggers (10)

| Check | Test No |
|-------|---------|
| chat_messages RLS enabled | T71 |
| messages RLS enabled | T72 |
| conversation_threads RLS enabled | T73 |
| chat_platform_connections RLS enabled | T74 |
| document_type_configs RLS enabled | T75 |
| th_tax_brackets RLS enabled | T76 |
| th_social_security_rules RLS enabled | T77 |
| update_updated_at_column exists | T78 |
| safe_user_company_id exists | T79 |
| chat_messages immutable trigger exists | T80 |

## Summary

- **11 unique tables** across 3 access classes:
  - 4 tenant-interactive tables (chat_messages, chat_platform_connections, messages, conversation_threads)
  - 3 service-only tenant operational tables (message_queue, platform_sync_log, system_health)
  - 4 global-reference tables (document_type_configs, immigration_case_types, th_tax_brackets, th_social_security_rules)
- **80 CRUD tests** covering all operations
- **140 pgTAP total** across all test files
