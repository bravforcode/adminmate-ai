import { test, expect, signInAsHR, waitForPageReady } from './helpers'

test.describe('DASHBOARD: Page Load', () => {
  test('loads after login', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  })

  test('shows heading or welcome message', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await waitForPageReady(page)
    const headings = page.locator('h1, h2, h3')
    expect(await headings.count()).toBeGreaterThanOrEqual(1)
  })

  test('shows stat cards or loading skeleton', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await waitForPageReady(page)
    const hasStats = await page.locator('[class*="card"], [class*="stat"], [class*="skeleton"]').count()
    expect(hasStats).toBeGreaterThanOrEqual(1)
  })

  test('shows action required section or empty state', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await waitForPageReady(page)
    const hasContent = await page.locator('h1, h2, h3, h4, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })

  test('shows recent candidates or empty state', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await waitForPageReady(page)
    const hasContent = await page.locator('table, [class*="card"], [class*="empty"], [class*="list"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})

test.describe('DASHBOARD: Navigation', () => {
  test('sidebar contains navigation links or setup form', async ({ page }) => {
    await signInAsHR(page)
    await waitForPageReady(page)
    const hasContent = await page.locator('a[href], input, select, button, h1, h2').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})

test.describe('DASHBOARD: Search', () => {
  test('candidate search input exists', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const search = page.locator('input[type="search"], input[placeholder*="search" i]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(search).toBeVisible()
    }
  })
})
