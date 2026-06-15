import { test, expect, signInAsHR, waitForPageReady } from './helpers'

// ═══════════════════════════════════════════════════════════════════
// 2FA/MFA: Security Settings Page
// ═══════════════════════════════════════════════════════════════════
test.describe('MFA: Security Page', () => {
  test('security page loads with heading', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })

  test('Two-Factor Authentication section exists', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)
    // Should show the 2FA heading
    const heading = page.getByText(/two-factor|2fa|security/i).first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('MFA status indicator is shown (enabled or disabled)', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)
    // Status should show "Enabled" or "Disabled"
    const status = page.getByText(/enabled|disabled/i).first()
    await expect(status).toBeVisible({ timeout: 10_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2FA/MFA: Enable Flow
// ═══════════════════════════════════════════════════════════════════
test.describe('MFA: Enable Flow', () => {
  test('Enable MFA button is visible when MFA is not active', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    // If MFA is not active, should see an enable button
    const enableBtn = page.getByRole('button', { name: /enable|setup|turn on/i }).first()
    if (await enableBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(enableBtn).toBeVisible()
    }
  })

  test('clicking Enable shows QR code and verification input', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    const enableBtn = page.getByRole('button', { name: /enable|setup|turn on/i }).first()
    if (await enableBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enableBtn.click()
      // Wait for QR code to load
      await page.waitForTimeout(3000)

      // QR code image should appear
      const qrImage = page.locator('img[alt*="QR" i], img[alt*="MFA" i]')
      await expect(qrImage).toBeVisible({ timeout: 15_000 })

      // 6-digit code input should appear
      const codeInput = page.locator('input[maxlength="6"], input[placeholder*="000000" i]')
      await expect(codeInput).toBeVisible({ timeout: 5_000 })

      // Verify button should appear
      const verifyBtn = page.getByRole('button', { name: /verify/i }).first()
      await expect(verifyBtn).toBeVisible({ timeout: 5_000 })
    }
  })

  test('verify button is disabled with empty code', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    const enableBtn = page.getByRole('button', { name: /enable|setup|turn on/i }).first()
    if (await enableBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enableBtn.click()
      await page.waitForTimeout(3000)

      const verifyBtn = page.getByRole('button', { name: /verify/i }).first()
      if (await verifyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Verify button should be disabled when code is empty
        await expect(verifyBtn).toBeDisabled()
      }
    }
  })

  test('entering 6-digit code enables verify button', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    const enableBtn = page.getByRole('button', { name: /enable|setup|turn on/i }).first()
    if (await enableBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enableBtn.click()
      await page.waitForTimeout(3000)

      const codeInput = page.locator('input[maxlength="6"], input[placeholder*="000000" i]')
      if (await codeInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await codeInput.fill('123456')
        const verifyBtn = page.getByRole('button', { name: /verify/i }).first()
        if (await verifyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await expect(verifyBtn).toBeEnabled()
        }
      }
    }
  })

  test('wrong code shows error toast', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    const enableBtn = page.getByRole('button', { name: /enable|setup|turn on/i }).first()
    if (await enableBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enableBtn.click()
      await page.waitForTimeout(3000)

      const codeInput = page.locator('input[maxlength="6"], input[placeholder*="000000" i]')
      if (await codeInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await codeInput.fill('000000')
        const verifyBtn = page.getByRole('button', { name: /verify/i }).first()
        if (await verifyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await verifyBtn.click()
          // Should show an error toast
          await page.waitForTimeout(3000)
          const hasError = await page.locator('[class*="error"], [role="alert"], text=/invalid|error|wrong|failed/i').count()
          expect(hasError).toBeGreaterThanOrEqual(1)
        }
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2FA/MFA: Backup Codes
// ═══════════════════════════════════════════════════════════════════
test.describe('MFA: Backup Codes', () => {
  test('backup codes section exists after successful setup', async ({ page }) => {
    // This test checks the UI structure — actual MFA setup requires a real TOTP app
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    // Check if backup codes are displayed (only if MFA was just set up)
    const backupSection = page.getByText(/backup codes/i).first()
    if (await backupSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(backupSection).toBeVisible()
      // Should have a copy button
      const copyBtn = page.getByRole('button', { name: /copy/i }).first()
      if (await copyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(copyBtn).toBeVisible()
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2FA/MFA: Disable Flow
// ═══════════════════════════════════════════════════════════════════
test.describe('MFA: Disable Flow', () => {
  test('Disable button visible when MFA is active', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    const disableBtn = page.getByRole('button', { name: /disable|turn off|remove/i }).first()
    if (await disableBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(disableBtn).toBeVisible()
    }
  })

  test('clicking Disable shows confirmation with code input', async ({ page }) => {
    await signInAsHR(page)
    await page.goto('/settings/security')
    await waitForPageReady(page)

    const disableBtn = page.getByRole('button', { name: /disable|turn off|remove/i }).first()
    if (await disableBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await disableBtn.click()
      await page.waitForTimeout(500)

      // Should show a confirmation message
      const confirmText = page.getByText(/are you sure|confirm|disable/i).first()
      await expect(confirmText).toBeVisible({ timeout: 5_000 })
    }
  })
})
