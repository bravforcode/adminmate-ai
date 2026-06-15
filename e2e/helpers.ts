import { test as base, expect, type Page } from '@playwright/test'

// ─── Test Credentials ────────────────────────────────────────────
// Primary test account (pre-existing in Supabase)
export const HR_USER = {
  email: 'testlogin99@gmail.com',
  password: 'Test123456!',
}

// Fresh account for registration tests (unique per run)
export function freshEmail() {
  return `e2e+${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.com`
}

// ─── Auth Helpers ────────────────────────────────────────────────
export async function signInAsHR(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(HR_USER.email)
  await page.locator('[data-testid="password-input"]').fill(HR_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  // Wait for redirect — user may land on /dashboard, /setup-company, or /onboarding
  await page.waitForURL(/\/(dashboard|setup-company|onboarding)/, { timeout: 30_000 })
}

export async function signInAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(email)
  await page.locator('[data-testid="password-input"]').fill(password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/(dashboard|setup-company|onboarding)/, { timeout: 30_000 })
}

export async function signOut(page: Page) {
  // Click user menu → sign out
  const userMenuBtn = page.locator('[data-testid="user-menu-button"], button').filter({ has: page.locator('img, svg, [class*="avatar"]') }).first()
  if (await userMenuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await userMenuBtn.click()
    await page.waitForTimeout(300)
  }
  const signOutBtn = page.getByRole('button', { name: /sign out|logout|log out/i }).first()
  if (await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signOutBtn.click()
    await page.waitForURL(/\/login/, { timeout: 15_000 })
  }
}

// ─── Navigation Helpers ──────────────────────────────────────────
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  // Wait for any loading skeletons to disappear
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
