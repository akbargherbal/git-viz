// tests/e2e/specs/treemap-explorer-new.spec.ts
import { test, expect } from '@playwright/test';
import { TreemapPage } from '../utils/page-objects';
import { mockDatasetAPI } from '../utils/mock-api';
import { createActiveFile } from '../utils/factories';

test.describe('Treemap Explorer Critical Paths (New)', () => {
  let treemap: TreemapPage;

  test.beforeEach(async ({ page }) => {
    // Debugging - capture ALL console messages including errors
    page.on('console', msg => {
      const type = msg.type();
      console.log(`BROWSER [${type}]: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.log(`BROWSER ERROR: ${error.message}`);
    });

    // Generate specific test data
    const testData = {
      files: [
        createActiveFile({
          path: 'src/core/renderer.ts',
          author: 'excalidraw',
          commits: 50,
          additions: 500,
          deletions: 50
        }),
        createActiveFile({
          path: 'src/utils/math.ts',
          author: 'alice@test.com',
          commits: 30,
          additions: 200,
          deletions: 30
        }),
        createActiveFile({
          path: 'src/components/App.tsx',
          author: 'bob@test.com',
          commits: 20,
          additions: 150,
          deletions: 10
        })
      ]
    };

    // Add debugging to see what data we're mocking
    console.log('TEST DATA FILES:', JSON.stringify(testData.files, null, 2));

    // Mock the API
    await mockDatasetAPI(page, testData);

    // Navigate
    await page.goto('/');
    treemap = new TreemapPage(page);

    // Wait for app to be ready
    await page.waitForSelector('[data-testid="viz-selector"]', { timeout: 10000 });

    // Switch to treemap (now starts in TIME lens automatically)
    await treemap.switchToTreemap();
  });

  test('should load treemap and display cells', async ({ page }) => {
    // Verify cells are visible
    const cellCount = await treemap.getCellCount();
    console.log(`CELL COUNT: ${cellCount}`);

    expect(cellCount).toBe(3);
  });

  test('should switch lenses (Time -> Coupling -> Time)', async ({ page }) => {
    // We start in TIME lens now
    expect(await treemap.getCurrentLens()).toBe('time');

    await treemap.switchLens('coupling');
    await page.waitForTimeout(500);
    expect(await treemap.getCurrentLens()).toBe('coupling');

    await treemap.switchLens('time');
    await page.waitForTimeout(500);
    expect(await treemap.getCurrentLens()).toBe('time');
  });

  test('should switch size metrics', async ({ page }) => {
    const initialMetric = await treemap.getCurrentSizeMetric();
    console.log(`Initial metric: ${initialMetric}`);

    await treemap.switchSizeMetric('commits');
    await page.waitForTimeout(500);
    expect(await treemap.getCurrentSizeMetric()).toBe('commits');

    // CHANGED: 'changes' -> 'events' to match UI
    await treemap.switchSizeMetric('events');
    await page.waitForTimeout(500);
    expect(await treemap.getCurrentSizeMetric()).toBe('events');
  });

  test('should view cell details', async ({ page }) => {
    await treemap.clickCell('src/core/renderer.ts');
    await page.waitForTimeout(500);

    const isVisible = await treemap.isDetailPanelVisible();
    expect(isVisible).toBe(true);
  });

  test('should filter by author', async ({ page }) => {
    const initialCount = await treemap.getCellCount();

    await treemap.filterByAuthor('excalidraw');
    await page.waitForTimeout(500);

    const filteredCount = await treemap.getCellCount();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('should scrub timeline in Time lens', async ({ page }) => {
    // Already in TIME lens from beforeEach
    const hasTimeline = await treemap.hasTimelineScrubber();
    expect(hasTimeline).toBe(true);

    await treemap.scrubTimeline(50);
    await page.waitForTimeout(500);

    const cellCount = await treemap.getCellCount();
    expect(cellCount).toBeGreaterThan(0);
  });
});