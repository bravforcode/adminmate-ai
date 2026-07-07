import { test, expect, ensureHRAuthenticated, navigateTo } from './helpers'

const isSetup = (page: any) => page.url().includes('/setup-company')

test.describe('RECRUIT: Jobs Page Smoke', () => {
  test('jobs page loads', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('jobs page has content', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    await page.waitForLoadState('networkidle')
    const hasContent = await page.locator('h1, h2, button, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})

test.describe('RECRUIT: Candidates Page Smoke', () => {
  test('candidates page loads', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/candidates')
    if (isSetup(page)) return
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('candidates page has content', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/candidates')
    if (isSetup(page)) return
    await page.waitForLoadState('networkidle')
    const hasContent = await page.locator('h1, h2, button, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})

test.describe('RECRUIT: Job Detail Navigation', () => {
  test('clicking a job card navigates to detail page', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const jobCard = page.locator('[class*="card"]').first()
    if (await jobCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await jobCard.click()
      await page.waitForURL(/\/recruitment\/jobs\/[a-f0-9-]+/, { timeout: 15_000 })
      expect(page.url()).toMatch(/\/recruitment\/jobs\/[a-f0-9-]+/)
    }
  })
})

test.describe('RECRUIT: Pipeline Page Smoke', () => {
  test('pipeline page loads', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/pipeline')
    if (isSetup(page)) return
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('RECRUIT: Interviews Page Smoke', () => {
  test('interviews page loads', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/interviews')
    if (isSetup(page)) return
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })
})
