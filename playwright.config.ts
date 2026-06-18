import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
    // HR specs: pre-authenticated via storageState (depends on setup)
    {
      name: 'chromium-hr',
      testIgnore: [
        /01-auth\.spec\.ts$/,
        /17-mfa-2fa\.spec\.ts$/,
        /security\.spec\.ts$/,
        /dark-smoke\.spec\.ts$/,
        /auth\.setup\.ts$/,
      ],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'playwright/.auth/hr.json'),
      },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
