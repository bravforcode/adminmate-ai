import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('../../../src/services/permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import { importService } from '../../../src/services/importExport/importService'
import { exportService } from '../../../src/services/importExport/exportService'
import { hasPermission } from '../../../src/services/permissionService'

// Simple mock that resolves as a Supabase-like chain
function mockSingle(data: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
        order: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error }),
    }),
  }
}

describe('importService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createImportJob requires import_export_write permission', async () => {
    vi.mocked(hasPermission).mockResolvedValueOnce(false)
    await expect(
      importService.createImportJob('c1', 'candidates', 'file.csv', 'u1')
    ).rejects.toThrow('Permission denied')
  })

  it('createImportJob inserts job on success', async () => {
    mockSupabase.from.mockReturnValue(mockSingle({ id: 'j1', company_id: 'c1', entity_type: 'candidates', status: 'pending' }))
    const result = await importService.createImportJob('c1', 'candidates', 'file.csv', 'u1')
    expect(result.id).toBe('j1')
    expect(mockSupabase.from).toHaveBeenCalledWith('import_jobs')
  })

  it('getImportJob returns null on error', async () => {
    mockSupabase.from.mockReturnValue(mockSingle(null, { message: 'not found' }))
    const result = await importService.getImportJob('nonexistent')
    expect(result).toBeNull()
  })

  it('getImportJob returns job on success', async () => {
    mockSupabase.from.mockReturnValue(mockSingle({ id: 'j1', company_id: 'c1', entity_type: 'candidates' }))
    const result = await importService.getImportJob('j1')
    expect(result?.id).toBe('j1')
  })
})

describe('exportService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createExportJob requires import_export_write permission', async () => {
    vi.mocked(hasPermission).mockResolvedValueOnce(false)
    await expect(
      exportService.createExportJob('c1', 'candidates', {}, 'u1')
    ).rejects.toThrow('Permission denied')
  })

  it('createExportJob inserts job on success', async () => {
    mockSupabase.from.mockReturnValue(mockSingle({ id: 'e1', company_id: 'c1', entity_type: 'candidates', status: 'pending' }))
    const result = await exportService.createExportJob('c1', 'candidates', {}, 'u1')
    expect(result.id).toBe('e1')
    expect(mockSupabase.from).toHaveBeenCalledWith('export_jobs')
  })

  it('getExportJob returns null on error', async () => {
    mockSupabase.from.mockReturnValue(mockSingle(null, { message: 'not found' }))
    const result = await exportService.getExportJob('nonexistent')
    expect(result).toBeNull()
  })
})
