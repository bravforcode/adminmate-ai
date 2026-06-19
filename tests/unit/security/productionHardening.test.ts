import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { securityAuditService } from '../../../src/services/security/securityAuditService'

function createChainable(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['insert', 'select', 'eq', 'order', 'range', 'gte', 'lte', 'upsert']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn(() => Promise.resolve(result))
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return chain
}

describe('productionHardening — security audit service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logSecurityAudit', () => {
    it('logs a security audit event with default severity', async () => {
      const chainResult = {
        data: {
          id: '1',
          company_id: 'comp-1',
          event_type: 'rls_check_failed',
          severity: 'info',
          detected_at: new Date().toISOString(),
        },
        error: null,
      }
      mockFrom.mockReturnValue(createChainable(chainResult))

      const result = await securityAuditService.logSecurityAudit({
        company_id: 'comp-1',
        event_type: 'rls_check_failed',
      })

      expect(result).not.toBeNull()
      expect(mockFrom).toHaveBeenCalledWith('security_audit_log')
    })

    it('logs a critical security event with details', async () => {
      const chainResult = {
        data: {
          id: '2',
          company_id: 'comp-1',
          event_type: 'unauthorized_access',
          severity: 'critical',
          details: { ip: '1.2.3.4' },
          detected_at: new Date().toISOString(),
        },
        error: null,
      }
      mockFrom.mockReturnValue(createChainable(chainResult))

      const result = await securityAuditService.logSecurityAudit({
        company_id: 'comp-1',
        event_type: 'unauthorized_access',
        severity: 'critical',
        details: { ip: '1.2.3.4' },
      })

      expect(result).not.toBeNull()
      expect(result?.severity).toBe('critical')
    })

    it('returns null on insert failure', async () => {
      const chainResult = { data: null, error: { message: 'permission denied' } }
      mockFrom.mockReturnValue(createChainable(chainResult))

      const result = await securityAuditService.logSecurityAudit({
        company_id: 'comp-1',
        event_type: 'test',
      })

      expect(result).toBeNull()
    })
  })

  describe('verifyRLS', () => {
    it('records verification results for each table', async () => {
      mockRpc.mockResolvedValue({
        data: [{ policy_name: 'test_policy', is_active: true }],
        error: null,
      })
      mockFrom.mockReturnValue(createChainable({ error: null }))

      const results = await securityAuditService.verifyRLS(['companies'])

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].verification_status).toBe('pass')
    })

    it('records error when RPC fails', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'function not found' },
      })
      mockFrom.mockReturnValue(createChainable({ error: null }))

      const results = await securityAuditService.verifyRLS(['nonexistent_table'])

      expect(results[0].verification_status).toBe('error')
    })

    it('records missing when no policies found', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      mockFrom.mockReturnValue(createChainable({ error: null }))

      const results = await securityAuditService.verifyRLS(['bare_table'])

      expect(results[0].verification_status).toBe('missing')
    })
  })

  describe('snapshotRBACMatrix', () => {
    it('captures role-permission matrix and upserts', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'roles') {
          return createChainable({ data: [{ id: 'r1', name: 'owner' }], error: null })
        }
        if (table === 'permissions') {
          return createChainable({
            data: [{ id: 'p1', resource: 'candidate', action: 'read' }],
            error: null,
          })
        }
        if (table === 'role_permissions') {
          return createChainable({
            data: [{ role_id: 'r1', permission_id: 'p1' }],
            error: null,
          })
        }
        if (table === 'rbac_matrix_snapshots') {
          return createChainable({ error: null })
        }
        return createChainable({ data: [], error: null })
      })

      const entries = await securityAuditService.snapshotRBACMatrix('comp-1')

      expect(entries.length).toBeGreaterThan(0)
      expect(entries[0]).toHaveProperty('role')
      expect(entries[0]).toHaveProperty('resource')
      expect(entries[0]).toHaveProperty('action')
      expect(entries[0]).toHaveProperty('is_allowed')
    })
  })

  describe('getSecurityAuditLog', () => {
    it('returns paginated logs', async () => {
      const chainResult = {
        data: [{ id: '1', event_type: 'test', severity: 'info' }],
        error: null,
        count: 1,
      }
      mockFrom.mockReturnValue(createChainable(chainResult))

      const result = await securityAuditService.getSecurityAuditLog('comp-1', { page: 1 })

      expect(result.logs).toBeDefined()
      expect(result.total).toBeDefined()
    })
  })
})

describe('productionHardening — route protection audit', () => {
  it('all authenticated routes have AuthGuard wrapping', () => {
    const routerPath = join(process.cwd(), 'src', 'router', 'index.tsx')
    const content = readFileSync(routerPath, 'utf-8')

    const routePatterns = [
      '/dashboard',
      '/recruitment/candidates',
      '/recruitment/jobs',
      '/recruitment/pipeline',
      '/recruitment/interviews',
      '/documents',
      '/hiring',
      '/onboarding',
      '/reports',
      '/settings',
      '/settings/security',
      '/settings/compliance',
      '/settings/audit-log',
      '/settings/billing',
      '/settings/pdpa',
      '/settings/import',
      '/settings/notifications',
    ]

    for (const route of routePatterns) {
      const routeIndex = content.indexOf(`path: '${route}'`)
      if (routeIndex === -1) continue

      const surroundingCode = content.substring(
        Math.max(0, routeIndex - 500),
        Math.min(content.length, routeIndex + 500)
      )

      const hasAuthGuard = surroundingCode.includes('AuthGuard')
      expect(hasAuthGuard, `Route ${route} must be wrapped with AuthGuard`).toBe(true)
    }
  })

  it('public routes are explicitly listed and not accidentally protected', () => {
    const routerPath = join(process.cwd(), 'src', 'router', 'index.tsx')
    const content = readFileSync(routerPath, 'utf-8')

    const publicRoutes = ['/', '/login', '/register', '/pricing', '/terms', '/privacy', '/cookies']
    for (const route of publicRoutes) {
      const routeRegex = new RegExp(`path: ['"]${route.replace('/', '\\/')}['"]`)
      expect(content).toMatch(routeRegex)
    }
  })
})

describe('productionHardening — RLS completeness audit', () => {
  it('all application tables have RLS enabled in migrations', () => {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
    const { readdirSync } = require('fs')

    const sqlFiles = readdirSync(migrationsDir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort()

    let allSql = ''
    for (const file of sqlFiles) {
      allSql += readFileSync(join(migrationsDir, file), 'utf-8') + '\n'
    }

    const createTableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(/g
    const tables: string[] = []
    let match: RegExpExecArray | null

    while ((match = createTableRegex.exec(allSql)) !== null) {
      tables.push(match[1])
    }

    const excludedTables = ['schema_migrations', 'pg_stat_statements']
    const systemTables = ['storage.buckets', 'storage.objects', 'auth.users', 'auth.sessions']

    for (const table of tables) {
      if (excludedTables.includes(table)) continue
      if (systemTables.some(st => table.startsWith(st))) continue

      const rlsPattern = new RegExp(
        `ALTER TABLE ${table}\\s+ENABLE ROW LEVEL SECURITY`,
        'i'
      )
      const hasRls = rlsPattern.test(allSql)
      expect(hasRls, `Table ${table} must have RLS enabled`).toBe(true)
    }
  })
})

describe('productionHardening — storage bucket security', () => {
  it('sensitive buckets are not public', () => {
    const bucketsPath = join(
      process.cwd(),
      'supabase',
      'migrations',
      '20240101000025_storage_buckets.sql'
    )
    const content = readFileSync(bucketsPath, 'utf-8')

    const sensitiveBuckets = ['cv-uploads', 'generated-docs', 'exports']
    for (const bucket of sensitiveBuckets) {
      const bucketRegex = new RegExp(
        `('${bucket}',\\s*'${bucket}',\\s*false)`,
      )
      expect(content, `Bucket ${bucket} must have public=false`).toMatch(bucketRegex)
    }
  })

  it('onboarding documents bucket is not public', () => {
    const migrationPath = join(
      process.cwd(),
      'supabase',
      'migrations',
      '20240620000017_onboarding_documents_contracts.sql'
    )
    const content = readFileSync(migrationPath, 'utf-8')

    if (content.includes('storage.buckets')) {
      const bucketRegex = /'onboarding-docs',\s*'onboarding-docs',\s*false/
      expect(content, 'onboarding-docs bucket must have public=false').toMatch(bucketRegex)
    }
  })
})

describe('productionHardening — no fake integration states', () => {
  it('no hardcoded fake integration status values', () => {
    const srcDir = join(process.cwd(), 'src')
    const { readdirSync, statSync } = require('fs')

    function findTsFiles(dir: string): string[] {
      const files: string[] = []
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry)
        if (statSync(fullPath).isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
          files.push(...findTsFiles(fullPath))
        } else if (/\.(ts|tsx)$/.test(entry)) {
          files.push(fullPath)
        }
      }
      return files
    }

    const tsFiles = findTsFiles(srcDir)
    const fakePatterns = [
      /integration_status\s*[:=]\s*['"]connected['"]/gi,
      /integration_status\s*[:=]\s*['"]active['"]/gi,
      /status\s*[:=]\s*['"]connected['"]\s*\/\/\s*fake/gi,
      /isConnected\s*[:=]\s*true\s*\/\/\s*(hardcoded|fake|mock)/gi,
    ]

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8')
      for (const pattern of fakePatterns) {
        const matches = content.match(pattern)
        expect(
          matches,
          `Found fake integration state in ${file}: ${matches?.[0]}`
        ).toBeNull()
      }
    }
  })
})
