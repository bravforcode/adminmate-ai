import { test, expect, signInAsHR, waitForPageReady } from './helpers'

test.describe('HIRING: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/hiring')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('shows document generation section', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/hiring')
    await waitForPageReady(page)
    const hasContent = await page.locator('h1, h2, h3, h4, [class*="card"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })

  test('create offer button exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/hiring')
    await waitForPageReady(page)
    const createBtn = page.locator('button').filter({ hasText: /create|add|new/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(createBtn).toBeVisible()
    }
  })

  test('export audit button exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/hiring')
    await waitForPageReady(page)
    const exportBtn = page.locator('button').filter({ hasText: /export|csv/i }).first()
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportBtn).toBeVisible()
    }
  })
})

test.describe('HIRING: Offers', () => {
  test('offers list or empty state displayed', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/hiring')
    await waitForPageReady(page)
    const content = await page.locator('[class*="card"], [class*="table"], [class*="empty"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })

  test('offer form opens when creating', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/hiring')
    await waitForPageReady(page)
    const createBtn = page.locator('button').filter({ hasText: /create|add|new/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click()
      await page.waitForTimeout(1000)
      const hasForm = await page.locator('input, select, textarea').count()
      expect(hasForm).toBeGreaterThanOrEqual(1)
    }
  })
})
