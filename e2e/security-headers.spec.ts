import { test, expect } from '@playwright/test'

const STAGING_URL = process.env.STAGING_URL || 'https://adminmate-g9m38o0dm-phirawits-projects.vercel.app'

test.describe('Security Headers — Staging', () => {
  test('X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get(STAGING_URL)
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get(STAGING_URL)
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })

  test('Strict-Transport-Security present with preload', async ({ request }) => {
    const res = await request.get(STAGING_URL)
    const hsts = res.headers()['strict-transport-security'] || ''
    expect(hsts).toContain('max-age=')
    expect(hsts).toContain('includeSubDomains')
    expect(hsts).toContain('preload')
  })
})
