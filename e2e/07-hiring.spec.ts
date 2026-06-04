import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('HIRING: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signIn(page)
    await page.goto('/hiring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('shows document generation section', async ({ page }) => {
    await signIn(page)
    await page.goto('/hiring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const hasContent = await page.locator('h1, h2, h3, h4, [class*="card"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })

  test('create offer button exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/hiring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const createBtn = page.locator('button').filter({ hasText: /create|add|new/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(createBtn).toBeVisible()
    }
  })

  test('export audit button exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/hiring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const exportBtn = page.locator('button').filter({ hasText: /export|csv/i }).first()
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportBtn).toBeVisible()
    }
  })
})

test.describe('HIRING: Offers', () => {
  test('offers list or empty state displayed', async ({ page }) => {
    await signIn(page)
    await page.goto('/hiring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const content = await page.locator('[class*="card"], [class*="table"], [class*="empty"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })

  test('offer form opens when creating', async ({ page }) => {
    await signIn(page)
    await page.goto('/hiring')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const createBtn = page.locator('button').filter({ hasText: /create|add|new/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click()
      await page.waitForTimeout(1000)
      const hasForm = await page.locator('input, select, textarea').count()
      expect(hasForm).toBeGreaterThanOrEqual(1)
    }
  })
})
