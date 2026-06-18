import { test } from '@playwright/test';

// Dark mode visual smoke — takes screenshots of key routes in dark mode
// Run: npx playwright test e2e/dark-smoke.spec.ts

const HR_ROUTES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/recruitment/candidates', name: 'candidates' },
  { path: '/recruitment/jobs', name: 'jobs' },
  { path: '/recruitment/pipeline', name: 'pipeline' },
  { path: '/documents', name: 'documents' },
  { path: '/reports', name: 'reports' },
  { path: '/settings', name: 'settings' },
  { path: '/onboarding', name: 'onboarding' },
];

test.describe('Dark Mode Visual Smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Login as HR — must click role card first, then fill credentials
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Click HR/Employer card to get to the login form
    await page.locator('text=HR / Employer').click();
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="email-input"]').fill('testlogin99@gmail.com');
    await page.locator('[data-testid="password-input"]').fill('Test123456!');
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForURL((url) => {
      const path = url.pathname;
      return path === '/dashboard' || path === '/setup-company' || path.startsWith('/dashboard');
    }, { timeout: 30000 });

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);
  });

  for (const route of HR_ROUTES) {
    test(`dark mode: ${route.name}`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);

      // Basic dark mode checks
      const body = page.locator('body');
      const bgColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
      console.log(`  bg-color for ${route.name}: ${bgColor}`);

      // Verify no fully transparent text (invisible text check)
      const textElements = page.locator('h1, h2, h3, p, span, td, th, label, button, a');
      const count = await textElements.count();
      let invisibleCount = 0;
      for (let i = 0; i < Math.min(count, 20); i++) {
        const el = textElements.nth(i);
        const color = await el.evaluate((e) => getComputedStyle(e).color);
        const bg = await el.evaluate((e) => getComputedStyle(e).backgroundColor);
        // If text and bg are the same, it's invisible
        if (color === bg && color !== 'rgba(0, 0, 0, 0)') {
          const text = await el.textContent();
          console.log(`  ⚠️ Invisible: "${text?.slice(0, 30)}" color=${color} bg=${bg}`);
          invisibleCount++;
        }
      }
      console.log(`  ${route.name}: ${count} elements checked, ${invisibleCount} invisible`);

      // Screenshot for manual review
      await page.screenshot({ path: `e2e/dark-smoke/${route.name}.png`, fullPage: false });
    });
  }

  test('dark mode: login page', async ({ page }) => {
    // Logout first — just navigate to login page without auth
    // We need to clear auth state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/dark-smoke/login.png', fullPage: false });
  });

  test('dark mode: mobile dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/dark-smoke/dashboard_mobile.png', fullPage: false });
  });
});
