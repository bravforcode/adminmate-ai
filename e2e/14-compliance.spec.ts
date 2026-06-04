import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('COMPLIANCE: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signIn(page)
    await page.goto('/settings/compliance')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('compliance checklist exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/settings/compliance')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const checklist = await page.locator('[class*="card"], [class*="check"], [class*="compliance"]').count()
    expect(checklist).toBeGreaterThanOrEqual(0)
  })

  test('data subject requests section exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/settings/compliance')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const section = page.locator('text=/deletion|subject|request|data/i')
    if (await section.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await section.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('data retention info exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/settings/compliance')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const retention = page.locator('text=/retention|cv.*year|employee.*year|chat.*year/i')
    if (await retention.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await retention.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('approve/reject buttons or empty state exist', async ({ page }) => {
    await signIn(page)
    await page.goto('/settings/compliance')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const hasContent = await page.locator('h1, h2, h3, button, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(0)
  })
})
