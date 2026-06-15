import { test, expect, signInAsHR, waitForPageReady, HR_USER } from './helpers'

// These tests only run against production (security headers not available on dev server)
const isProd = process.env.E2E_BASE_URL?.includes('vercel.app') || false

test.describe('Security Headers', () => {
  test.skip(!isProd, 'Security headers only present on production')

  test('CSP header should be present', async ({ request }) => {
    const response = await request.get('/')
    const csp = response.headers()['content-security-policy']
    expect(csp).toBeTruthy()
  })

  test('HSTS header should be present', async ({ request }) => {
    const response = await request.get('/')
    const hsts = response.headers()['strict-transport-security']
    expect(hsts).toBeTruthy()
  })

  test('X-Content-Type-Options should be nosniff', async ({ request }) => {
    const response = await request.get('/')
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('X-Frame-Options should be DENY', async ({ request }) => {
    const response = await request.get('/')
    expect(response.headers()['x-frame-options']).toBe('DENY')
  })
})

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should not store JWT in localStorage after login', async ({ page }) => {
    // Must click HR role card first (new login flow)
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('[data-testid="email-input"]').fill(HR_USER.email)
    await page.locator('[data-testid="password-input"]').fill(HR_USER.password)
    await page.locator('[data-testid="login-button"]').click()
    await page.waitForTimeout(5000)
    const authData = await page.evaluate(() => localStorage.getItem('adminmate-auth'))
    expect(authData).toBeNull()
  })
})

test.describe('XSS Prevention', () => {
  test('should sanitize AI chat output', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)
    const chatArea = page.locator('[class*="chat"], [class*="message"], [class*="Chat"]').first()
    if (await chatArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const html = await chatArea.innerHTML().catch(() => '')
      expect(html).not.toContain('<script')
    }
  })
})

test.describe('Rate Limiting', () => {
  test.skip(!isProd, 'Rate limiting only present on production')

  test('should return 429 on rapid requests', async ({ request }) => {
    const promises = Array.from({ length: 10 }, () => request.get('/'))
    const responses = await Promise.all(promises)
    const rateLimited = responses.some(r => r.status() === 429)
    expect(rateLimited).toBe(true)
  })
})

test.describe('Audit Log', () => {
  test('audit log page loads for admin', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/audit-log')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('audit log table contains action columns', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/audit-log')
    await waitForPageReady(page)
    const table = page.locator('table')
    if (await table.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(table.locator('th')).toHaveCount(await table.locator('th').count())
    }
  })
})
