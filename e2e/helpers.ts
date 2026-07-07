import { test as base, expect, type Page } from '@playwright/test'

// ─── Test Credentials ────────────────────────────────────────────
export const HR_USER = {
  email: process.env.E2E_TEST_EMAIL || 'testlogin99@gmail.com',
  password: process.env.E2E_TEST_PASSWORD || 'Test123456!',
}

export function freshEmail() {
  return `e2e+${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.com`
}

// ─── Navigate to login form (handles role-select step) ──────────
async function goToLoginForm(page: Page) {
  await page.goto('/login')
  // Neutralize storageState side effects before every UI login:
  // 1. A stale Supabase session in localStorage makes autoRefreshToken fire with a
  //    dead refresh_token → SIGNED_OUT → onAuthStateChange clears user → AuthGuard
  //    bounces the freshly signed-in page back to /login (intermittent, killed 40+
  //    chromium-hr tests). Clear unconditionally — every test does a UI login anyway.
  // 2. Without the tour-completed flag, OnboardingTour auto-starts 2s after profile
  //    load and its overlay intercepts pointer events on app pages.
  const hadSession = await page.evaluate(() => {
    const had = window.localStorage.getItem('adminmate-auth-token') !== null
    window.localStorage.removeItem('adminmate-auth-token')
    window.localStorage.removeItem('adminmate-auth')
    window.localStorage.setItem('adminmate_tour_completed_onboarding', 'true')
    return had
  })
  // Reboot so the in-memory Supabase client (already initialized with the stale
  // session + running refresh timer) starts clean.
  if (hadSession) await page.reload()
  // The login page has a role-select step first — click the HR card to proceed
  const hrCard = page.locator('#role-card-hr')
  await hrCard.waitFor({ state: 'visible', timeout: 15_000 })
  await hrCard.click()
  // Now the LoginForm should be visible
  await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
}

// ─── Complete Company Setup (if redirected to setup-company) ─────
async function completeCompanySetup(page: Page) {
  // Check if we landed on setup-company page
  if (!page.url().includes('setup-company')) return

  // Fill company name
  const nameInput = page.locator('[data-testid="company-name"]')
  await nameInput.waitFor({ state: 'visible', timeout: 10_000 })
  await nameInput.fill('E2E Test Company')

  // Select industry (Technology)
  const industrySelect = page.locator('select').first()
  await industrySelect.selectOption('Technology')

  // Country should default to TH, which is fine
  // Click submit button
  const submitBtn = page.locator('[data-testid="setup-company"]')
  await submitBtn.click()

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

// ─── Auth Helpers ────────────────────────────────────────────────

/**
 * Ensure the page is authenticated as HR.
 *
 * Stale-session clearing lives in goToLoginForm (the common path for every
 * UI login), so this is just the full login flow — signInAsHR also handles
 * completeCompanySetup.
 */
export async function ensureHRAuthenticated(page: Page) {
  await signInAsHR(page)
}

export async function signInAsHR(page: Page) {
  await goToLoginForm(page)
  await page.locator('[data-testid="email-input"]').fill(HR_USER.email)
  await page.locator('[data-testid="password-input"]').fill(HR_USER.password)
  await page.locator('[data-testid="login-button"]').click()
  // After login, may redirect to dashboard, setup-company, OR the originally requested protected route
  await page.waitForURL(
    (url) => {
      const path = url.pathname
      return (
        path.includes('/dashboard') ||
        path.includes('/setup-company') ||
        path.includes('/onboarding') ||
        path.includes('/recruitment') ||
        path.includes('/settings') ||
        path.includes('/reports') ||
        path.includes('/documents') ||
        path.includes('/monitoring') ||
        path.includes('/health')
      )
    },
    { timeout: 30_000 },
  )

  // If redirected to setup-company, complete the form
  await completeCompanySetup(page)
}

export async function signInAs(page: Page, email: string, password: string) {
  await goToLoginForm(page)
  await page.locator('[data-testid="email-input"]').fill(email)
  await page.locator('[data-testid="password-input"]').fill(password)
  await page.locator('[data-testid="login-button"]').click()
  // After login, may redirect to dashboard, setup-company, OR the originally requested protected route
  await page.waitForURL(
    (url) => {
      const path = url.pathname
      return (
        path.includes('/dashboard') ||
        path.includes('/setup-company') ||
        path.includes('/onboarding') ||
        path.includes('/recruitment') ||
        path.includes('/settings') ||
        path.includes('/reports') ||
        path.includes('/documents') ||
        path.includes('/monitoring') ||
        path.includes('/health')
      )
    },
    { timeout: 30_000 },
  )

  // If redirected to setup-company, complete the form
  await completeCompanySetup(page)
}

export async function signOut(page: Page) {
  // Wait for page to be fully loaded and on a protected route
  await page.waitForURL(/\/(dashboard|setup-company|settings|recruitment)/, { timeout: 15_000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  // Extra wait for React to render the layout
  await page.waitForTimeout(1000)
  // Click the user menu button (has data-testid="user-menu-button")
  const userMenuBtn = page.locator('[data-testid="user-menu-button"]')
  await userMenuBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await userMenuBtn.click()
  // Wait for dropdown menu to appear
  await page.waitForTimeout(500)
  // Click sign out button
  const signOutBtn = page.locator('button').filter({ hasText: /sign out|log out/i }).first()
  await signOutBtn.waitFor({ state: 'visible', timeout: 5_000 })
  await signOutBtn.click()
  await page.waitForURL(/\/login/, { timeout: 15_000 })
}

// ─── Navigation Helpers ──────────────────────────────────────────
export async function waitForPageReady(page: Page) {
  // On full page.reload/goto, the Supabase client re-initializes from localStorage
  // and the parent AppLayout's AuthGuard calls initSession which sets isLoading=true.
  // Child routes (callInitSession={false}) inherit this loading state. The initSession
  // call includes supabase.auth.getSession() which can take several seconds on a cold
  // client init. Using networkidle is unreliable (realtime WebSocket), so we wait for
  // actual page content to appear instead.
  await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {})
  // Wait for the AuthGuard loading spinner to disappear (up to 25s for slow Supabase init).
  await page
    .locator('[data-testid="auth-guard-loading"]')
    .waitFor({ state: 'hidden', timeout: 25_000 })
    .catch(() => {})
  // Also wait for any real content to render (covers CompanySetupGuard spinner too).
  await page
    .locator('h1, h2, h3, main, nav, aside, [class*="card"], [class*="skeleton"], form')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {})
}

export async function navigateTo(page: Page, path: string) {
  // If already on the target route, skip navigation
  if (page.url().endsWith(path)) {
    await waitForPageReady(page)
    return
  }
  // Try SPA navigation first (preserves storageState auth)
  // Only works if page is already on the app (not about:blank)
  const isOnApp = page.url().includes('localhost') || page.url().includes('vercel.app')
  if (isOnApp) {
    await page.evaluate((p) => {
      window.history.pushState({}, '', p)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, path)
    // Give React Router time to unmount old route + mount new route.
    // Without this, waitForPageReady's content check matches the OLD page's
    // elements and returns before the new route renders → count()=0 race.
    await page.waitForTimeout(800)
    await waitForPageReady(page)
    // If SPA nav redirected to login (session lost), fall back to full navigation
    if (page.url().includes('/login')) {
      await page.goto(path)
      await waitForPageReady(page)
      // If still on login, re-authenticate
      if (page.url().includes('/login')) {
        await signInAsHR(page)
        await page.evaluate((p) => {
          window.history.pushState({}, '', p)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }, path)
        await waitForPageReady(page)
      }
    }
  } else {
    // First navigation — use page.goto
    await page.goto(path)
    await waitForPageReady(page)
    // If page.goto caused session loss and redirected to login, re-login and retry
    if (page.url().includes('/login')) {
      await signInAsHR(page)
      // Use SPA navigation to avoid another full page reload
      await page.evaluate((p) => {
        window.history.pushState({}, '', p)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }, path)
      await waitForPageReady(page)
    }
  }
}

// ─── Chat Widget Helpers ─────────────────────────────────────────
export async function openChatWidget(page: Page) {
  // Wait for the chat FAB to be visible
  const fab = page.locator('[data-testid="chat-fab"]')
  await fab.waitFor({ state: 'visible', timeout: 15_000 })
  await fab.click()
  // Wait for chat panel to appear
  const panel = page.locator('[data-testid="chat-panel"]')
  await panel.waitFor({ state: 'visible', timeout: 10_000 })
}

export async function closeChatWidget(page: Page) {
  const fab = page.locator('[data-testid="chat-fab"]')
  if (await fab.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await fab.click()
    await page.locator('[data-testid="chat-panel"]').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
  }
}

export async function sendChatMessage(page: Page, text: string) {
  const input = page.locator('[data-testid="chat-input"]')
  await input.waitFor({ state: 'visible', timeout: 5_000 })
  await input.fill(text)
  // Press Enter to send
  await input.press('Enter')
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
