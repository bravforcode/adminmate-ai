import { chromium } from '@playwright/test';

const ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/dashboard',
  '/recruitment/candidates',
  '/recruitment/jobs',
  '/recruitment/pipeline',
  '/documents',
  '/reports',
  '/settings',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Login first
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.fill('[data-testid="email-input"]', 'testlogin99@gmail.com');
  await page.fill('[data-testid="password-input"]', 'Test123456!');
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL((url) => {
    const path = url.pathname;
    return path === '/dashboard' || path === '/setup-company' || path.startsWith('/dashboard');
  }, { timeout: 30000 });

  // Enable dark mode via localStorage
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);

  for (const route of ROUTES) {
    try {
      await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(300);
      const filename = route === '/' ? 'root' : route.replace(/\//g, '_').replace(/^_/, '');
      await page.screenshot({ path: `e2e/dark-smoke/${filename}.png`, fullPage: false });
      console.log(`✅ ${route}`);
    } catch (e: any) {
      console.log(`⚠️ ${route}: ${e.message?.slice(0, 100)}`);
    }
  }

  // Also test mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'e2e/dark-smoke/dashboard_mobile.png', fullPage: false });
  console.log('✅ dashboard (mobile)');

  await browser.close();
  console.log('\nDone — screenshots in e2e/dark-smoke/');
})();
