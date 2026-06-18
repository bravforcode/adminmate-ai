import { test as setup, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import { HR_USER } from './helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const authFile = path.join(__dirname, '../playwright/.auth/hr.json')

setup('authenticate as HR', async ({ page }) => {
  // Navigate to login
  await page.goto('/login')

  // Click HR role card to reveal login form
  const hrCard = page.locator('#role-card-hr')
  await hrCard.waitFor({ state: 'visible', timeout: 15_000 })
  await hrCard.click()

  // Fill credentials
  await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
  await page.locator('[data-testid="email-input"]').fill(HR_USER.email)
  await page.locator('[data-testid="password-input"]').fill(HR_USER.password)
  await page.locator('[data-testid="login-button"]').click()

  // Wait for stable post-login state (dashboard or setup-company)
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

  // If redirected to setup-company, complete it
  if (page.url().includes('setup-company')) {
    const nameInput = page.locator('[data-testid="company-name"]')
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 })
    await nameInput.fill('E2E Test Company')
    const industrySelect = page.locator('select').first()
    await industrySelect.selectOption('Technology')
    const submitBtn = page.locator('[data-testid="setup-company"]')
    await submitBtn.click()
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  }

  // Verify we're authenticated — user menu should be visible
  await expect(page.locator('[data-testid="user-menu-button"]')).toBeVisible({ timeout: 15_000 })

  // Save storage state
  await page.context().storageState({ path: authFile })
})
