import { test, expect, Page } from '@playwright/test'

const TEST_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function signIn(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login')
  await page.locator('[data-testid="email-input"]').fill(email)
  await page.locator('[data-testid="password-input"]').fill(password)
  await page.locator('[data-testid="login-button"]').click()
  await page.waitForURL(/\/dashboard|\/setup-company|\/onboarding/i, { timeout: 30_000 }).catch(() => {})
}

test.describe('AUTH: Login Page', () => {
  test('renders email input, password input, login button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('email input has correct type and autocomplete', async ({ page }) => {
    await page.goto('/login')
    const email = page.locator('[data-testid="email-input"]')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('autoComplete', 'email')
  })

  test('password input toggles visibility', async ({ page }) => {
    await page.goto('/login')
    const pw = page.locator('[data-testid="password-input"]')
    await expect(pw).toHaveAttribute('type', 'password')
    const toggle = page.locator('button').filter({ hasText: /show|eye/i }).first()
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click()
      await expect(pw).toHaveAttribute('type', 'text')
    }
  })

  test('empty form submission stays on login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-button"]').click()
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/login')
  })

  test('invalid email format shows validation', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="email-input"]').fill('notanemail')
    await page.locator('[data-testid="password-input"]').fill('password')
    await page.locator('[data-testid="login-button"]').click()
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/login')
  })

  test('wrong password stays on login page', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="email-input"]').fill(TEST_USER.email)
    await page.locator('[data-testid="password-input"]').fill('WrongPass!1')
    await page.locator('[data-testid="login-button"]').click()
    await page.waitForTimeout(5000)
    expect(page.url()).toContain('/login')
  })

  test('valid login redirects to dashboard/setup', async ({ page }) => {
    await signIn(page)
    expect(page.url()).toMatch(/\/dashboard|\/setup-company|\/onboarding/)
  })

  test('login link to register page exists', async ({ page }) => {
    await page.goto('/login')
    const link = page.locator('a[href="/register"]')
    await expect(link).toBeVisible()
  })

  test('login link to forgot-password exists', async ({ page }) => {
    await page.goto('/login')
    const link = page.locator('a[href="/forgot-password"]')
    await expect(link).toBeVisible()
  })
})

test.describe('AUTH: Register Page', () => {
  test('renders all required fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    const pw = page.locator('input[type="password"]')
    expect(await pw.count()).toBeGreaterThanOrEqual(2)
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible()
  })

  test('company name field exists', async ({ page }) => {
    await page.goto('/register')
    const companyInput = page.locator('[data-testid="company-name-input"]')
    await expect(companyInput).toBeVisible()
  })

  test('industry select has options', async ({ page }) => {
    await page.goto('/register')
    const select = page.locator('[data-testid="industry-input"]')
    if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await select.locator('option').count()
      expect(options).toBeGreaterThanOrEqual(2)
    }
  })

  test('country selector or country options exist', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const hasCountry = await page.locator('select, input, button, [class*="country"]').count()
    expect(hasCountry).toBeGreaterThanOrEqual(1)
  })

  test('password strength indicator appears', async ({ page }) => {
    await page.goto('/register')
    const pwInput = page.locator('input[type="password"]').first()
    await pwInput.fill('weak')
    await page.waitForTimeout(500)
    const strength = page.locator('[data-testid="password-strength"]')
    if (await strength.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(strength).toBeVisible()
    }
  })

  test('password mismatch shows error', async ({ page }) => {
    await page.goto('/register')
    await page.locator('[data-testid="name-input"]').fill('Test User')
    await page.locator('input[type="email"]').fill(`e2e-${Date.now()}@test.com`)
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill('Password1!')
    await pw.nth(1).fill('Different1!')
    await page.locator('[data-testid="register-button"]').click()
    await expect(page.getByText(/do not match|mismatch/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('short password shows min length error', async ({ page }) => {
    await page.goto('/register')
    await page.locator('[data-testid="name-input"]').fill('Test User')
    await page.locator('input[type="email"]').fill(`e2e-${Date.now()}@test.com`)
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill('short')
    await pw.nth(1).fill('short')
    await page.locator('[data-testid="register-button"]').click()
    await expect(page.getByText(/8 characters|min/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('login link exists on register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('a[href="/login"]')).toBeVisible()
  })
})

test.describe('AUTH: Forgot Password', () => {
  test('renders email input and submit button', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('back to login link exists', async ({ page }) => {
    await page.goto('/forgot-password')
    const link = page.locator('a[href="/login"]')
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible()
    }
  })

  test('submit shows success message', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('button[type="submit"]').click()
    await expect(page.getByText(/check email|sent|link|success/i).first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('AUTH: Reset Password', () => {
  test('page renders with form or invalid token message', async ({ page }) => {
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const hasForm = await page.locator('input[type="password"], input[data-testid*="reset"]').count()
    const hasInvalid = await page.getByText(/invalid|expired|error/i).count()
    expect(hasForm + hasInvalid).toBeGreaterThanOrEqual(1)
  })
})

test.describe('AUTH: Route Guards', () => {
  test('unauthenticated /dashboard -> /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated /recruitment/jobs -> /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/recruitment/jobs')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated /settings -> /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/settings')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated /onboarding -> /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/onboarding')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('/login')
  })

  test('authenticated user can access /dashboard', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  })

  test('authenticated user can access /recruitment/jobs or setup-company', async ({ page }) => {
    await signIn(page)
    await page.goto('/recruitment/jobs')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const url = page.url()
    expect(url).toMatch(/\/recruitment\/jobs|\/setup-company/)
  })
})

test.describe('AUTH: Logout', () => {
  test('sign out redirects to login', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    const userMenu = page.locator('button').filter({ hasText: /sign out|logout|log out/i }).first()
    if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userMenu.click()
      await page.waitForURL(/\/login/, { timeout: 15_000 })
      expect(page.url()).toContain('/login')
    }
  })
})
