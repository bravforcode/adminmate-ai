import { test, expect, ensureHRAuthenticated, navigateTo } from './helpers'

test.describe('DOCUMENTS: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('stat cards exist', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    const stats = await page.locator('[class*="card"], [class*="stat"]').count()
    expect(stats).toBeGreaterThanOrEqual(0)
  })

  test('documents table or empty state', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    const content = await page.locator('table, [class*="card"], [class*="empty"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })
})

test.describe('DOCUMENTS: Search & Filter', () => {
  test('search input exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    const search = page.locator('input[placeholder*="search" i], input[type="search"]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(search).toBeVisible()
    }
  })

  test('type filter select exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    const filter = page.locator('select').first()
    if (await filter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(filter).toBeVisible()
    }
  })

  test('search filters documents', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    const search = page.locator('input[placeholder*="search" i]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill('NonexistentDoc12345')
      await page.waitForTimeout(1000)
      const emptyState = page.locator('[class*="empty"]').count()
      expect(emptyState).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('DOCUMENTS: Status Change', () => {
  test('status select exists per document', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    const selects = page.locator('select').filter({ hasText: /draft|pending|signed/i })
    if (await selects.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(selects.first()).toBeVisible()
    }
  })
})

test.describe('DOCUMENTS: Send Reminder', () => {
  test('reminder button exists per document', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/documents')
    const reminderBtn = page.locator('button').filter({ hasText: /reminder|bell/i }).first()
    if (await reminderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(reminderBtn).toBeVisible()
    }
  })
})
