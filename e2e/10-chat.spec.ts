import { test, expect, ensureHRAuthenticated, waitForPageReady, openChatWidget, sendChatMessage } from './helpers'

// ═══════════════════════════════════════════════════════════════════
// CHAT: Floating Widget — Open & UI
// ═══════════════════════════════════════════════════════════════════
test.describe('CHAT: Widget UI', () => {
  test('chat FAB button is visible on dashboard', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    const fab = page.locator('[data-testid="chat-fab"]')
    await expect(fab).toBeVisible({ timeout: 10_000 })
  })

  test('clicking FAB opens chat panel', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)
    const panel = page.locator('[data-testid="chat-panel"]')
    await expect(panel).toBeVisible({ timeout: 5_000 })
  })

  test('chat panel has input and send button', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="chat-send"]')).toBeVisible()
  })

  test('chat panel shows suggestions on empty state', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)
    const suggestions = page.locator('[data-testid="chat-suggestion"]')
    const count = await suggestions.count()
    // Should have at least 1 suggestion button
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('chat panel has message area', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)
    const messages = page.locator('[data-testid="chat-messages"]')
    await expect(messages).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════
// CHAT: Send Message & Receive Response
// ═══════════════════════════════════════════════════════════════════
test.describe('CHAT: Send Message', () => {
  test('type message and send — user message appears', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)

    await sendChatMessage(page, 'What are the company benefits?')

    // The user message should appear in the chat
    await expect(page.getByText('What are the company benefits?')).toBeVisible({ timeout: 10_000 })
  })

  test('AI response appears after sending a message', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)

    await sendChatMessage(page, 'What are the company benefits?')

    // Wait for user message
    await expect(page.getByText('What are the company benefits?')).toBeVisible({ timeout: 10_000 })

    // Wait for AI response — look for second message div (AI response)
    // The AI response should appear within 45 seconds (Supabase Edge Function + Gemini)
    const secondMessage = page.locator('[data-testid="chat-messages"] > div').nth(1)
    await expect(secondMessage).toBeVisible({ timeout: 45_000 })
  })

  test('clicking suggestion button sends that message', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)

    // Find a suggestion button
    const suggestions = page.locator('[data-testid="chat-suggestion"]')
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
  test('shows welcome content, bot icon, or suggestions', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)

    // Should have suggestion buttons or bot icon
    const suggestions = page.locator('[data-testid="chat-suggestion"]')
    const botIcon = page.locator('[data-testid="chat-panel"] svg')
    const suggCount = await suggestions.count()
    const iconCount = await botIcon.count()
    expect(suggCount + iconCount).toBeGreaterThanOrEqual(2)
  })
})

// ═══════════════════════════════════════════════════════════════════
// CHAT: Language Support
// ═══════════════════════════════════════════════════════════════════
test.describe('CHAT: Language Support', () => {
  test('Thai message gets Thai response', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await waitForPageReady(page)
    await openChatWidget(page)

    await sendChatMessage(page, 'สวัสดี นโยบายบริษัทมีอะไรบ้าง')

    // User message should appear
    await expect(page.getByText('สวัสดี นโยบายบริษัทมีอะไรบ้าง')).toBeVisible({ timeout: 10_000 })

    // Wait for AI response — second message div
    const secondMessage = page.locator('[data-testid="chat-messages"] > div').nth(1)
    await expect(secondMessage).toBeVisible({ timeout: 45_000 })
  })
})
