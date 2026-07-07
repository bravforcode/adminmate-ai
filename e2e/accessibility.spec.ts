import { test, expect, ensureHRAuthenticated, waitForPageReady } from './helpers'

// ─── Accessibility: Manual Checks ──────────────────────────────
// These are simple, targeted a11y checks that don't require axe-core.
// For comprehensive WCAG scanning, see a11y.spec.ts which uses axe-core.

test.describe('A11y: Images have alt text', () => {
  test('no empty alt attributes on images', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const images = page.locator('img')
    const count = await images.count()
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      // alt should be either a non-empty string or null (decorative image with role="presentation")
      const role = await img.getAttribute('role')
      const hasValidAlt = alt !== undefined && alt !== null && alt !== '' || role === 'presentation' || role === 'none'
      expect(hasValidAlt, `Image at index ${i} has empty or missing alt`).toBe(true)
    }
  })

  test('no empty alt attributes on authenticated pages', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/dashboard')
    await waitForPageReady(page)

    const images = page.locator('img')
    const count = await images.count()
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')
      const hasValidAlt = alt !== undefined && alt !== null && alt !== '' || role === 'presentation' || role === 'none'
      expect(hasValidAlt, `Image at index ${i} has empty or missing alt`).toBe(true)
    }
  })
})

test.describe('A11y: Form inputs have labels', () => {
  test('login form inputs have associated labels', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('#role-card-hr').click()
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })

    const emailInput = page.locator('[data-testid="email-input"]')
    const emailId = await emailInput.getAttribute('id')
    const emailAriaLabel = await emailInput.getAttribute('aria-label')
    const emailAriaLabelledBy = await emailInput.getAttribute('aria-labelledby')
    const emailHasLabel = emailId
      ? (await page.locator(`label[for="${emailId}"]`).count()) > 0
      : false
    expect(emailHasLabel || !!emailAriaLabel || !!emailAriaLabelledBy, 'Email input has no associated label').toBe(true)

    const pwInput = page.locator('[data-testid="password-input"]')
    const pwId = await pwInput.getAttribute('id')
    const pwAriaLabel = await pwInput.getAttribute('aria-label')
    const pwAriaLabelledBy = await pwInput.getAttribute('aria-labelledby')
    const pwHasLabel = pwId
      ? (await page.locator(`label[for="${pwId}"]`).count()) > 0
      : false
    expect(pwHasLabel || !!pwAriaLabel || !!pwAriaLabelledBy, 'Password input has no associated label').toBe(true)
  })

  test('registration form inputs have labels', async ({ page }) => {
    await page.goto('/register')
    await waitForPageReady(page)

    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')
      const placeholder = await input.getAttribute('placeholder')
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false
      expect(
        hasLabel || !!ariaLabel || !!ariaLabelledBy || !!placeholder,
        `Form input at index ${i} has no associated label, aria-label, or placeholder`
      ).toBe(true)
    }
  })
})

test.describe('A11y: Heading hierarchy', () => {
  test('heading hierarchy is valid (no skipped levels)', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
      els.map((el) => parseInt(el.tagName.charAt(1)))
    )
    // Check that headings don't skip levels (e.g., h1 -> h3 without h2)
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1]
      expect(
        diff <= 0 || diff === 1,
        `Heading hierarchy skips: h${headings[i - 1]} -> h${headings[i]}`
      ).toBe(true)
    }
  })

  test('dashboard heading hierarchy is valid', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/dashboard')
    await waitForPageReady(page)

    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
      els.map((el) => parseInt(el.tagName.charAt(1)))
    )
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1]
      expect(
        diff <= 0 || diff === 1,
        `Heading hierarchy skips: h${headings[i - 1]} -> h${headings[i]}`
      ).toBe(true)
    }
  })

  test('settings page heading hierarchy is valid', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/settings')
    await waitForPageReady(page)

    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
      els.map((el) => parseInt(el.tagName.charAt(1)))
    )
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1]
      expect(
        diff <= 0 || diff === 1,
        `Heading hierarchy skips: h${headings[i - 1]} -> h${headings[i]}`
      ).toBe(true)
    }
  })
})
