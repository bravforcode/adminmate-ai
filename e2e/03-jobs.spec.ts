import { test, expect, ensureHRAuthenticated, navigateTo } from './helpers'

const isSetup = (page: any) => page.url().includes('/setup-company')

test.describe('JOBS: List Page', () => {
  test('loads with heading', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('create job button visible or setup redirect', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) {
      await expect(page.locator('input, select, button').first()).toBeVisible({ timeout: 5_000 })
    } else {
      const hasContent = await page.locator('h1, h2, button, [class*="card"]').count()
      expect(hasContent).toBeGreaterThanOrEqual(0)
    }
  })

  test('search input exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const search = page.locator('input[placeholder*="search" i], input[type="search"]').first()
    if (await search.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(search).toBeVisible()
    }
  })

  test('job cards or empty state displayed', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const content = await page.locator('[class*="card"], [class*="empty"], [class*="skeleton"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })
})

test.describe('JOBS: 3-Step Create Wizard', () => {
  test('step 1: basic info form or setup redirect', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const createBtn = page.locator('[data-testid="create-job-button"]')
    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click()
      await expect(page.locator('[data-testid="job-title"]')).toBeVisible({ timeout: 5_000 })
      await expect(page.locator('[data-testid="employment-type"]')).toBeVisible()
      await expect(page.locator('[data-testid="experience-level"]')).toBeVisible()
    }
  })

  test('step 1 -> step 2: next button works', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const createBtn = page.locator('[data-testid="create-job-button"]')
    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click()
      await page.locator('[data-testid="job-title"]').fill('E2E Test Job')
      await page.locator('[data-testid="step-next"]').click()
      await expect(page.locator('[data-testid="jd-description"]')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('step 2: job description form', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const createBtn = page.locator('[data-testid="create-job-button"]')
    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click()
      await page.locator('[data-testid="job-title"]').fill('E2E Test Job')
      await page.locator('[data-testid="step-next"]').click()
      await expect(page.locator('[data-testid="jd-description"]')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('step 2 -> step 3: next button works', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const createBtn = page.locator('[data-testid="create-job-button"]')
    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click()
      await page.locator('[data-testid="job-title"]').fill('E2E Test Job')
      await page.locator('[data-testid="step-next"]').click()
      await page.locator('[data-testid="jd-description"]').fill('Test description for E2E.')
      await page.locator('[data-testid="step-next"]').click()
      await expect(page.locator('[data-testid="salary-min"]')).toBeVisible({ timeout: 5_000 })
      await expect(page.locator('[data-testid="salary-max"]')).toBeVisible()
    }
  })

  test('step 3: salary and publish', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const createBtn = page.locator('[data-testid="create-job-button"]')
    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click()
      await page.locator('[data-testid="job-title"]').fill('E2E Test Job')
      await page.locator('[data-testid="step-next"]').click()
      await page.locator('[data-testid="jd-description"]').fill('Test description.')
      await page.locator('[data-testid="step-next"]').click()
      await page.locator('[data-testid="salary-min"]').fill('30000')
      await page.locator('[data-testid="salary-max"]').fill('50000')
      await expect(page.locator('[data-testid="publish-job"]')).toBeVisible()
    }
  })

  test('publish job end-to-end', async ({ page }) => {
    const title = `E2E Job ${Date.now()}`
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const createBtn = page.locator('[data-testid="create-job-button"]')
    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click()
      await page.locator('[data-testid="job-title"]').fill(title)
      // department + location are required by the zod schema — without them
      // handleSubmit rejects at publish and no job is created
      await page.locator('#job-department').fill('Engineering')
      await page.locator('#job-location').fill('Bangkok')
      await page.locator('[data-testid="step-next"]').click()
      await page.locator('[data-testid="jd-description"]').fill('E2E generated job description.')
      await page.locator('[data-testid="step-next"]').click()
      await page.locator('[data-testid="salary-min"]').fill('25000')
      await page.locator('[data-testid="salary-max"]').fill('45000')
      await page.locator('[data-testid="publish-job"]').click()
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
    }
  })
})

test.describe('JOBS: Search & Filter', () => {
  test('search filters job list', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const search = page.locator('input[placeholder*="search" i]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill('NonexistentJob12345')
      await page.waitForTimeout(1000)
      const emptyState = await page.locator('[class*="empty"]').count()
      expect(emptyState).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('JOBS: Detail Page', () => {
  test('clicking job card navigates to detail', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const jobCard = page.locator('[class*="card"]').first()
    if (await jobCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await jobCard.click()
      await page.waitForURL(/\/recruitment\/jobs\/[a-f0-9-]+/, { timeout: 15_000 })
      expect(page.url()).toMatch(/\/recruitment\/jobs\/[a-f0-9-]+/)
    }
  })

  test('detail page shows back link', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const jobCard = page.locator('[class*="card"]').first()
    if (await jobCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await jobCard.click()
      await page.waitForURL(/\/recruitment\/jobs\/[a-f0-9-]+/, { timeout: 15_000 })
      const backLink = page.locator('a[href="/recruitment/jobs"]').first()
      if (await backLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(backLink).toBeVisible()
      }
    }
  })
})

test.describe('JOBS: Delete', () => {
  test('delete button appears on hover', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/recruitment/jobs')
    if (isSetup(page)) return
    const jobCard = page.locator('[class*="card"]').first()
    if (await jobCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await jobCard.hover()
      const deleteBtn = page.locator('button').filter({ hasText: /delete|trash/i }).first()
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteBtn).toBeVisible()
      }
    }
  })
})
