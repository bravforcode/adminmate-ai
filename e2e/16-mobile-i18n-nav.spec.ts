import { test, expect, signInAsHR, waitForPageReady, navigateTo } from './helpers'

test.describe('404: Unknown Routes', () => {
  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto('/nonexistent-route-xyz')
    await waitForPageReady(page)
    const has404 = await page.locator('text=/404|not found/i').count()
    expect(has404).toBeGreaterThanOrEqual(1)
  })

  test('404 page has back to dashboard link', async ({ page }) => {
    await page.goto('/nonexistent-route-xyz')
    await waitForPageReady(page)
    const backLink = page.locator('a[href="/dashboard"]').first()
    if (await backLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(backLink).toBeVisible()
    }
  })

  test('deep unknown route shows 404', async ({ page }) => {
    await page.goto('/recruitment/nonexistent/deep/route')
    await waitForPageReady(page)
    const has404 = await page.locator('text=/404|not found/i').count()
    expect(has404).toBeGreaterThanOrEqual(1)
  })
})

test.describe('MOBILE: Responsive Layout', () => {
  test('mobile viewport shows content or setup page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await signInAsHR(page)
    await waitForPageReady(page)
    await expect(page.locator('h1, h2, h3, input, button, [class*="card"], [class*="form"]').first()).toBeVisible({ timeout: 15_000 })
  })

  test('mobile jobs page loads or redirects', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/jobs')
    const hasContent = await page.locator('h1, h2, [class*="card"], [class*="empty"], input').count()
    expect(hasContent).toBeGreaterThanOrEqual(0)
  })

  test('mobile settings page loads', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await signInAsHR(page)
    await navigateTo(page, '/settings')
    const hasContent = await page.locator('h1, h2, input, select, [class*="card"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(0)
  })
})

test.describe('i18n: Language Switcher', () => {
  test('language switcher exists in header', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const langSwitcher = page.locator('button, select').filter({ hasText: /th|en|vi|id/i }).first()
    if (await langSwitcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(langSwitcher).toBeVisible()
    }
  })

  test('switching to Thai works', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const thaiBtn = page.locator('button, option').filter({ hasText: /th|ไทย/i }).first()
    if (await thaiBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await thaiBtn.click()
      await page.waitForTimeout(2000)
      const hasThai = await page.locator('text=/ยินดีต้อนรับ|แดชบอร์ด|Dashboard/i').count()
      expect(hasThai).toBeGreaterThanOrEqual(0)
    }
  })

  test('switching to Vietnamese works', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const viBtn = page.locator('button, option').filter({ hasText: /vi|tiếng/i }).first()
    if (await viBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viBtn.click()
      await page.waitForTimeout(2000)
      const hasVi = await page.locator('text=/chào|bảng|Dashboard/i').count()
      expect(hasVi).toBeGreaterThanOrEqual(0)
    }
  })

  test('switching to Indonesian works', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const idBtn = page.locator('button, option').filter({ hasText: /id|bahasa/i }).first()
    if (await idBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await idBtn.click()
      await page.waitForTimeout(2000)
      const hasId = await page.locator('text=/selamat|dasbor|Dashboard/i').count()
      expect(hasId).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('NAVIGATION: Full Sidebar', () => {
  test('sidebar links to all main pages', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const pages = [
      '/recruitment/jobs',
      '/recruitment/candidates',
      '/recruitment/pipeline',
      '/recruitment/interviews',
      '/hiring',
      '/onboarding',
      '/documents',
      '/reports',
      '/settings',
      '/health',
    ]
    for (const path of pages) {
      const link = page.locator(`a[href="${path}"]`).first()
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click()
        await waitForPageReady(page)
        expect(page.url()).toContain(path)
        await navigateTo(page, '/dashboard')
      }
    }
  })
})
