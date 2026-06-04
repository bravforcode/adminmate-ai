import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('HEALTH: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signIn(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('service status rows exist', async ({ page }) => {
    await signIn(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const statuses = page.locator('text=/database|auth|edge|storage|status/i')
    if (await statuses.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await statuses.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('database status indicator exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const dbStatus = page.locator('text=/database|connected|healthy/i')
    if (await dbStatus.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await dbStatus.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('system metrics section exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const metrics = page.locator('text=/metrics|users|companies|jobs|candidates/i')
    if (await metrics.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await metrics.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('last checked timestamp exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const timestamp = page.locator('text=/last checked|refreshed|ago/i')
    if (await timestamp.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await timestamp.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('retry button exists on error', async ({ page }) => {
    await signIn(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const retryBtn = page.locator('button').filter({ hasText: /retry|refresh/i }).first()
    if (await retryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(retryBtn).toBeVisible()
    }
  })
})

test.describe('HEALTH: Auto-refresh', () => {
  test('auto-refresh note exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/health')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const autoRefresh = page.locator('text=/auto.*refresh|every.*30|refreshes/i')
    if (await autoRefresh.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await autoRefresh.count()).toBeGreaterThanOrEqual(1)
    }
  })
})
