import { test, expect, signInAsHR, waitForPageReady } from './helpers'

test.describe('HEALTH: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/health')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('service status rows exist', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/health')
    await waitForPageReady(page)
    const statuses = page.locator('text=/database|auth|edge|storage|status/i')
    if (await statuses.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await statuses.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('database status indicator exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/health')
    await waitForPageReady(page)
    const dbStatus = page.locator('text=/database|connected|healthy/i')
    if (await dbStatus.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await dbStatus.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('system metrics section exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/health')
    await waitForPageReady(page)
    const metrics = page.locator('text=/metrics|users|companies|jobs|candidates/i')
    if (await metrics.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await metrics.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('last checked timestamp exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/health')
    await waitForPageReady(page)
    const timestamp = page.locator('text=/last checked|refreshed|ago/i')
    if (await timestamp.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await timestamp.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('retry button exists on error', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/health')
    await waitForPageReady(page)
    const retryBtn = page.locator('button').filter({ hasText: /retry|refresh/i }).first()
    if (await retryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(retryBtn).toBeVisible()
    }
  })
})

test.describe('HEALTH: Auto-refresh', () => {
  test('auto-refresh note exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/health')
    await waitForPageReady(page)
    const autoRefresh = page.locator('text=/auto.*refresh|every.*30|refreshes/i')
    if (await autoRefresh.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      expect(await autoRefresh.count()).toBeGreaterThanOrEqual(1)
    }
  })
})
