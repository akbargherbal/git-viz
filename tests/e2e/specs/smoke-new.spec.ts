import { test, expect } from '@playwright/test';
import { mockDatasetAPI } from '../utils/mock-api';

test.describe('Smoke Test (New Approach)', () => {
  test('should load app with minimal dataset', async ({ page }) => {
    // 1. Enable Console Logging to debug the "White Screen"
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[BROWSER UNCAUGHT ERROR] ${err.message}`);
    });

    // Generate test data inline
    const testData = {
      files: [
        {
          path: 'src/test.ts',
          author: 'test@example.com',
          commits: 5,
        }
      ]
    };

    // Mock the API
    await mockDatasetAPI(page, testData);

    // Navigate
    await page.goto('/');

    // Wait a moment for potential async errors to appear
    await page.waitForTimeout(1000);

    // Check for error display
    const errorDisplay = page.locator('.text-red-400.font-bold.text-lg');
    if (await errorDisplay.isVisible()) {
      const errorMessage = await page.locator('.text-red-200.text-sm').textContent();
      throw new Error(`App displayed error: ${errorMessage}`);
    }

    // Verify basic UI loaded
    await expect(page.getByTestId('viz-selector')).toBeVisible({ timeout: 5000 });
  });
});
