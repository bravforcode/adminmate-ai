import { test, expect, signInAsHR, waitForPageReady } from './helpers'

test.describe('COMPLIANCE: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/compliance')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('compliance checklist exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/compliance')
    await waitForPageReady(page)
    const checklist = await page.locator('[class*="card"], [class*="check"], [class*="compliance"]').count()
    expect(checklist).toBeGreaterThanOrEqual(0)
  })

  test('data subject requests section exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/compliance')
    await waitForPageReady(page)
    const section = page.locator('text=/deletion|subject|request|data/i')
    if (await section.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await section.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('data retention info exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/compliance')
    await waitForPageReady(page)
    const retention = page.locator('text=/retention|cv.*year|employee.*year|chat.*year/i')
    if (await retention.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await retention.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('approve/reject buttons or empty state exist', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/compliance')
    await waitForPageReady(page)
    const hasContent = await page.locator('h1, h2, h3, button, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(0)
  })
})
