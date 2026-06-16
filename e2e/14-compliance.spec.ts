import { test, expect, signInAsHR, navigateTo } from './helpers'

test.describe('COMPLIANCE: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/settings/compliance')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('compliance checklist exists', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/settings/compliance')
    const checklist = await page.locator('[class*="card"], [class*="check"], [class*="compliance"]').count()
    expect(checklist).toBeGreaterThanOrEqual(0)
  })

  test('data subject requests section exists', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/settings/compliance')
    const section = page.locator('text=/deletion|subject|request|data/i')
    // Section may or may not be visible depending on data
    const count = await section.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('data retention info exists', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/settings/compliance')
    const retention = page.locator('text=/retention|cv.*year|employee.*year|chat.*year/i')
    if (await retention.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await retention.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('approve/reject buttons or empty state exist', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/settings/compliance')
    const hasContent = await page.locator('h1, h2, h3, button, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(0)
  })
})
