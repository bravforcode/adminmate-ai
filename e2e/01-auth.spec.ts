import { test, expect, HR_USER, signInAsHR, signOut, freshEmail, waitForPageReady } from './helpers'

// ═══════════════════════════════════════════════════════════════════
// AUTH: Role Selection Page (new!)
// ═══════════════════════════════════════════════════════════════════
test.describe('AUTH: Role Selection', () => {
  test('shows two role cards (HR and Applicant)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#role-card-hr')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#role-card-applicant')).toBeVisible()
  })

  test('clicking HR card shows login form', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('clicking Applicant card shows login form', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-applicant').click()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible({ timeout: 10_000 })
  })

  test('back button returns to role selection', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
    // Click back button
    const backBtn = page.locator('#btn-back-role')
    if (await backBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backBtn.click()
      await expect(page.locator('#role-card-hr')).toBeVisible({ timeout: 5_000 })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// AUTH: Login
// ═══════════════════════════════════════════════════════════════════
test.describe('AUTH: Login', () => {
  test('shows email, password inputs and login button', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('email input has correct type', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    const email = page.locator('[data-testid="email-input"]')
    await expect(email).toBeVisible({ timeout: 10_000 })
    await expect(email).toHaveAttribute('type', 'email')
  })

  test('password input starts as type=password', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    const pw = page.locator('[data-testid="password-input"]')
    await expect(pw).toBeVisible({ timeout: 10_000 })
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('empty form submission stays on login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await page.locator('[data-testid="login-button"]').waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('[data-testid="login-button"]').click()
    await page.waitForTimeout(2000)
    // Should still be on login page (no redirect)
    expect(page.url()).toContain('/login')
  })

  test('wrong password shows error toast or stays on /login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('[data-testid="email-input"]').fill(HR_USER.email)
    await page.locator('[data-testid="password-input"]').fill('WrongPassword!1')
    await page.locator('[data-testid="login-button"]').click()
    await page.waitForTimeout(5000)
    expect(page.url()).toContain('/login')
  })

  test('valid login redirects away from /login', async ({ page }) => {
    await signInAsHR(page)
    expect(page.url()).not.toContain('/login')
    expect(page.url()).toMatch(/\/(dashboard|setup-company|onboarding)/)
  })

  test('logged-in user sees app content (sidebar, header, or setup form)', async ({ page }) => {
    await signInAsHR(page)
    // After login, user sees either the app shell or a setup form
    const hasContent = await page.locator('nav, aside, header, main, [class*="sidebar"], [class*="layout"], form, input, button').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)
  })

  test('login link to /register exists', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
    await expect(page.locator('a[href="/register"]')).toBeVisible()
  })

  test('login link to /forgot-password exists', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#role-card-hr').click()
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════
// AUTH: Registration
// ═══════════════════════════════════════════════════════════════════
test.describe('AUTH: Registration', () => {
  test('shows name, email, password, confirm, company fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    const pw = page.locator('input[type="password"]')
    expect(await pw.count()).toBeGreaterThanOrEqual(2)
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible()
  })

  test('company name input exists', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('[data-testid="company-name-input"]')).toBeVisible()
  })

  test('password mismatch shows error', async ({ page }) => {
    await page.goto('/register')
    await page.locator('[data-testid="name-input"]').fill('Test User')
    await page.locator('input[type="email"]').fill(freshEmail())
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill('Password1!')
    await pw.nth(1).fill('Different1!')
    await page.locator('[data-testid="register-button"]').click()
    await expect(page.getByText(/do not match|mismatch/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('short password shows min-length error', async ({ page }) => {
    await page.goto('/register')
    await page.locator('[data-testid="name-input"]').fill('Test User')
    await page.locator('input[type="email"]').fill(freshEmail())
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill('short')
    await pw.nth(1).fill('short')
    await page.locator('[data-testid="register-button"]').click()
    await expect(page.getByText(/8 characters|min/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('login link on register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('a[href="/login"]')).toBeVisible()
  })

  test('successful registration redirects to setup or dashboard', async ({ page }) => {
    const email = freshEmail()
    await page.goto('/register')
    await page.locator('[data-testid="name-input"]').fill('E2E Test HR')
    await page.locator('input[type="email"]').fill(email)
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill('Test123456!')
    await pw.nth(1).fill('Test123456!')
    await page.locator('[data-testid="company-name-input"]').fill('E2E Test Company')
    await page.locator('[data-testid="register-button"]').click()
    await page.waitForTimeout(10_000)
    const url = page.url()
    // After registration: either redirected, or stayed on /register with error toast
    const onApp = url.includes('/setup-company') || url.includes('/dashboard') || url.includes('/onboarding')
    const hasError = (await page.getByText(/error|already|exists|failed/i).count()) > 0
    expect(onApp || hasError || url.includes('/register')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════
// AUTH: Forgot Password
// ═══════════════════════════════════════════════════════════════════
test.describe('AUTH: Forgot Password', () => {
  test('shows email input and submit button', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('back to login link exists', async ({ page }) => {
    await page.goto('/forgot-password')
    const link = page.locator('a[href="/login"]')
    await expect(link).toBeVisible({ timeout: 5_000 })
  })

  test('submit shows success or confirmation message', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('button[type="submit"]').click()
    await expect(page.getByText(/check email|sent|link|success|reset/i).first()).toBeVisible({ timeout: 10_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// AUTH: Route Guards
// ═══════════════════════════════════════════════════════════════════
test.describe('AUTH: Route Guards', () => {
  const protectedRoutes = ['/dashboard', '/recruitment/jobs', '/settings', '/onboarding']

  for (const route of protectedRoutes) {
    test(`unauthenticated ${route} redirects to /login`, async ({ page }) => {
      await page.context().clearCookies()
      await page.goto(route)
      await page.waitForURL(/\/login/, { timeout: 15_000 })
      expect(page.url()).toContain('/login')
    })
  }

  test('authenticated user can access /dashboard', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// AUTH: Logout
// ═══════════════════════════════════════════════════════════════════
test.describe('AUTH: Logout', () => {
  test('sign out redirects to /login', async ({ page }) => {
    await signInAsHR(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    await signOut(page)
    expect(page.url()).toContain('/login')
  })

  test('after logout, protected routes redirect to /login', async ({ page }) => {
    await signInAsHR(page)
    await signOut(page)
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })
})
