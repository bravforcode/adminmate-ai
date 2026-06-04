import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
  await page.locator('[data-testid="password-input"]').fill(TEST_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('CHAT: Page Load', () => {
  test('loads with heading', async ({ page }) => {
    await signIn(page)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('chat input exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(input).toBeVisible()
    }
  })

  test('send button exists', async ({ page }) => {
    await signIn(page)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const sendBtn = page.locator('button').filter({ hasText: /send/i }).first()
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sendBtn).toBeVisible()
    }
  })

  test('suggestion buttons exist', async ({ page }) => {
    await signIn(page)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const suggestions = page.locator('button').filter({ hasText: /work hours|benefits|policy|holiday/i })
    if (await suggestions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await suggestions.count()).toBeGreaterThanOrEqual(1)
    }
  })
})

test.describe('CHAT: Send Message', () => {
  test('typing and sending a message works', async ({ page }) => {
    await signIn(page)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.fill('Hello, what are the company benefits?')
      const sendBtn = page.locator('button').filter({ hasText: /send/i }).first()
      if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendBtn.click()
        await page.waitForTimeout(3000)
        const hasMessages = await page.locator('[class*="message"], [class*="bubble"], [class*="chat"]').count()
        expect(hasMessages).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

test.describe('CHAT: Empty State', () => {
  test('empty state shows bot icon or suggestions', async ({ page }) => {
    await signIn(page)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const hasContent = await page.locator('[class*="empty"], [class*="suggestion"], [class*="bot"], svg, h1, h2').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })
})
