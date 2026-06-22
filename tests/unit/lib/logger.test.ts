import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('creates entries with correct schema', async () => {
    const { logger } = await import('../../../src/lib/logger')
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logger.info('test message', { key: 'value' })
    const arg = JSON.parse(spy.mock.calls[0][0] as string)

    expect(arg).toHaveProperty('correlation_id')
    expect(arg).toHaveProperty('timestamp')
    expect(arg.level).toBe('info')
    expect(arg.service).toBe('adminmate-web')
    expect(arg.message).toBe('test message')
    expect(arg.context).toEqual({ key: 'value' })
    spy.mockRestore()
  })

  it('redacts emails', async () => {
    const { logger } = await import('../../../src/lib/logger')
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logger.info('user is test@example.com')
    const arg = JSON.parse(spy.mock.calls[0][0] as string)
    expect(arg.message).toBe('user is [REDACTED_EMAIL]')
    spy.mockRestore()
  })

  it('redacts phone numbers', async () => {
    const { logger } = await import('../../../src/lib/logger')
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logger.info('call +1-555-123-4567')
    const arg = JSON.parse(spy.mock.calls[0][0] as string)
    expect(arg.message).toBe('call [REDACTED_PHONE]')
    spy.mockRestore()
  })

  it('redacts bearer tokens', async () => {
    const { logger } = await import('../../../src/lib/logger')
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logger.info('auth Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig')
    const arg = JSON.parse(spy.mock.calls[0][0] as string)
    expect(arg.message).toBe('auth Bearer [REDACTED_TOKEN]')
    spy.mockRestore()
  })

  it('correlation ID is consistent across log calls', async () => {
    const { logger } = await import('../../../src/lib/logger')
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logger.info('first')
    logger.info('second')
    const first = JSON.parse(spy.mock.calls[0][0] as string)
    const second = JSON.parse(spy.mock.calls[1][0] as string)
    expect(first.correlation_id).toBe(second.correlation_id)
    spy.mockRestore()
  })

  it('error level sends to remote endpoint', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)

    const { logger } = await import('../../../src/lib/logger')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.error('something failed')
    const arg = JSON.parse(spy.mock.calls[0][0] as string)
    expect(arg.level).toBe('error')

    await new Promise(r => setTimeout(r, 10))
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/log-client-error',
      expect.objectContaining({ method: 'POST' }),
    )
    spy.mockRestore()
  })

  it('uses correct console method per level', async () => {
    const { logger } = await import('../../../src/lib/logger')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(debugSpy).toHaveBeenCalledOnce()
    expect(infoSpy).toHaveBeenCalledOnce()
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledOnce()

    debugSpy.mockRestore()
    infoSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
