# Policy: Destructive Docker Commands

**Effective:** 2026-06-22
**Scope:** All AdminMate AI development, CI/CD, and operational contexts

---

## Forbidden Commands

The following commands are **BANNED** in all contexts unless explicitly approved by a human with backup verification:

```bash
# FORBIDDEN — destroys ALL containers on the machine
docker rm -f $(docker ps -aq)
docker stop $(docker ps -aq)
docker kill $(docker ps -aq)
docker container prune -f
docker system prune -f --all
```

**Why:** These commands destroy ALL Docker containers, not just AdminMate's. They can destroy databases, services, and projects unrelated to AdminMate.

---

## Allowed Commands

### Project-Scoped Cleanup (Supabase CLI)
```bash
# Safe — only affects AdminMate Supabase project
npx supabase stop
npx supabase stop --no-backup
npx supabase db reset
```

### Docker with Explicit Filters
```bash
# Safe — only affects containers with the project label
docker ps --filter "label=com.supabase.project=adminmate"
docker rm -f $(docker ps -aq --filter "label=com.supabase.project=adminmate")
```

### Docker Compose (if applicable)
```bash
# Safe — only affects project-defined services
docker compose down
docker compose down -v  # Only if explicitly approved
```

---

## Requirements for Destructive Operations

Before executing any destructive Docker command:

1. **Scope verification:** Confirm the command targets only AdminMate containers
2. **Backup check:** Verify critical data is backed up or recoverable
3. **Approval:** Get explicit approval from a human (not automated)
4. **Documentation:** Log the operation in the incident/change log

---

## Subagent Restrictions

Subagents spawned by this project MUST NOT use destructive Docker commands. If cleanup is needed:

1. Use `npx supabase stop` (preferred)
2. Use Docker filters with project label
3. Request explicit approval for any other cleanup

---

## Enforcement

- Pre-commit hook blocks Docker prune commands in scripts
- CI/CD pipelines use project-scoped cleanup only
- Code review flags any destructive Docker commands
