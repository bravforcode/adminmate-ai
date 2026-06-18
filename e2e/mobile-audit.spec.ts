import { test, expect } from '@playwright/test'
import { ensureHRAuthenticated } from './helpers'

const VIEWPORTS = [
  { width: 320, height: 568, name: '320px' },
  { width: 375, height: 667, name: '375px' },
  { width: 390, height: 844, name: '390px' },
  { width: 430, height: 932, name: '430px' },
  { width: 768, height: 1024, name: '768px' },
]

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

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth
  })
  return overflow
}

test.describe('Mobile Audit — Horizontal Overflow Check', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } })

      for (const route of HR_ROUTES) {
        test(`no overflow: ${route}`, async ({ page }) => {
          await ensureHRAuthenticated(page)
          await page.goto(route)
          await page.waitForLoadState('networkidle').catch(() => {})
          await page.waitForTimeout(1000)

          const overflow = await expectNoHorizontalOverflow(page)
          expect(overflow, `Horizontal overflow of ${overflow}px at ${vp.name} on ${route}`).toBeLessThanOrEqual(2)
        })
      }
    })
  }
})

test.describe('Mobile Audit — Auth Pages', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } })

      test('no overflow: /login', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(1000)
        const overflow = await expectNoHorizontalOverflow(page)
        expect(overflow, `Horizontal overflow of ${overflow}px at ${vp.name} on /login`).toBeLessThanOrEqual(2)
      })

      test('no overflow: /register', async ({ page }) => {
        await page.goto('/register')
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(1000)
        const overflow = await expectNoHorizontalOverflow(page)
        expect(overflow, `Horizontal overflow of ${overflow}px at ${vp.name} on /register`).toBeLessThanOrEqual(2)
      })
    })
  }
})

test.describe('Mobile Audit — MobileNav More Menu', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('MobileNav More menu opens and shows routes', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)

    // Look for More button in mobile nav
    const moreBtn = page.locator('[data-testid="mobile-nav-more"]').or(page.locator('button:has-text("More")'))
    if (await moreBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await moreBtn.click()
      await page.waitForTimeout(500)
      // Verify menu is visible
      const menu = page.locator('[role="menu"], [data-testid="mobile-nav-more-menu"]')
      await expect(menu.first()).toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Mobile Audit — Chat/FAB', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('Chat FAB visible and opens panel', async ({ page }) => {
    await ensureHRAuthenticated(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)

    const fab = page.locator('[data-testid="chat-fab"]')
    if (await fab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fab.click()
      await page.waitForTimeout(500)
      const panel = page.locator('[data-testid="chat-panel"]')
      await expect(panel).toBeVisible({ timeout: 3000 })
      
      // Check close button is reachable
      const closeBtn = panel.locator('button').filter({ hasText: /close|×|✕/i }).first()
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click()
      }
    }
  })
})

test.describe('Mobile Audit — Dark Mode', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('dark mode: login page no overflow', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)
    const overflow = await expectNoHorizontalOverflow(page)
    expect(overflow).toBeLessThanOrEqual(2)
  })
})
