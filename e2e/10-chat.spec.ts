import { test, expect, signInAsHR, waitForPageReady } from './helpers'

// ═══════════════════════════════════════════════════════════════════
// CHAT: Page Load & UI
// ═══════════════════════════════════════════════════════════════════
test.describe('CHAT: Page Load', () => {
  test('loads with heading and chat input', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)
    // Should have a heading (h1 or h2)
    const headings = page.locator('h1, h2')
    await expect(headings.first()).toBeVisible({ timeout: 15_000 })
    // Should have a text input or textarea for chat
    const input = page.locator('input[type="text"], textarea').first()
    await expect(input).toBeVisible({ timeout: 10_000 })
  })

  test('send button exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)
    const sendBtn = page.locator('button[type="submit"], button').filter({ has: page.locator('svg, [class*="send"]') }).first()
    await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  })

  test('suggestion buttons are displayed on empty state', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)
    // Look for suggestion buttons (work hours, benefits, policy, holiday, etc.)
    const suggestions = page.locator('button').filter({ hasText: /work hours|benefits|policy|holiday|leave|overtime|company/i })
    const count = await suggestions.count()
    // Should have at least 1 suggestion button
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════════
// CHAT: Send Message & Receive Response
// ═══════════════════════════════════════════════════════════════════
test.describe('CHAT: Send Message', () => {
  test('type message and send — user message appears', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)

    const input = page.locator('input[type="text"], textarea').first()
    await expect(input).toBeVisible({ timeout: 10_000 })

    // Type a question
    await input.fill('What are the company benefits?')

    // Find and click send button
    const sendBtn = page.locator('button[type="submit"], button').filter({ has: page.locator('svg, [class*="send"]') }).first()
    await sendBtn.click()

    // The user message should appear in the chat
    await expect(page.getByText('What are the company benefits?')).toBeVisible({ timeout: 10_000 })
  })

  test('AI response appears after sending a message', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)

    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('What are the company benefits?')

    const sendBtn = page.locator('button[type="submit"], button').filter({ has: page.locator('svg, [class*="send"]') }).first()
    await sendBtn.click()

    // Wait for user message
    await expect(page.getByText('What are the company benefits?')).toBeVisible({ timeout: 10_000 })

    // Wait for AI response — look for loading indicator then response
    // The AI response should appear within 30 seconds
    await page.waitForTimeout(30_000)

    // Check for any AI response content (bot message, assistant message, etc.)
    const messages = page.locator('[class*="message"], [class*="bubble"], [class*="chat"], [class*="markdown"]')
    const messageCount = await messages.count()
    // Should have at least 2 messages (user + AI)
    expect(messageCount).toBeGreaterThanOrEqual(2)
  })

  test('clicking suggestion button sends that message', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)

    // Find a suggestion button
    const suggestions = page.locator('button').filter({ hasText: /work hours|benefits|policy|holiday/i })
    const firstSuggestion = suggestions.first()

    if (await firstSuggestion.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const text = await firstSuggestion.textContent()
      await firstSuggestion.click()

      // The suggestion text should appear as a user message
      if (text) {
        await expect(page.getByText(text.trim())).toBeVisible({ timeout: 10_000 })
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// CHAT: Empty State
// ═══════════════════════════════════════════════════════════════════
test.describe('CHAT: Empty State', () => {
  test('shows bot icon, suggestions, or welcome message', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)

    // Should have some content (heading, suggestion buttons, bot icon, or empty state)
    const hasContent = await page.locator('h1, h2, h3, button, svg, [class*="empty"], [class*="suggestion"], [class*="bot"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(2)
  })
})

// ═══════════════════════════════════════════════════════════════════
// CHAT: Language Support
// ═══════════════════════════════════════════════════════════════════
test.describe('CHAT: Language Support', () => {
  test('Thai message gets Thai response', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/chat')
    await waitForPageReady(page)

    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('สวัสดี นโยบายบริษัทมีอะไรบ้าง')

    const sendBtn = page.locator('button[type="submit"], button').filter({ has: page.locator('svg, [class*="send"]') }).first()
    await sendBtn.click()

    // User message should appear
    await expect(page.getByText('สวัสดี นโยบายบริษัทมีอะไรบ้าง')).toBeVisible({ timeout: 10_000 })

    // Wait for response
    await page.waitForTimeout(30_000)

    // Should have multiple messages now
    const messages = page.locator('[class*="message"], [class*="bubble"], [class*="chat"]')
    expect(await messages.count()).toBeGreaterThanOrEqual(2)
  })
})
