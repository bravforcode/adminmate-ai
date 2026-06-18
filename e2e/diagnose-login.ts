import { chromium } from '@playwright/test'

const HR_USER = { email: 'testlogin99@gmail.com', password: 'Test123456!' }

async function diagnose() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Capture console logs
  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`))

  // Capture network
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('supabase') || url.includes('auth')) {
      console.log(`[NET ${response.status()}] ${url.substring(0, 120)}`)
    }
  })

  console.log('\n=== Step 1: Go to /login ===')
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
  console.log('URL:', page.url())

  console.log('\n=== Step 2: Click HR role card ===')
  const hrCard = page.locator('#role-card-hr')
  await hrCard.waitFor({ state: 'visible', timeout: 10_000 })
  await hrCard.click()
  await page.waitForTimeout(1000)
  console.log('URL after role click:', page.url())

  console.log('\n=== Step 3: Fill login form ===')
  await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10_000 })
  await page.locator('[data-testid="email-input"]').fill(HR_USER.email)
  await page.locator('[data-testid="password-input"]').fill(HR_USER.password)
  console.log('Form filled')

  console.log('\n=== Step 4: Click Sign In ===')
  await page.locator('[data-testid="login-button"]').click()
  console.log('Button clicked, waiting 5s...')
  await page.waitForTimeout(5000)
  console.log('URL after 5s:', page.url())

  console.log('\n=== Step 5: Wait 10 more seconds ===')
  await page.waitForTimeout(10_000)
  console.log('URL after 15s:', page.url())

  // Check if there's a toast error
  const toasts = await page.locator('[role="status"], [data-sonner-toaster]').allTextContents()
  console.log('Toasts:', toasts)

  // Check for loading spinner
  const loading = await page.locator('[data-testid="auth-guard-loading"]').count()
  console.log('Auth guard loading visible:', loading > 0)

  // Take screenshot
  await page.screenshot({ path: 'test-results/diagnose-login.png', fullPage: true })
  console.log('\nScreenshot saved to test-results/diagnose-login.png')

  await browser.close()
}

diagnose().catch(console.error)
