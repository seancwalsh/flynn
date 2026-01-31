import { test } from '@playwright/test';

test('capture therapist-web screenshots', async ({ page }) => {
  // Login page
  await page.goto('http://localhost:3002');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/therapist-login.png', fullPage: true });
  
  // Click login button to see dashboard
  await page.locator('button').filter({ hasText: 'Sign In' }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/therapist-dashboard.png', fullPage: true });
});

test('capture caregiver-web screenshots', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/caregiver-home.png', fullPage: true });
});
