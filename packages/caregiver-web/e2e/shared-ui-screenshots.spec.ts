import { test } from '@playwright/test';

test.describe('Shared UI Screenshots', () => {
  test('capture therapist-web login', async ({ page }) => {
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: '/Users/seanwalsh/code/projects/flynn-app/therapist-login-shared-ui.png',
      fullPage: true 
    });
  });

  test('capture caregiver-web home', async ({ page }) => {
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: '/Users/seanwalsh/code/projects/flynn-app/caregiver-home-shared-ui.png',
      fullPage: true 
    });
  });
});
