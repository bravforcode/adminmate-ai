# Branch Protection Rules

## Required Status Checks

The following GitHub Actions checks **must pass** before a PR can be merged into `main` or `develop`:

### CI Workflow (`ci.yml`)
| Check | Description |
|-------|-------------|
| **Lint & TypeCheck** | ESLint + `tsc --noEmit` |
| **Unit Tests** | `vitest run --coverage` (depends on lint) |
| **Build** | `vite build` (depends on tests) |

### Security Checks (`ci.yml`)
| Check | Description |
|-------|-------------|
| **Security Pattern Scan** | Detects `USING (true)` RLS, wildcard CORS, `@latest` imports |
| **Dependency Audit** | `npm audit --audit-level=high` |

### Governance (`ci-governance.yml`)
| Check | Description |
|-------|-------------|
| **Secret Scanning** | No hardcoded JWTs, Stripe keys, AWS keys |
| **Migration Validation** | Timestamp-named, ≥50 files |
| **Security Audit** | SECURITY DEFINER + security_invoker checks |
| **Test Count** | ≥1777 tests, zero failures |
| **Build Size** | No chunk > 500KB |

## Recommended Branch Protection Settings

### For `main`:
- Require pull request reviews (1 approval minimum)
- Require status checks to pass:
  - `ci / Lint & TypeCheck`
  - `ci / Unit Tests`
  - `ci / Build`
  - `ci / Security Pattern Scan`
  - `ci / Dependency Audit`
- Require branches to be up to date before merging
- Require conversation resolution
- Do not allow bypassing the above settings

### For `develop`:
- Require status checks to pass:
  - `ci / Lint & TypeCheck`
  - `ci / Unit Tests`
  - `ci / Build`

## Setup Instructions

1. Go to **Settings → Branches → Add branch protection rule**
2. Enter branch pattern: `main` (or `develop`)
3. Enable the checks listed above
4. Click **Create** / **Save changes**
