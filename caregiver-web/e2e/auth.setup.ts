/**
 * Authentication Setup for E2E Tests
 * 
 * This setup runs before all tests to establish mock authentication.
 * It sets up localStorage and mocks API responses.
 */

import { test as setup, expect } from '@playwright/test';
import { mockUser } from './fixtures/test-data';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Go to the app
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');
  
  // Set mock auth token in localStorage
  await page.evaluate(() => {
    localStorage.setItem('clerkToken', 'mock_token_for_testing');
  });
  
  // Save the storage state
  await page.context().storageState({ path: authFile });
});
