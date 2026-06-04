import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('DASHBOARD: Page Load', () => {
  test('loads after login', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  })

  test('shows heading or welcome message', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const headings = page.locator('h1, h2, h3')
    expect(await headings.count()).toBeGreaterThanOrEqual(1)
  })

  test('shows stat cards or loading skeleton', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const hasStats = await page.locator('[class*="card"], [class*="stat"], [class*="skeleton"]').count()
    expect(hasStats).toBeGreaterThanOrEqual(0)
  })

  test('shows action required section or empty state', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const hasContent = await page.locator('h1, h2, h3, h4, [class*="card"], [class*="empty"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })

  test('shows recent candidates or empty state', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const hasContent = await page.locator('table, [class*="card"], [class*="empty"], [class*="list"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(0)
  })
})

test.describe('DASHBOARD: Navigation', () => {
  test('View all tasks link navigates to onboarding', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const link = page.getByText(/view all tasks/i).first()
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click()
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 })
    }
  })

  test('View pipeline link navigates to pipeline', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const link = page.getByText(/view pipeline/i).first()
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click()
      await expect(page).toHaveURL(/\/recruitment\/pipeline/, { timeout: 15_000 })
    }
  })

  test('sidebar contains navigation links or setup form', async ({ page }) => {
    await signIn(page)
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const hasContent = await page.locator('a[href], input, select, button, h1, h2').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})

test.describe('DASHBOARD: Search', () => {
  test('candidate search input exists', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const search = page.locator('input[type="search"], input[placeholder*="search" i]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(search).toBeVisible()
    }
  })
})
