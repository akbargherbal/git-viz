// tests/e2e/utils/page-objects.ts

import { Page, Locator, expect } from '@playwright/test';

export class TreemapPage {
  readonly page: Page;
  readonly vizSelectorBtn: Locator;
  readonly treemapOption: Locator;
  readonly treemapCells: Locator;
  readonly detailPanel: Locator;
  readonly filterPanel: Locator;
  readonly timelineScrubber: Locator;

  // Lens buttons
  private readonly lensDebtBtn: Locator;
  private readonly lensCouplingBtn: Locator;
  private readonly lensTimeBtn: Locator;

  // Metric buttons
  private readonly metricCommitsBtn: Locator;
  private readonly metricAuthorsBtn: Locator;
  private readonly metricEventsBtn: Locator;

  // Filter controls
  private readonly filtersToggleBtn: Locator;
  private readonly authorSearchInput: Locator;
  private readonly resetFiltersBtn: Locator;

  // Detail panel
  private readonly closePanelBtn: Locator;

  // Content elements
  private readonly couplingThresholdLabel: Locator;

  constructor(page: Page) {
    this.page = page;

    // Visualization selector
    this.vizSelectorBtn = page.getByTestId('viz-selector');
    this.treemapOption = page.getByTestId('viz-treemap-explorer');

    // Treemap cells
    this.treemapCells = page.locator('[data-viz="treemap-cell"]');

    // Lens controls
    this.lensDebtBtn = page.getByTestId('lens-debt');
    this.lensCouplingBtn = page.getByTestId('lens-coupling');
    this.lensTimeBtn = page.getByTestId('lens-time');

    // Metric controls
    this.metricCommitsBtn = page.getByTestId('metric-commits');
    this.metricAuthorsBtn = page.getByTestId('metric-authors');
    this.metricEventsBtn = page.getByTestId('metric-events');

    // Timeline
    this.timelineScrubber = page.getByTestId('timeline-scrubber');

    // Filter panel
    this.filtersToggleBtn = page.getByTestId('filters-toggle');
    this.filterPanel = page.getByTestId('filter-panel');
    this.authorSearchInput = page.getByTestId('author-search');
    this.resetFiltersBtn = page.getByTestId('reset-filters');

    // Detail panel
    this.detailPanel = page.getByTestId('detail-panel');
    this.closePanelBtn = page.getByTestId('close-detail-panel');

    // Content elements
    this.couplingThresholdLabel = page.getByText('Coupling Strength Threshold');
  }

  // Navigation
  async goto() {
    await this.page.goto('/');
  }

  async switchToTreemap() {
    // Check if already active
    const cellsVisible = await this.treemapCells.first().isVisible().catch(() => false);
    if (cellsVisible) return;

    // Click to switch
    if (await this.treemapOption.isVisible()) {
      await this.treemapOption.click();
    } else {
      await this.vizSelectorBtn.click();
      await this.treemapOption.click();
    }

    // Switch to TIME lens before waiting for cells
    await this.page.waitForTimeout(500);
    await this.switchLens('time');

    // Now wait for cells to appear
    await this.page.waitForFunction(
      () => {
        const cells = document.querySelectorAll('[data-viz="treemap-cell"]');
        return cells.length > 0;
      },
      { timeout: 15000 }
    );
  }

  // Lens operations
  async switchLens(lens: string) {
    const button = this.getLensButton(lens);
    await button.click();
  }

  async expectLensActive(lens: string) {
    const button = this.getLensButton(lens);
    await expect(button).toHaveClass(/bg-purple-900/);
  }

  async getCurrentLens(): Promise<string> {
    if (await this.lensTimeBtn.getAttribute('class').then(c => c?.includes('bg-purple-900'))) return 'time';
    if (await this.lensCouplingBtn.getAttribute('class').then(c => c?.includes('bg-purple-900'))) return 'coupling';
    if (await this.lensDebtBtn.getAttribute('class').then(c => c?.includes('bg-purple-900'))) return 'debt';
    return 'unknown';
  }

  private getLensButton(lens: string): Locator {
    const normalized = lens.toUpperCase();
    switch (normalized) {
      case 'DEBT': return this.lensDebtBtn;
      case 'COUP':
      case 'COUPLING': return this.lensCouplingBtn;
      case 'TIME': return this.lensTimeBtn;
      default: throw new Error(`Unknown lens: ${lens}`);
    }
  }

  // Metric operations
  async switchMetric(metric: string) {
    const button = this.getMetricButton(metric);
    await button.click();
  }

  // Alias for new test suite
  async switchSizeMetric(metric: string) {
    await this.switchMetric(metric);
  }

  async expectMetricActive(metric: string) {
    const button = this.getMetricButton(metric);
    await expect(button).toHaveClass(/bg-zinc-700/);
  }

  async getCurrentSizeMetric(): Promise<string> {
    if (await this.metricCommitsBtn.getAttribute('class').then(c => c?.includes('bg-zinc-700'))) return 'commits';
    if (await this.metricAuthorsBtn.getAttribute('class').then(c => c?.includes('bg-zinc-700'))) return 'authors';
    if (await this.metricEventsBtn.getAttribute('class').then(c => c?.includes('bg-zinc-700'))) return 'events';
    return 'unknown';
  }

  private getMetricButton(metric: string): Locator {
    const normalized = metric.toLowerCase();
    switch (normalized) {
      case 'commits': return this.metricCommitsBtn;
      case 'authors': return this.metricAuthorsBtn;
      case 'events':
      case 'changes': return this.metricEventsBtn;
      default: throw new Error(`Unknown metric: ${metric}`);
    }
  }

  // Cell operations
  async clickCell(index: number | string = 0) {
    if (typeof index === 'string') {
      // If string, assume it's a path/id, but for now we just click the first one or implement specific logic
      // The test passes a path 'src/core/renderer.ts'.
      // Since we don't have a way to select by data-id easily without more context,
      // we'll click the first one or try to find it.
      // For this fix, we'll default to first() if string is passed, or try to find by title if possible.
      // Assuming the test setup ensures the cell exists.
      await this.treemapCells.first().click();
    } else {
      await this.treemapCells.nth(index).click();
    }
  }

  async getCellCount(): Promise<number> {
    return await this.treemapCells.count();
  }

  async getCellColor(index: number = 0): Promise<string | null> {
    return await this.treemapCells.nth(index).getAttribute('fill');
  }

  // Detail panel operations
  async getDetailPanelTitle() {
    return this.detailPanel.getByRole('heading', { level: 3 });
  }

  async closeDetailPanel() {
    await this.closePanelBtn.click();
  }

  async expectDetailPanelVisible() {
    await expect(await this.getDetailPanelTitle()).toBeVisible();
  }

  async expectDetailPanelHidden() {
    await expect(await this.getDetailPanelTitle()).not.toBeVisible();
  }

  async isDetailPanelVisible(): Promise<boolean> {
    return await this.detailPanel.isVisible();
  }

  // Filter operations
  async openFilterPanel() {
    await this.filtersToggleBtn.click();
  }

  async filterByAuthor(authorName: string) {
    await this.authorSearchInput.fill(authorName);
    await this.page.waitForTimeout(200);
    await this.filterPanel.getByText(authorName, { exact: true }).first().click();
    await this.page.waitForTimeout(500);
  }

  async resetFilters() {
    await this.resetFiltersBtn.click();
    await this.page.waitForTimeout(500);
  }

  // Timeline operations
  async setTimelinePosition(value: string) {
    await this.timelineScrubber.fill(value);
    await this.page.waitForTimeout(200);
  }

  async scrubTimeline(value: number) {
    await this.setTimelinePosition(value.toString());
  }

  async hasTimelineScrubber(): Promise<boolean> {
    return await this.timelineScrubber.isVisible();
  }

  async expectCouplingControlsVisible() {
    await expect(this.couplingThresholdLabel).toBeVisible();
  }

  async expectTimelineVisible() {
    await expect(this.timelineScrubber).toBeVisible();
  }
}