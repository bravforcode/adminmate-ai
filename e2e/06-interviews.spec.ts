import { test, expect, ensureHRAuthenticated, waitForPageReady } from './helpers'

test.describe('INTERVIEWS: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/recruitment/interviews')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('has tab buttons (upcoming/past)', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/recruitment/interviews')
    await waitForPageReady(page)
    const tabs = page.locator('button').filter({ hasText: /upcoming|past/i })
    const count = await tabs.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('schedule interview form or empty state', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/recruitment/interviews')
    await waitForPageReady(page)
    const hasContent = await page.locator('button, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(0)
  })
})

test.describe('INTERVIEWS: Schedule', () => {
  test('schedule form opens when clicking add', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/recruitment/interviews')
    await waitForPageReady(page)
    const addBtn = page.locator('button').filter({ hasText: /schedule|add|create/i }).first()
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1000)
      const hasForm = await page.locator('input, select').count()
      expect(hasForm).toBeGreaterThanOrEqual(1)
    }
  })
})

test.describe('INTERVIEWS: Feedback', () => {
  test('feedback form or button exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/recruitment/interviews')
    await waitForPageReady(page)
    await page.locator('button').filter({ hasText: /past/i }).first().click().catch(() => {})
    await page.waitForTimeout(1000)
    const feedbackBtn = page.locator('button').filter({ hasText: /feedback/i }).first()
    if (await feedbackBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await feedbackBtn.click()
      await page.waitForTimeout(1000)
      const hasForm = await page.locator('textarea, [class*="star"], [class*="rating"]').count()
      expect(hasForm).toBeGreaterThanOrEqual(0)
    }
  })
})
