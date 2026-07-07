# Contributing to AdminMate AI

Thank you for considering contributing to AdminMate AI! This guide covers the workflow, standards, and conventions for contributing to this project.

---

## Pull Request Workflow

1. **Fork** the repository to your GitHub account.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/adminmate-ai.git
   cd adminmate-ai
   ```
3. **Create a branch** from `main` using the naming convention below.
4. **Make your changes** with atomic commits following conventional commits.
5. **Push** your branch to your fork.
6. **Open a Pull Request** against `main` with a clear title and description.
7. **Review** — address reviewer feedback until approved.
8. **Merge** — maintainers will merge after approval and CI passes.

---

## Branch Naming

Use the following prefixes:

| Prefix     | Purpose                          |
|------------|----------------------------------|
| `feat/*`   | New features                     |
| `fix/*`    | Bug fixes                        |
| `docs/*`   | Documentation only               |
| `test/*`   | Test additions or improvements   |

Examples:
- `feat/staff-analytics-dashboard`
- `fix/payroll-calculation-rounding`
- `docs/api-reference-update`
- `test/e2e-payroll-workflow`

---

## Test Requirements

Before submitting a PR, ensure:

```bash
# All tests pass
npm run test

# Type checking passes
npm run type-check

# Linting passes
npm run lint
```

PRs with failing tests or type errors will not be merged.

---

## Code Style

- **ESLint** is enforced — run `npm run lint` to check.
- **Prettier** handles formatting — run `npm run format` to auto-fix.
- Configure your editor to format on save for consistency.

---

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix       | When to use                                      |
|--------------|--------------------------------------------------|
| `feat:`      | New feature                                      |
| `fix:`       | Bug fix                                          |
| `docs:`      | Documentation only                               |
| `test:`      | Adding or updating tests                         |
| `refactor:`  | Code change that neither fixes a bug nor adds a feature |
| `chore:`     | Maintenance tasks (deps, config, CI)             |

Examples:
```
feat: add staff analytics dashboard
fix: correct payroll tax calculation rounding
docs: add ADR for Supabase backend decision
test: add load tests for auth and search endpoints
refactor: extract payroll calculation into service layer
```

---

## Security

- **Never commit secrets** (API keys, passwords, tokens) to the repository.
- `.env.local` and `.env` are gitignored — never override this.
- Report security vulnerabilities **privately** by emailing the maintainers or opening a private security advisory on GitHub.
- Do not open public issues for security vulnerabilities.

---

## Architecture

AdminMate AI follows these architectural patterns:

### Service Layer
Business logic lives in service files under `src/services/`. Components call services, not the database directly.

### State Management
- **Zustand** for client-side UI state (auth store, UI store, etc.)
- **React Query (TanStack Query)** for server state — caching, refetching, mutations

### Multi-Tenancy
- **Row-Level Security (RLS)** on Supabase ensures tenant isolation at the database level.
- All queries are scoped to the authenticated user's organization.

### Backend
- **Supabase** provides authentication, PostgreSQL database, storage, and edge functions.
- **httpOnly cookies** for session management (no tokens in localStorage).

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Run tests
npm run test
```

---

## Questions?

Open a discussion or reach out to the maintainers. We're happy to help!
