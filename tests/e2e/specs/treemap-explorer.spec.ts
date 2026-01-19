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
      // console.log(`INTERCEPT: ${url}`); // Uncomment for verbose logs

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
    
    // Wait for loading to finish (if any)
    // await expect(page.getByTestId('loading-spinner')).not.toBeVisible(); 
    
    await treemap.switchToTreemap();
  });

  test('should load treemap and display cells', async () => {
    const count = await treemap.treemapCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should switch lenses (Debt -> Coupling -> Time)', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'DEBT' })).toHaveClass(/bg-purple-900/);

    await treemap.switchLens('COUP');
    await expect(page.getByRole('button', { name: 'COUP' })).toHaveClass(/bg-purple-900/);
    await expect(page.getByText('Coupling Strength Threshold')).toBeVisible();

    await treemap.switchLens('TIME');
    await expect(page.getByRole('button', { name: 'TIME' })).toHaveClass(/bg-purple-900/);
    await expect(treemap.timelineScrubber).toBeVisible();
  });

  test('should switch size metrics', async ({ page }) => {
    await treemap.switchMetric('Authors');
    await expect(page.getByRole('button', { name: 'Authors' })).toHaveClass(/bg-zinc-700/);
    
    await treemap.switchMetric('Events');
    await expect(page.getByRole('button', { name: 'Events' })).toHaveClass(/bg-zinc-700/);
  });

  test('should view cell details', async () => {
    await treemap.clickCell(0);
    await expect(await treemap.getDetailPanelTitle()).toBeVisible();
    
    await treemap.closeDetailPanel();
    await expect(await treemap.getDetailPanelTitle()).not.toBeVisible();
  });

  test('should filter by author', async () => {
    const initialCount = await treemap.treemapCells.count();
    
    await treemap.openFilterPanel();
    await treemap.filterByAuthor('excalidraw'); 
    
    const filteredCount = await treemap.treemapCells.count();
    expect(filteredCount).toBeLessThan(initialCount);
    
    await treemap.resetFilters();
    const resetCount = await treemap.treemapCells.count();
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
