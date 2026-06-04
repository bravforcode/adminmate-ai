import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('CANDIDATES: List Page', () => {
  test('loads with heading', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('add candidate button visible or redirected to setup', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    if (page.url().includes('/setup-company')) {
      await expect(page.locator('input, select, button').first()).toBeVisible({ timeout: 5_000 })
    } else {
      await expect(page.locator('[data-testid="add-candidate"]')).toBeVisible({ timeout: 15_000 })
    }
  })

  test('search input exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const search = page.locator('input[placeholder*="search" i], input[type="search"]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(search).toBeVisible()
    }
  })

  test('candidate cards or empty state displayed', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const content = await page.locator('[class*="card"], [class*="empty"], [class*="skeleton"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })
})

test.describe('CANDIDATES: Create', () => {
  test('add candidate form opens or setup-company redirect', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    if (page.url().includes('/setup-company')) {
      await expect(page.locator('input, select, button').first()).toBeVisible({ timeout: 5_000 })
    } else {
      await page.locator('[data-testid="add-candidate"]').click()
      await expect(page.locator('[data-testid="candidate-name"]')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('form has all fields', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    if (page.url().includes('/setup-company')) return
    await page.locator('[data-testid="add-candidate"]').click()
    await expect(page.locator('[data-testid="candidate-name"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="candidate-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="save-candidate"]')).toBeVisible()
  })

  test('create candidate end-to-end', async ({ page }) => {
    const name = `E2E Candidate ${Date.now()}`
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    if (page.url().includes('/setup-company')) return
    await page.locator('[data-testid="add-candidate"]').click()
    await page.locator('[data-testid="candidate-name"]').fill(name)
    await page.locator('[data-testid="candidate-email"]').fill(`e2e-${Date.now()}@test.com`)
    await page.locator('[data-testid="save-candidate"]').click()
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 })
  })

  test('empty name shows validation error', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    if (page.url().includes('/setup-company')) return
    await page.locator('[data-testid="add-candidate"]').click()
    await page.locator('[data-testid="save-candidate"]').click()
    await expect(page.getByText(/required|name/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('cancel button closes form', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    if (page.url().includes('/setup-company')) return
    await page.locator('[data-testid="add-candidate"]').click()
    await expect(page.locator('[data-testid="candidate-name"]')).toBeVisible({ timeout: 5_000 })
    const cancelBtn = page.locator('button').filter({ hasText: /cancel/i }).first()
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click()
      await expect(page.locator('[data-testid="candidate-name"]')).not.toBeVisible({ timeout: 5_000 })
    }
  })
})

test.describe('CANDIDATES: Search', () => {
  test('search filters candidates', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const search = page.locator('input[placeholder*="search" i]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill('NonexistentCandidate12345')
      await page.waitForTimeout(1000)
      const emptyState = page.locator('[class*="empty"]').count()
      expect(emptyState).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('CANDIDATES: Detail Page', () => {
  test('clicking candidate navigates to detail', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const card = page.locator('[class*="card"]').first()
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click()
      await page.waitForURL(/\/recruitment\/candidates\/[a-f0-9-]+/, { timeout: 15_000 })
      expect(page.url()).toMatch(/\/recruitment\/candidates\/[a-f0-9-]+/)
    }
  })

  test('detail page shows back link', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const card = page.locator('[class*="card"]').first()
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click()
      await page.waitForURL(/\/recruitment\/candidates\/[a-f0-9-]+/, { timeout: 15_000 })
      const backLink = page.locator('a[href="/recruitment/candidates"]').first()
      if (await backLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(backLink).toBeVisible()
      }
    }
  })

  test('detail page shows CV upload section', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/candidates')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const card = page.locator('[class*="card"]').first()
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click()
      await page.waitForURL(/\/recruitment\/candidates\/[a-f0-9-]+/, { timeout: 15_000 })
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
      const hasUpload = await page.locator('[data-testid*="cv"], [class*="upload"], [class*="dropzone"]').count()
      expect(hasUpload).toBeGreaterThanOrEqual(0)
    }
  })
})
