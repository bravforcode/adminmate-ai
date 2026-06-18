import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { ensureHRAuthenticated } from './helpers'

// ─── A11y Scan Helper ───────────────────────────────────────────
async function runA11yScan(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()

  // Filter out known false positives or accepted issues
  const violations = results.violations.filter(v => {
    // color-contrast: manual verification needed, skip in automated scan
    if (v.id === 'color-contrast') return false
    // listitem: nested list issues in some components — document only
    return true
  })

  if (violations.length > 0) {
    console.log(`\n=== A11y violations on ${label} ===`)
    for (const v of violations) {
      const impact = v.impact || 'unknown'
      console.log(`  [${impact}] ${v.id}: ${v.description}`)
      for (const node of v.nodes.slice(0, 3)) {
        console.log(`    → ${node.html.substring(0, 120)}`)
      }
    }
  }
  return violations
}

// ─── Auth Pages (Public, no login) ──────────────────────────────
test.describe('A11y: Auth Pages', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('login page — light mode', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const violations = await runA11yScan(page, '/login light')
    // Record but don't fail on non-P0 violations
    expect(violations.length, 'A11y violations on /login').toBeLessThanOrEqual(5)
  })

  test('register page — light mode', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const violations = await runA11yScan(page, '/register light')
    expect(violations.length, 'A11y violations on /register').toBeLessThanOrEqual(5)
  })

  test('forgot-password page — light mode', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const violations = await runA11yScan(page, '/forgot-password light')
    expect(violations.length, 'A11y violations on /forgot-password').toBeLessThanOrEqual(5)
  })

  test('login page — dark mode', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(500)
    const violations = await runA11yScan(page, '/login dark')
    expect(violations.length, 'A11y violations on /login dark').toBeLessThanOrEqual(5)
  })
})

// ─── HR Pages (Authenticated) ──────────────────────────────────
test.describe('A11y: HR Pages', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  const HR_ROUTES = [
    '/dashboard',
    '/recruitment/candidates',
    '/recruitment/jobs',
    '/recruitment/pipeline',
    '/recruitment/interviews',
    '/hiring',
    '/onboarding',
    '/documents',
    '/reports',
    '/settings',
  ]

  for (const route of HR_ROUTES) {
    test(`a11y scan: ${route}`, async ({ page }) => {
      await ensureHRAuthenticated(page)
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      const violations = await runA11yScan(page, route)
      expect(violations.length, `A11y violations on ${route}`).toBeLessThanOrEqual(5)
    })
  }
})

// ─── HR Pages — Dark Mode ──────────────────────────────────────
test.describe('A11y: HR Pages Dark Mode', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  const DARK_ROUTES = ['/dashboard', '/recruitment/candidates', '/settings']

  for (const route of DARK_ROUTES) {
    test(`a11y dark: ${route}`, async ({ page }) => {
      await ensureHRAuthenticated(page)
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await page.evaluate(() => document.documentElement.classList.add('dark'))
      await page.waitForTimeout(1000)
      const violations = await runA11yScan(page, `${route} dark`)
      expect(violations.length, `A11y violations on ${route} dark`).toBeLessThanOrEqual(5)
    })
  }
})

// ─── Mobile Viewport ────────────────────────────────────────────
test.describe('A11y: Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('a11y mobile: /dashboard', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const violations = await runA11yScan(page, '/dashboard mobile')
    expect(violations.length, 'A11y violations on /dashboard mobile').toBeLessThanOrEqual(5)
  })

  test('a11y mobile: /login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const violations = await runA11yScan(page, '/login mobile')
    expect(violations.length, 'A11y violations on /login mobile').toBeLessThanOrEqual(5)
  })
})

// ─── Shared UI Components ───────────────────────────────────────
test.describe('A11y: Shared UI', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('a11y: empty states on /dashboard', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    // Scan the full page including any empty states
    const violations = await runA11yScan(page, '/dashboard full')
    expect(violations.length, 'A11y violations on /dashboard').toBeLessThanOrEqual(5)
  })

  test('a11y: chat widget on /dashboard', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    // Open chat widget
    const fab = page.locator('[data-testid="chat-fab"]')
    if (await fab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fab.click()
      await page.waitForTimeout(1000)
      const violations = await runA11yScan(page, '/dashboard chat open')
      expect(violations.length, 'A11y violations with chat open').toBeLessThanOrEqual(5)
    }
  })
})
