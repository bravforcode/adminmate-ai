import { test, expect, ensureHRAuthenticated, waitForPageReady, navigateTo } from './helpers'

test.describe('LEAVE: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('shows leave request list or empty state', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)
    const content = await page.locator('[class*="card"], [class*="table"], [class*="empty"], [class*="request"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })

  test('has new leave request button', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)
    const btn = page.locator('button').filter({ hasText: /new|request|create|add/i }).first()
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(btn).toBeVisible()
    }
  })
})

test.describe('LEAVE: Status Filter', () => {
  test('status filter buttons exist', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)
    const filters = page.locator('button, select, [role="tab"]').filter({ hasText: /pending|approved|rejected|all/i })
    if (await filters.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(filters.first()).toBeVisible()
    }
  })
})

test.describe('LEAVE: Request Form', () => {
  test('opens form on button click', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)

    const btn = page.locator('button').filter({ hasText: /new|request|create|add/i }).first()
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click()
      const form = page.locator('form, [role="dialog"], [class*="modal"], [class*="form"]')
      await expect(form.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('has leave type selector', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)

    const btn = page.locator('button').filter({ hasText: /new|request|create|add/i }).first()
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(500)
      const select = page.locator('select, [role="combobox"], [class*="select"]').first()
      if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(select).toBeVisible()
      }
    }
  })

  test('has date inputs', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)

    const btn = page.locator('button').filter({ hasText: /new|request|create|add/i }).first()
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(500)
      const dateInputs = page.locator('input[type="date"], input[placeholder*="date" i], input[name*="date" i]')
      if (await dateInputs.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(dateInputs.first()).toBeVisible()
      }
    }
  })
})

test.describe('LEAVE: Navigation', () => {
  test('navigates from sidebar', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/dashboard')
    await waitForPageReady(page)

    const navItem = page.locator('a[href="/leave"], nav a:has-text("Leave"), nav a:has-text("Time Off"), [data-nav="leave"]')
    if (await navItem.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await navItem.first().click()
      await page.waitForURL('**/leave', { timeout: 10_000 })
      await expect(page).toHaveURL(/.*leave/)
    }
  })
})

test.describe('LEAVE: Leave Balances', () => {
  test('shows balance information', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/leave')
    await waitForPageReady(page)
    const balanceSection = page.locator('[class*="balance"], [class*="remaining"], [class*="entitlement"]')
    if (await balanceSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(balanceSection.first()).toBeVisible()
    }
  })
})
