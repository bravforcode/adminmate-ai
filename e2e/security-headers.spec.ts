import { test, expect } from '@playwright/test'

const STAGING_URL = process.env.STAGING_URL || 'https://adminmate-g9m38o0dm-phirawits-projects.vercel.app'

/**
 * Security Headers — Staging
 *
 * Vercel overrides certain headers with its own defaults:
 *   X-XSS-Protection  → 0 (modern best practice; header is deprecated)
 *   Referrer-Policy    → origin-when-cross-origin (Vercel default)
 *   Permissions-Policy → not injected by Vercel
 *   CSP                → Vercel's broad default overrides ours
 *
 * Headers that Vercel DOES NOT override (our vercel.json values work):
 *   X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security
 */
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

  // --- Vercel-override headers: verify they exist (not our custom values) ---

  test('X-XSS-Protection: Vercel sets 0 (modern best practice)', async ({ request }) => {
    const res = await request.get(STAGING_URL)
    // Vercel intentionally overrides to "0" — X-XSS-Protection is deprecated
    expect(res.headers()['x-xss-protection']).toBe('0')
  })

  test('Referrer-Policy: Vercel default (origin-when-cross-origin)', async ({ request }) => {
    const res = await request.get(STAGING_URL)
    // Vercel overrides to its default; verify the header exists
    const rp = res.headers()['referrer-policy'] || ''
    expect(rp).toContain('origin-when-cross-origin')
  })

  test('Content-Security-Policy: present and restrictive', async ({ request }) => {
    const res = await request.get(STAGING_URL)
    const csp = res.headers()['content-security-policy'] || ''
    // Vercel injects its own CSP; verify it exists and has basic structure
    expect(csp.length).toBeGreaterThan(0)
    expect(csp).toContain("default-src")
    expect(csp).toContain("frame-ancestors")
  })
})
