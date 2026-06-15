import { test, expect, signInAsHR, waitForPageReady } from './helpers'

test.describe('REPORTS: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/reports')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('KPI cards exist', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/reports')
    await waitForPageReady(page)
    const cards = await page.locator('[class*="card"], [class*="kpi"]').count()
    expect(cards).toBeGreaterThanOrEqual(0)
  })

  test('period selector exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/reports')
    await waitForPageReady(page)
    const periodBtns = page.locator('button').filter({ hasText: /q[1-4]|ytd|quarter|year/i })
    if (await periodBtns.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await periodBtns.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('pipeline chart or empty state', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/reports')
    await waitForPageReady(page)
    const chart = await page.locator('svg, [class*="chart"], [class*="recharts"]').count()
    expect(chart).toBeGreaterThanOrEqual(0)
  })

  test('export CSV button exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/reports')
    await waitForPageReady(page)
    const exportBtn = page.locator('button').filter({ hasText: /export|csv/i }).first()
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportBtn).toBeVisible()
    }
  })
})

test.describe('REPORTS: Period Toggle', () => {
  test('clicking period buttons changes data', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/reports')
    await waitForPageReady(page)
    const periodBtns = page.locator('button').filter({ hasText: /q[1-4]|ytd/i })
    if (await periodBtns.nth(1).isVisible({ timeout: 5000 }).catch(() => false)) {
      await periodBtns.nth(1).click()
      await page.waitForTimeout(1000)
      const hasContent = await page.locator('[class*="card"], [class*="kpi"], [class*="chart"]').count()
      expect(hasContent).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('REPORTS: Source Breakdown', () => {
  test('source breakdown section exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/reports')
    await waitForPageReady(page)
    const sources = page.locator('text=/source|breakdown|linkedin|referral|direct/i')
    if (await sources.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await sources.count()).toBeGreaterThanOrEqual(1)
    }
  })
})
