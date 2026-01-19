// tests/e2e/specs/treemap-explorer.spec.ts
import { test, expect } from '@playwright/test';
import { TreemapPage } from '../utils/page-objects';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load fixture data
const loadFixture = (filename: string) => {
  const filePath = path.join(__dirname, '../fixtures/datasets', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filename}. Run 'pnpm e2e:fixtures' first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

test.describe('Treemap Explorer Critical Paths', () => {
  let treemap: TreemapPage;

  test.beforeEach(async ({ page }) => {
    // Debugging
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    page.on('requestfailed', req => console.log(`REQ FAILED: ${req.url()} - ${req.failure()?.errorText}`));

    // Intercept all JSON requests
    await page.route('**/*.json', async (route) => {
      const url = route.request().url();
      
      if (url.includes('manifest.json')) {
         await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                repository: "mock-repo",
                datasets: {
                    file_metadata: { file: "metadata/file_index.json", production_ready: true },
                    temporal_daily: { file: "aggregations/temporal_daily.json", production_ready: true },
                    temporal_monthly: { file: "aggregations/temporal_monthly.json", production_ready: true },
                    cochange_network: { file: "networks/cochange_network.json", production_ready: true },
                    author_network: { file: "networks/author_network.json", production_ready: true }
                }
            })
         });
         return;
      }

      let fixtureName = '';
      if (url.includes('file_index.json')) fixtureName = 'file_index.json';
      else if (url.includes('temporal_daily.json')) fixtureName = 'temporal_daily.json';
      else if (url.includes('temporal_monthly.json')) fixtureName = 'temporal_monthly.json';
      else if (url.includes('cochange_network.json')) fixtureName = 'cochange_network.json';
      else if (url.includes('author_network.json')) fixtureName = 'author_network.json';

      if (fixtureName) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(loadFixture(fixtureName))
        });
      } else {
        await route.continue();
      }
    });

    treemap = new TreemapPage(page);
    await treemap.goto();
    await treemap.switchToTreemap();
  });

  test('should load treemap and display cells', async () => {
    const count = await treemap.getCellCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should switch lenses (Debt -> Coupling -> Time)', async () => {
    // Debt lens is active by default
    await treemap.expectLensActive('DEBT');

    // Switch to Coupling and verify
    await treemap.switchLens('COUP');
    await treemap.expectLensActive('COUP');
    await treemap.expectCouplingControlsVisible();

    // Switch to Time and verify
    await treemap.switchLens('TIME');
    await treemap.expectLensActive('TIME');
    await treemap.expectTimelineVisible();
  });

  test('should switch size metrics', async () => {
    await treemap.switchMetric('Authors');
    await treemap.expectMetricActive('Authors');

    await treemap.switchMetric('Events');
    await treemap.expectMetricActive('Events');
  });

  test('should view cell details', async () => {
    await treemap.clickCell(0);
    await treemap.expectDetailPanelVisible();

    await treemap.closeDetailPanel();
    await treemap.expectDetailPanelHidden();
  });

  test('should filter by author', async () => {
    const initialCount = await treemap.getCellCount();

    await treemap.openFilterPanel();
    await treemap.filterByAuthor('excalidraw');

    const filteredCount = await treemap.getCellCount();
    expect(filteredCount).toBeLessThan(initialCount);

    await treemap.resetFilters();
    const resetCount = await treemap.getCellCount();
    expect(resetCount).toBe(initialCount);
  });

  test('should scrub timeline in Time lens', async () => {
    await treemap.switchLens('TIME');

    const initialColor = await treemap.getCellColor(0);
    await treemap.setTimelinePosition('50');
    const newColor = await treemap.getCellColor(0);

    expect(newColor).not.toBe(initialColor);
  });
});