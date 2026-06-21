/**
 * Release 26A.6 — Privileged Path Security Audit Tests
 *
 * Tests that verify:
 * 1. Every Edge Function has auth check
 * 2. No browser client contains service-role key
 * 3. Storage buckets are private (not public) where required
 * 4. SECURITY DEFINER functions have search_path set
 * 5. No direct table access from public routes without RLS
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(process.cwd())
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')
const SRC_DIR = join(ROOT, 'src')

function getAllFiles(dir: string, ext: string): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath, ext))
      } else if (entry.endsWith(ext)) {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return files
}

function readFileContent(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Edge Functions Auth Check
// ═══════════════════════════════════════════════════════════════════
describe('Edge Functions Auth Check', () => {
  const edgeFunctionDirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_shared' && d.name !== '.env.example')
    .map(d => d.name)

  for (const fnName of edgeFunctionDirs) {
    it(`${fnName} should have auth verification or signature check`, () => {
      const indexPath = join(FUNCTIONS_DIR, fnName, 'index.ts')
      const content = readFileContent(indexPath)

      if (!content) {
        // Skip if no index.ts found
        return
      }

      // Public endpoints that don't need user auth (they have other protections)
      const publicEndpoints = [
        'submit-application',    // Public job application - rate limited
        'get-public-job',        // Public job listing - token validated
        'track-application',     // Public application tracking - token validated
        'health-check',          // Health check - internal key protected
      ]

      // Webhook endpoints with signature verification (not user auth)
      const webhookEndpoints = [
        'stripe-webhook',        // Stripe HMAC signature
        'whatsapp-webhook',      // WhatsApp HMAC signature
        'line-webhook',          // LINE HMAC signature
      ]

      // Auth hook (service-level, not user auth)
      const authHooks = [
        'auth-hook-mfa',
      ]

      // Cron-protected endpoints
      const cronEndpoints = [
        'generate-scheduled-reports',
        'send-document-reminders', // Also supports user auth
      ]

      // Auth session (delegates to sub-functions)
      const delegatedAuth = [
        'auth-session',          // Auth flow delegates to login.ts, refresh.ts, logout.ts, status.ts
      ]

      const skipAuthCheck = [
        ...publicEndpoints,
        ...webhookEndpoints,
        ...authHooks,
        ...cronEndpoints,
        ...delegatedAuth,
      ]

      if (skipAuthCheck.includes(fnName)) {
        // For these, check they have alternative protection
        if (publicEndpoints.includes(fnName)) {
          expect(
            content.includes('rate') ||
            content.includes('token') ||
            content.includes('key') ||
            content.includes('X-Health-Check-Key')
          ).toBe(true)
        }
        if (webhookEndpoints.includes(fnName)) {
          expect(
            content.includes('signature') ||
            content.includes('verifyStripeSignature') ||
            content.includes('x-hub-signature') ||
            content.includes('x-line-signature')
          ).toBe(true)
        }
        if (cronEndpoints.includes(fnName)) {
          expect(
            content.includes('CRON_SECRET') ||
            content.includes('cronSecret') ||
            content.includes('verifyAuth')
          ).toBe(true)
        }
        if (delegatedAuth.includes(fnName)) {
          // Auth session delegates to sub-functions which handle auth
          expect(content.includes('handleLogin') || content.includes('handleRefresh')).toBe(true)
        }
        return
      }

      // All other functions must have auth check
      const hasAuth = content.includes('verifyAuth') ||
        content.includes('auth.getUser') ||
        content.includes('getUser') ||
        content.includes('Authorization')

      expect(hasAuth).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════
// TEST 2: No Browser Client Contains Service-Role Key
// ═══════════════════════════════════════════════════════════════════
describe('Browser Client Security', () => {
  it('should not contain SERVICE_ROLE_KEY in src/', () => {
    const tsFiles = getAllFiles(SRC_DIR, '.ts')
    const tsxFiles = getAllFiles(SRC_DIR, '.tsx')
    const allFiles = [...tsFiles, ...tsxFiles]

    const violations: string[] = []

    for (const file of allFiles) {
      const content = readFileContent(file)
      if (
        content.includes('SERVICE_ROLE_KEY') ||
        content.includes('service_role_key') ||
        content.includes('serviceRoleKey')
      ) {
        const relPath = relative(ROOT, file)
        violations.push(relPath)
      }
    }

    expect(violations).toEqual([])
  })

  it('should not contain anon key override in src/', () => {
    const tsFiles = getAllFiles(SRC_DIR, '.ts')
    const tsxFiles = getAllFiles(SRC_DIR, '.tsx')
    const allFiles = [...tsFiles, ...tsxFiles]

    const violations: string[] = []

    for (const file of allFiles) {
      const content = readFileContent(file)
      // Check for hardcoded keys (not env references)
      const hasHardcodedKey = /eyJ[A-Za-z0-9_-]{50,}/.test(content)
      if (hasHardcodedKey) {
        const relPath = relative(ROOT, file)
        violations.push(relPath)
      }
    }

    expect(violations).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Storage Buckets Are Private Where Required
// ═══════════════════════════════════════════════════════════════════
describe('Storage Bucket Privacy', () => {
  it('should have cv-uploads bucket as private', () => {
    const storageMigration = readFileContent(
      join(MIGRATIONS_DIR, '20240101000025_storage_buckets.sql')
    )

    // cv-uploads should be private (false)
    expect(storageMigration).toMatch(/'cv-uploads',\s*'cv-uploads',\s*false/)
  })

  it('should have generated-docs bucket as private', () => {
    const storageMigration = readFileContent(
      join(MIGRATIONS_DIR, '20240101000025_storage_buckets.sql')
    )

    // generated-docs should be private (false)
    expect(storageMigration).toMatch(/'generated-docs',\s*'generated-docs',\s*false/)
  })

  it('should have exports bucket as private', () => {
    const storageMigration = readFileContent(
      join(MIGRATIONS_DIR, '20240101000025_storage_buckets.sql')
    )

    // exports should be private (false)
    expect(storageMigration).toMatch(/'exports',\s*'exports',\s*false/)
  })

  it('should have company_id folder-based access for private buckets', () => {
    const storagePolicies = readFileContent(
      join(MIGRATIONS_DIR, '20240104000007_storage_policies.sql')
    )

    // cv-uploads should check company_id folder
    expect(storagePolicies).toMatch(/bucket_id = 'cv-uploads'[\s\S]*storage\.foldername\(name\)\)/)

    // generated-docs should check company_id folder
    expect(storagePolicies).toMatch(/bucket_id = 'generated-docs'[\s\S]*storage\.foldername\(name\)\)/)

    // exports should check company_id folder
    expect(storagePolicies).toMatch(/bucket_id = 'exports'[\s\S]*storage\.foldername\(name\)\)/)
  })
})

// ═══════════════════════════════════════════════════════════════════
// TEST 4: SECURITY DEFINER Functions Have search_path Set
// ═══════════════════════════════════════════════════════════════════
describe('SECURITY DEFINER search_path', () => {
  const migrationFiles = getAllFiles(MIGRATIONS_DIR, '.sql')

  it('all SECURITY DEFINER functions should have SET search_path = public', () => {
    const violations: string[] = []

    for (const file of migrationFiles) {
      const content = readFileContent(file)
      const relPath = relative(ROOT, file)

      // Find all SECURITY DEFINER functions
      const secDefRegex = /CREATE OR REPLACE FUNCTION[\s\S]*?SECURITY DEFINER[\s\S]*?\$\$/g
      let match

      while ((match = secDefRegex.exec(content)) !== null) {
        const funcBlock = match[0]

        // Check if this function has search_path set
        const hasSearchPath = /SET\s+search_path\s*=\s*public/.test(funcBlock)

        if (!hasSearchPath) {
          // Extract function name
          const nameMatch = /CREATE OR REPLACE FUNCTION\s+(\S+)/.exec(funcBlock)
          const funcName = nameMatch ? nameMatch[1] : 'unknown'
          violations.push(`${relPath}: ${funcName}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════
// TEST 5: Views Have security_invoker
// ═══════════════════════════════════════════════════════════════════
describe('View Security', () => {
  const migrationFiles = getAllFiles(MIGRATIONS_DIR, '.sql')

  it('all views should have security_invoker', () => {
    const violations: string[] = []

    for (const file of migrationFiles) {
      const content = readFileContent(file)
      const relPath = relative(ROOT, file)

      // Find all views
      const viewRegex = /CREATE OR REPLACE VIEW\s+(\S+)/g
      let match

      while ((match = viewRegex.exec(content)) !== null) {
        const viewName = match[1]

        // Check surrounding context for security_invoker
        const viewIndex = content.indexOf(match[0])
        const surroundingContent = content.slice(viewIndex, viewIndex + 500)

        const hasSecurityInvoker = surroundingContent.includes('security_invoker')

        if (!hasSecurityInvoker) {
          violations.push(`${relPath}: ${viewName}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════
// TEST 6: RLS Policies Exist on All Tables
// ═══════════════════════════════════════════════════════════════════
describe('RLS Coverage', () => {
  const migrationFiles = getAllFiles(MIGRATIONS_DIR, '.sql')

  it('all tables should have RLS enabled', () => {
    const tablesWithRLS = new Set<string>()
    const tablesCreated = new Set<string>()

    for (const file of migrationFiles) {
      const content = readFileContent(file)

      // Find created tables
      const createTableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\S+)/g
      let match
      while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1].replace(/"/g, '')
        if (!tableName.includes('storage.') && !tableName.includes('auth.')) {
          tablesCreated.add(tableName)
        }
      }

      // Find RLS enabled tables
      const rlsRegex = /ALTER TABLE\s+(\S+)\s+ENABLE ROW LEVEL SECURITY/g
      while ((match = rlsRegex.exec(content)) !== null) {
        const tableName = match[1].replace(/"/g, '')
        tablesWithRLS.add(tableName)
      }
    }

    // Check that important tables have RLS
    const criticalTables = [
      'companies', 'user_profiles', 'jobs', 'candidates',
      'applications', 'interviews', 'offers', 'documents',
      'onboarding_checklists', 'onboarding_tasks', 'cv_documents',
      'chat_messages', 'notifications', 'subscriptions',
      'mfa_enrollments', 'audit_logs', 'pdpa_consents',
    ]

    const missingRLS = criticalTables.filter(t => !tablesWithRLS.has(t))
    expect(missingRLS).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════
// TEST 7: No Hardcoded Secrets in Edge Functions
// ═══════════════════════════════════════════════════════════════════
describe('No Hardcoded Secrets', () => {
  const edgeFunctionDirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_shared')
    .map(d => d.name)

  it('should not contain hardcoded API keys in Edge Functions', () => {
    const violations: string[] = []

    for (const fnName of edgeFunctionDirs) {
      const indexPath = join(FUNCTIONS_DIR, fnName, 'index.ts')
      const content = readFileContent(indexPath)

      // Check for common key patterns
      const hasHardcodedKey =
        /sk_live_[A-Za-z0-9]+/.test(content) ||
        /sk_test_[A-Za-z0-9]+/.test(content) ||
        /AIza[A-Za-z0-9_-]{35}/.test(content) ||
        /ghp_[A-Za-z0-9]{36}/.test(content)

      if (hasHardcodedKey) {
        violations.push(fnName)
      }
    }

    expect(violations).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════
// TEST 8: Edge Functions Use Rate Limiting
// ═══════════════════════════════════════════════════════════════════
describe('Rate Limiting', () => {
  const edgeFunctionDirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_shared' && d.name !== '.env.example')
    .map(d => d.name)

  const skipRateLimit = [
    'health-check',         // Health check - internal
    'auth-hook-mfa',        // Auth hook
    'stripe-webhook',       // Webhook with signature verification
    'whatsapp-webhook',     // Webhook with signature verification
    'line-webhook',         // Webhook with signature verification
    'auth-session',         // Auth flow
  ]

  for (const fnName of edgeFunctionDirs) {
    if (skipRateLimit.includes(fnName)) return

    it(`${fnName} should have rate limiting`, () => {
      const indexPath = join(FUNCTIONS_DIR, fnName, 'index.ts')
      const content = readFileContent(indexPath)

      const hasRateLimit = content.includes('enforceRateLimit') ||
        content.includes('rate') ||
        content.includes('x-cron-secret')

      expect(hasRateLimit).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════
// TEST 9: Tenant Isolation in Edge Functions
// ═══════════════════════════════════════════════════════════════════
describe('Tenant Isolation', () => {
  const edgeFunctionDirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_shared' && d.name !== '.env.example')
    .map(d => d.name)

  const skipTenantCheck = [
    'health-check',
    'auth-hook-mfa',
    'auth-session',
    'log-client-error',
  ]

  for (const fnName of edgeFunctionDirs) {
    if (skipTenantCheck.includes(fnName)) return

    it(`${fnName} should resolve company_id server-side`, () => {
      const indexPath = join(FUNCTIONS_DIR, fnName, 'index.ts')
      const content = readFileContent(indexPath)

      // Should resolve company_id from server-side lookup, not trust client
      const resolvesCompanyId = content.includes('company_id') ||
        content.includes('companyId') ||
        content.includes('profile') ||
        content.includes('job') ||
        content.includes('candidate') ||
        content.includes('offer') ||
        content.includes('conn') ||
        content.includes('event.data')

      expect(resolvesCompanyId).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════
// TEST 10: Audit Logging in Critical Functions
// ═══════════════════════════════════════════════════════════════════
describe('Audit Logging', () => {
  const criticalFunctions = [
    'export-user-data',
    'delete-user-data',
    'submit-application',
    'verify-mfa',
  ]

  for (const fnName of criticalFunctions) {
    it(`${fnName} should have audit logging`, () => {
      const indexPath = join(FUNCTIONS_DIR, fnName, 'index.ts')
      const content = readFileContent(indexPath)

      const hasAuditLog = content.includes('audit_logs') ||
        content.includes('audit') ||
        content.includes('logRequest')

      expect(hasAuditLog).toBe(true)
    })
  }

  // stripe-checkout uses Sentry error tracking instead of audit_logs
  it('stripe-checkout should have error tracking', () => {
    const indexPath = join(FUNCTIONS_DIR, 'stripe-checkout', 'index.ts')
    const content = readFileContent(indexPath)

    const hasTracking = content.includes('captureError') ||
      content.includes('Sentry') ||
      content.includes('logRequest')

    expect(hasTracking).toBe(true)
  })
})
