import { test } from '@playwright/test';

test('capture therapist dashboard with shared components', async ({ page }) => {
  // Go to login
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  
  // Click the Button component
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ 
    path: '/Users/seanwalsh/code/projects/flynn-app/therapist-dashboard-shared-ui.png',
    fullPage: true 
  });
});
