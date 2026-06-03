import { test, expect } from '@playwright/test'

test.describe('Recruitment Pages', () => {
  test('404 page shown for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-route')
    await expect(page.locator('text=404')).toBeVisible()
    await expect(page.locator('text=Page Not Found')).toBeVisible()
  })
})
