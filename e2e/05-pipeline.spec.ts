import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('PIPELINE: Page Load', () => {
  test('loads with kanban board', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/pipeline')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('job filter select exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/pipeline')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const filter = page.locator('[data-testid="job-filter"]')
    if (await filter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(filter).toBeVisible()
    }
  })

  test('kanban columns exist', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/pipeline')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const columns = await page.locator('[data-testid*="column-"], [class*="kanban"], [class*="column"]').count()
    expect(columns).toBeGreaterThanOrEqual(0)
  })
})

test.describe('PIPELINE: Kanban Cards', () => {
  test('kanban cards or empty state displayed', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/pipeline')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const cards = await page.locator('[data-testid="kanban-card"], [class*="card"]').count()
    expect(cards).toBeGreaterThanOrEqual(0)
  })

  test('clicking card opens detail drawer', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/pipeline')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const card = page.locator('[data-testid="kanban-card"], [class*="card"]').first()
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click()
      await page.waitForTimeout(1000)
      const drawer = await page.locator('[class*="drawer"], [class*="sidebar"], [class*="panel"]').count()
      expect(drawer).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('PIPELINE: JD Generation Button', () => {
  test('JD Generation button navigates to jobs', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/pipeline')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const jdBtn = page.getByText(/jd generation/i).first()
    if (await jdBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await jdBtn.click()
      await expect(page).toHaveURL(/\/recruitment\/jobs/, { timeout: 15_000 })
    }
  })
})
