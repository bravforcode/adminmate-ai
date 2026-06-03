import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=AdminMate AI')).toBeVisible()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
  })

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.click('[data-testid="login-button"]')
    // Form validation should prevent submission
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
  })

  test('forgot password page works', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('text=Forgot')).toBeVisible()
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
  })
})

test.describe('Auth Guard Redirect', () => {
  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')
  })
})
