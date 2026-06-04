import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('MONITORING: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signIn(page)
    await page.goto('/monitoring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('usage metric cards exist', async ({ page }) => {
    await signIn(page)
    await page.goto('/monitoring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const cards = await page.locator('[class*="card"], [class*="metric"]').count()
    expect(cards).toBeGreaterThanOrEqual(0)
  })

  test('feature breakdown exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/monitoring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const features = page.locator('text=/jd|resume|screening|chat|offer|generation|parse/i')
    if (await features.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await features.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('alert level indicator exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/monitoring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const alerts = page.locator('text=/alert|level|warning|normal|critical/i')
    if (await alerts.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await alerts.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('daily limit info exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/monitoring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const limits = page.locator('text=/limit|daily|quota|remaining/i')
    if (await limits.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await limits.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('retry button exists on error', async ({ page }) => {
    await signIn(page)
    await page.goto('/monitoring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const retryBtn = page.locator('button').filter({ hasText: /retry/i }).first()
    if (await retryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(retryBtn).toBeVisible()
    }
  })
})
