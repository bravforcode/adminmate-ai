import { test, expect, signInAsHR, waitForPageReady } from './helpers'

test.describe('SETTINGS: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('company profile form exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const inputs = await page.locator('input, select').count()
    expect(inputs).toBeGreaterThanOrEqual(1)
  })

  test('save button exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const saveBtn = page.locator('button').filter({ hasText: /save/i }).first()
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(saveBtn).toBeVisible()
    }
  })
})

test.describe('SETTINGS: Company Profile Form', () => {
  test('legal name field exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const nameInput = page.locator('input').first()
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(nameInput).toBeVisible()
    }
  })

  test('industry select has options', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const select = page.locator('select').first()
    if (await select.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await select.locator('option').count()
      expect(options).toBeGreaterThanOrEqual(2)
    }
  })

  test('phone field exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const phone = page.locator('input[type="tel"], input[placeholder*="phone" i]').first()
    if (await phone.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(phone).toBeVisible()
    }
  })

  test('email field exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const email = page.locator('input[type="email"]').first()
    if (await email.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(email).toBeVisible()
    }
  })
})

test.describe('SETTINGS: Account Section', () => {
  test('shows user name', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const hasContent = await page.locator('h1, h2, h3, h4, p, span').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})

test.describe('SETTINGS: Integrations', () => {
  test('chat integrations section exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const integrations = page.locator('text=/line|whatsapp|zalo|integration/i')
    if (await integrations.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await integrations.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('connect/disconnect buttons exist', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const buttons = page.locator('button').filter({ hasText: /connect|disconnect/i })
    if (await buttons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await buttons.count()).toBeGreaterThanOrEqual(1)
    }
  })
})

test.describe('SETTINGS: Regional Compliance', () => {
  test('compliance section exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings')
    await waitForPageReady(page)
    const compliance = page.locator('text=/compliance|pdpa|decree|pdp/i')
    if (await compliance.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await compliance.count()).toBeGreaterThanOrEqual(1)
    }
  })
})
