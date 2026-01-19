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
    this.treemapOption = page.getByTestId('viz-treemap-explorer'); // Updated to match plugin ID

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

    // Content elements (can still use text/role for non-interactive content)
    this.couplingThresholdLabel = page.getByText('Coupling Strength Threshold');
  }

  // Navigation
  async goto() {
    await this.page.goto('/');
  }

  async switchToTreemap() {
    // Check if already active (by checking if cells are visible)
    if (await this.treemapCells.first().isVisible()) return;
    
    // Or check if selector shows it
    if (await this.treemapOption.isVisible()) {
        await this.treemapOption.click();
    } else {
        await this.vizSelectorBtn.click();
        await this.treemapOption.click();
    }
    await expect(this.treemapCells.first()).toBeVisible();
  }

  // Lens operations with built-in assertions
  async switchLens(lens: 'DEBT' | 'COUP' | 'TIME') {
    const button = this.getLensButton(lens);
    await button.click();
  }

  async expectLensActive(lens: 'DEBT' | 'COUP' | 'TIME') {
    const button = this.getLensButton(lens);
    await expect(button).toHaveClass(/bg-purple-900/);
  }

  async expectCouplingControlsVisible() {
    await expect(this.couplingThresholdLabel).toBeVisible();
  }

  async expectTimelineVisible() {
    await expect(this.timelineScrubber).toBeVisible();
  }

  private getLensButton(lens: 'DEBT' | 'COUP' | 'TIME'): Locator {
    switch (lens) {
      case 'DEBT': return this.lensDebtBtn;
      case 'COUP': return this.lensCouplingBtn;
      case 'TIME': return this.lensTimeBtn;
    }
  }

  // Metric operations with built-in assertions
  async switchMetric(metric: 'Commits' | 'Authors' | 'Events') {
    const button = this.getMetricButton(metric);
    await button.click();
  }

  async expectMetricActive(metric: 'Commits' | 'Authors' | 'Events') {
    const button = this.getMetricButton(metric);
    await expect(button).toHaveClass(/bg-zinc-700/);
  }

  private getMetricButton(metric: 'Commits' | 'Authors' | 'Events'): Locator {
    switch (metric) {
      case 'Commits': return this.metricCommitsBtn;
      case 'Authors': return this.metricAuthorsBtn;
      case 'Events': return this.metricEventsBtn;
    }
  }

  // Cell operations
  async clickCell(index: number = 0) {
    await this.treemapCells.nth(index).click();
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

  // Filter operations
  async openFilterPanel() {
    await this.filtersToggleBtn.click();
  }

  async filterByAuthor(authorName: string) {
    await this.authorSearchInput.fill(authorName);
    // Wait for list to update?
    await this.page.waitForTimeout(200); 
    // We need to click the author in the list. 
    // Since we don't have test IDs for individual author items (dynamic), we use text.
    // But we should scope it to the filter panel.
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
}