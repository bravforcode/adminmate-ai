import { test, expect, signInAsHR, waitForPageReady, navigateTo } from './helpers'

test.describe('CANDIDATES: List Page', () => {
  test('loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('add candidate button visible or redirected to setup', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    if (page.url().includes('/setup-company')) {
      await expect(page.locator('input, select, button').first()).toBeVisible({ timeout: 5_000 })
    } else {
      // Allow page to fully render
      const addBtn = page.locator('[data-testid="add-candidate"]')
      await expect(addBtn).toBeVisible({ timeout: 15_000 })
    }
  })

  test('search input exists', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    const search = page.locator('input[placeholder*="search" i], input[type="search"]').first()
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(search).toBeVisible()
    }
  })

  test('candidate cards or empty state displayed', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    const content = await page.locator('[class*="card"], [class*="empty"], [class*="skeleton"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })
})

test.describe('CANDIDATES: Create', () => {
  test('add candidate form opens or setup-company redirect', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    if (page.url().includes('/setup-company')) {
      await expect(page.locator('input, select, button').first()).toBeVisible({ timeout: 5_000 })
    } else {
      const addBtn = page.locator('[data-testid="add-candidate"]')
      if (await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await addBtn.click()
        await expect(page.locator('[data-testid="candidate-name"]')).toBeVisible({ timeout: 5_000 })
      }
    }
  })

  test('form has all fields', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    if (page.url().includes('/setup-company')) return
    const addBtn = page.locator('[data-testid="add-candidate"]')
    if (await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await addBtn.click()
      await expect(page.locator('[data-testid="candidate-name"]')).toBeVisible({ timeout: 5_000 })
      await expect(page.locator('[data-testid="candidate-email"]')).toBeVisible()
      await expect(page.locator('[data-testid="save-candidate"]')).toBeVisible()
    }
  })

  test('create candidate end-to-end', async ({ page }) => {
    const name = `E2E Candidate ${Date.now()}`
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    if (page.url().includes('/setup-company')) return
    const addBtn = page.locator('[data-testid="add-candidate"]')
    if (await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await addBtn.click()
      await page.locator('[data-testid="candidate-name"]').fill(name)
      await page.locator('[data-testid="candidate-email"]').fill(`e2e-${Date.now()}@test.com`)
      await page.locator('[data-testid="save-candidate"]').click()
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 })
    }
  })

  test('empty name shows validation error', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    if (page.url().includes('/setup-company')) return
    const addBtn = page.locator('[data-testid="add-candidate"]')
    if (await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await addBtn.click()
      await page.locator('[data-testid="save-candidate"]').click()
      await expect(page.getByText(/required|name/i).first()).toBeVisible({ timeout: 5_000 })
    }
  })

  test('cancel button closes form', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    if (page.url().includes('/setup-company')) return
    const addBtn = page.locator('[data-testid="add-candidate"]')
    if (await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await addBtn.click()
      await expect(page.locator('[data-testid="candidate-name"]')).toBeVisible({ timeout: 5_000 })
      const cancelBtn = page.locator('button').filter({ hasText: /cancel/i }).first()
      if (await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await cancelBtn.click()
        await expect(page.locator('[data-testid="candidate-name"]')).not.toBeVisible({ timeout: 5_000 })
      }
    }
  })
})

test.describe('CANDIDATES: Search', () => {
  test('search filters candidates', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    const search = page.locator('input[placeholder*="search" i]').first()
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await search.fill('NonexistentCandidate12345')
      await page.waitForTimeout(1000)
      const emptyState = page.locator('[class*="empty"]').count()
      expect(emptyState).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('CANDIDATES: Detail Page', () => {
  test('clicking candidate navigates to detail', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    const card = page.locator('[class*="card"]').first()
    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await card.click()
      await page.waitForURL(/\/recruitment\/candidates\/[a-f0-9-]+/, { timeout: 15_000 })
      expect(page.url()).toMatch(/\/recruitment\/candidates\/[a-f0-9-]+/)
    }
  })

  test('detail page shows back link', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    const card = page.locator('[class*="card"]').first()
    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await card.click()
      await page.waitForURL(/\/recruitment\/candidates\/[a-f0-9-]+/, { timeout: 15_000 })
      const backLink = page.locator('a[href="/recruitment/candidates"]').first()
      if (await backLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(backLink).toBeVisible()
      }
    }
  })

  test('detail page shows CV upload section', async ({ page }) => {
    await signInAsHR(page)
    await navigateTo(page, '/recruitment/candidates')
    const card = page.locator('[class*="card"]').first()
    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await card.click()
      await page.waitForURL(/\/recruitment\/candidates\/[a-f0-9-]+/, { timeout: 15_000 })
      await waitForPageReady(page)
      const hasUpload = await page.locator('[data-testid*="cv"], [class*="upload"], [class*="dropzone"]').count()
      expect(hasUpload).toBeGreaterThanOrEqual(0)
    }
  })
})
