import { test as base, expect, type Page } from '@playwright/test'

// ─── Test Credentials ────────────────────────────────────────────
export const HR_USER = {
  email: 'testlogin99@gmail.com',
  password: 'Test123456!',
}

export function freshEmail() {
  return `e2e+${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.com`
}

// ─── Navigate to login form (handles role-select step) ──────────
async function goToLoginForm(page: Page) {
  await page.goto('/login')
  // The login page has a role-select step first — click the HR card to proceed
  const hrCard = page.locator('#role-card-hr')
  await hrCard.waitFor({ state: 'visible', timeout: 15_000 })
  await hrCard.click()
  // Now the LoginForm should be visible
  await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
}

// ─── Auth Helpers ────────────────────────────────────────────────
export async function signInAsHR(page: Page) {
  await goToLoginForm(page)
  await page.locator('[data-testid="email-input"]').fill(HR_USER.email)
  await page.locator('[data-testid="password-input"]').fill(HR_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/(dashboard|setup-company|onboarding)/, { timeout: 30_000 })
}

export async function signInAs(page: Page, email: string, password: string) {
  await goToLoginForm(page)
  await page.locator('[data-testid="email-input"]').fill(email)
  await page.locator('[data-testid="password-input"]').fill(password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/(dashboard|setup-company|onboarding)/, { timeout: 30_000 })
}

export async function signOut(page: Page) {
  // The UserMenu is a button with the user's initial (rounded avatar button in the header)
  // It has aria-label with the user's full name
  const userMenuBtn = page.locator('button[aria-haspopup="true"]').first()
  if (await userMenuBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await userMenuBtn.click()
    await page.waitForTimeout(500)
  }
  // Sign out is a menu item button with LogOut icon + "sign out" text
  const signOutBtn = page.locator('button').filter({ hasText: /sign out|log out/i }).first()
  if (await signOutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await signOutBtn.click()
    await page.waitForURL(/\/login/, { timeout: 15_000 })
  }
}

// ─── Navigation Helpers ──────────────────────────────────────────
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  await page.locator('[class*="skeleton"], [class*="loading"]').first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

export async function navigateTo(page: Page, path: string) {
  await page.goto(path)
  await waitForPageReady(page)
}

// ─── Assertion Helpers ───────────────────────────────────────────
export async function expectVisible(page: Page, selector: string, timeout = 10_000) {
  await expect(page.locator(selector).first()).toBeVisible({ timeout })
}

export async function expectTextVisible(page: Page, text: string | RegExp, timeout = 10_000) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout })
}

// ─── Random Data Generators ──────────────────────────────────────
export function randomName() {
  return `E2E User ${Math.random().toString(36).slice(2, 8)}`
}

export function randomCompanyName() {
  return `Test Corp ${Math.random().toString(36).slice(2, 6)}`
}

// ─── Custom test fixture ─────────────────────────────────────────
type TestFixtures = {
  hrPage: Page
}

export const test = base.extend<TestFixtures>({
  hrPage: async ({ page }, use) => {
    await signInAsHR(page)
    await waitForPageReady(page)
    await use(page)
  },
})

export { expect }
