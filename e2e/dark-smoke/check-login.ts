import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Go to login page
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check page content
  const title = await page.title();
  console.log('Title:', title);

  const bodyHTML = await page.evaluate(() => document.body.innerHTML.slice(0, 2000));
  console.log('Body HTML (first 2000 chars):', bodyHTML);

  // Check for email input
  const emailInput = await page.locator('[data-testid="email-input"]').count();
  console.log('Email input count:', emailInput);

  const allInputs = await page.locator('input').count();
  console.log('Total inputs:', allInputs);

  // Check for any errors in console
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.screenshot({ path: 'e2e/dark-smoke/login-check.png', fullPage: true });
  console.log('Screenshot saved');

  if (errors.length) {
    console.log('Console errors:', errors);
  }

  await browser.close();
})();
