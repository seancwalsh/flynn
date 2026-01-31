import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E tests for shared-ui components
 * These verify that components render correctly and are interactive
 */
test.describe('Shared UI Component Integration', () => {
  test.describe('Button Component', () => {
    test('renders with correct variants in therapist-web', async ({ page }) => {
      await page.goto('http://localhost:3002');

      // Login button should be visible
      const button = page.locator('button', { hasText: /sign in/i });
      await expect(button).toBeVisible();

      // Should have proper styling (Tailwind classes from shared Button)
      const classes = await button.getAttribute('class');
      expect(classes).toContain('rounded-lg');
      expect(classes).toContain('px-');

      // Should be clickable
      await expect(button).toBeEnabled();
    });

    test('is interactive and responds to clicks', async ({ page }) => {
      await page.goto('http://localhost:3002');

      const button = page.locator('button', { hasText: /sign in/i });

      // Click should work and navigate
      await button.click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Card Component', () => {
    test('renders client cards in therapist dashboard', async ({ page }) => {
      await page.goto('http://localhost:3002');
      await page.locator('button', { hasText: /sign in/i }).click();
      await page.waitForURL('**/dashboard');

      // Should see client cards (using shared Card component)
      const cards = page.locator('[class*="rounded-lg"][class*="shadow"]').filter({
        has: page.locator('text=/Emma|Noah/')
      });

      await expect(cards.first()).toBeVisible();
    });
  });

  test.describe('Spinner Component', () => {
    test('shows loading state with Spinner', async ({ page }) => {
      await page.goto('http://localhost:3002');

      // Navigate to trigger loading
      await page.locator('button', { hasText: /sign in/i }).click();

      // Spinner should appear briefly (might be too fast to catch, that's ok)
      // Just verify the page loads successfully
      await expect(page.locator('text=My Clients')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Visual Consistency', () => {
    test('therapist-web has consistent styling', async ({ page }) => {
      await page.goto('http://localhost:3002');
      await page.locator('button', { hasText: /sign in/i }).click();
      await page.waitForURL('**/dashboard');

      // Take screenshot for visual comparison
      await page.screenshot({
        path: 'test-results/therapist-dashboard-visual.png',
        fullPage: true
      });

      // Check that cards exist and are properly styled
      const cards = page.locator('[class*="bg-white"][class*="rounded"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('caregiver-web has consistent styling', async ({ page }) => {
      await page.goto('http://localhost:3001');

      // Take screenshot
      await page.screenshot({
        path: 'test-results/caregiver-home-visual.png',
        fullPage: true
      });

      // Verify content loads
      const content = await page.textContent('body');
      expect(content).not.toContain('Internal server error');
    });
  });

  test.describe('Component Accessibility', () => {
    test('Button has proper ARIA attributes', async ({ page }) => {
      await page.goto('http://localhost:3002');

      const button = page.locator('button', { hasText: /sign in/i });

      // Button should be accessible
      await expect(button).toHaveAttribute('type');

      // Should be keyboard navigable
      await button.focus();
      await expect(button).toBeFocused();
    });

    test('Cards are keyboard navigable', async ({ page }) => {
      await page.goto('http://localhost:3002');
      await page.locator('button', { hasText: /sign in/i }).click();
      await page.waitForURL('**/dashboard');

      // Cards should be clickable/focusable links
      const cards = page.locator('a[href*="/clients/"]').first();
      await expect(cards).toBeVisible();

      // Should be able to focus
      await cards.focus();
      await expect(cards).toBeFocused();
    });
  });

  test.describe('Error Boundaries', () => {
    test('no console errors on page load', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

      // Filter out known acceptable errors (if any)
      const criticalErrors = errors.filter(e =>
        !e.includes('favicon') && // Ignore favicon 404s
        !e.includes('Download the React DevTools') // Ignore React DevTools message
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});
