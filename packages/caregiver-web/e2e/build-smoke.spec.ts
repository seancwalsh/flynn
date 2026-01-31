import { test, expect } from '@playwright/test';

/**
 * Smoke tests - these should run FIRST to catch build/CSS errors
 * before any other tests run
 */
test.describe('Build & CSS Smoke Tests', () => {
  test('therapist-web loads without Vite errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate and wait for page to load
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

    // Check for Vite overlay error (the big red error screen)
    const viteError = page.locator('[data-vite-error]');
    await expect(viteError).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // If error overlay exists, fail with details
      throw new Error('Vite error overlay detected on therapist-web');
    });

    // Check no console errors about CSS/PostCSS
    const cssErrors = errors.filter(e =>
      e.includes('postcss') ||
      e.includes('tailwind') ||
      e.includes('does not exist')
    );

    expect(cssErrors).toHaveLength(0);
  });

  test('caregiver-web loads without Vite errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    const viteError = page.locator('[data-vite-error]');
    await expect(viteError).not.toBeVisible({ timeout: 2000 }).catch(() => {
      throw new Error('Vite error overlay detected on caregiver-web');
    });

    const cssErrors = errors.filter(e =>
      e.includes('postcss') ||
      e.includes('tailwind') ||
      e.includes('does not exist')
    );

    expect(cssErrors).toHaveLength(0);
  });

  test('therapist-web renders shared Button component', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Should see EITHER the login button OR the dashboard (if already logged in)
    const loginButton = page.locator('button', { hasText: /sign in/i });
    const dashboardHeading = page.locator('h1', { hasText: /my clients/i });

    // One of these should be visible
    const hasLogin = await loginButton.isVisible().catch(() => false);
    const hasDashboard = await dashboardHeading.isVisible().catch(() => false);

    expect(hasLogin || hasDashboard).toBe(true);
  });

  test('caregiver-web renders shared components', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Check that page renders content (not just a blank screen)
    const content = page.locator('body');
    const text = await content.textContent();

    // Should have some actual content, not error text
    expect(text).not.toContain('Internal server error');
    expect(text).not.toContain('[postcss]');
  });
});
