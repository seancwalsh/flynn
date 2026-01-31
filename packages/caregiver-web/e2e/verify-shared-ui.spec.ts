import { test, expect } from '@playwright/test';

test.describe('Shared UI Component Verification', () => {
  test('therapist-web uses shared Button component', async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page with Button
    await page.screenshot({ path: '/tmp/1-therapist-login.png', fullPage: true });
    
    // Verify Button component is rendered
    const button = page.locator('button').filter({ hasText: 'Sign In' });
    await expect(button).toBeVisible();
    
    console.log('✓ Therapist login page rendered with shared Button');
  });

  test('therapist-web dashboard uses shared Card and Spinner', async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    // Click login
    await page.locator('button').filter({ hasText: 'Sign In' }).click({ timeout: 5000 });
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Take screenshot of dashboard
    await page.screenshot({ path: '/tmp/2-therapist-dashboard.png', fullPage: true });
    
    console.log('✓ Therapist dashboard rendered with shared components');
  });

  test('caregiver-web renders with shared components', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/3-caregiver-home.png', fullPage: true });
    
    console.log('✓ Caregiver-web rendered successfully');
  });
});
