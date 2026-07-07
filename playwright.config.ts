import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 2 : 1,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    // Setup: authenticate once, save storageState
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
    },
    // Auth specs: real login/logout, MFA, security, dark-smoke (no storageState)
    {
      name: 'chromium-auth',
      testMatch: [
        /01-auth\.spec\.ts$/,
        /17-mfa-2fa\.spec\.ts$/,
        /security\.spec\.ts$/,
        /dark-smoke\.spec\.ts$/,
      ],
      use: { browserName: 'chromium' },
    },
    // HR specs: use fresh storageState from setup project.
    // Setup runs first and generates playwright/.auth/hr.json with a valid session.
    // Each spec still clears stale localStorage via ensureHRAuthenticated as a safety net.
    {
      name: 'chromium-hr',
      dependencies: ['setup'],
      testIgnore: [
        /01-auth\.spec\.ts$/,
        /17-mfa-2fa\.spec\.ts$/,
        /security\.spec\.ts$/,
        /dark-smoke\.spec\.ts$/,
        /auth\.setup\.ts$/,
      ],
      use: {
        browserName: 'chromium',
        storageState: 'playwright/.auth/hr.json',
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
