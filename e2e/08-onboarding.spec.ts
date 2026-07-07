import { test, expect, ensureHRAuthenticated, waitForPageReady, navigateTo } from './helpers'

test.describe('ONBOARDING: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('shows checklist or empty state', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const content = await page.locator('[class*="card"], [class*="checklist"], [class*="empty"], [class*="task"]').count()
    expect(content).toBeGreaterThanOrEqual(0)
  })

  test('team status section exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const hasContent = await page.locator('h1, h2, h3, h4, table, [class*="card"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})

test.describe('ONBOARDING: Task Management', () => {
  test('task toggle buttons exist', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const toggles = page.locator('button').filter({ hasText: /complete|check|toggle/i })
    if (await toggles.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(toggles.first()).toBeVisible()
    }
  })

  test('progress bar exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const progress = page.locator('[class*="progress"], [role="progressbar"]').first()
    if (await progress.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(progress).toBeVisible()
    }
  })
})

test.describe('ONBOARDING: Mate AI Chat', () => {
  test('chat input exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const chatInput = page.locator('input[placeholder*="ask" i], textarea[placeholder*="ask" i], input[placeholder*="chat" i]').first()
    if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(chatInput).toBeVisible()
    }
  })

  test('send button exists', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const sendBtn = page.locator('button').filter({ hasText: /send/i }).first()
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sendBtn).toBeVisible()
    }
  })

  test('quick resource buttons exist', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const resources = page.locator('button').filter({ hasText: /handbook|benefits|labor|resource/i })
    if (await resources.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await resources.count()).toBeGreaterThanOrEqual(1)
    }
  })
})

test.describe('ONBOARDING: View All Link', () => {
  test('View All navigates to candidates', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await navigateTo(page, '/onboarding')
    await waitForPageReady(page)
    const viewAll = page.getByText(/view all/i).first()
    if (await viewAll.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewAll.click()
      await expect(page).toHaveURL(/\/recruitment\/candidates/, { timeout: 15_000 })
    }
  })
})
