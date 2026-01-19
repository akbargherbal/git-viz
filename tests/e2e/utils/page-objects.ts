import { Page, Locator, expect } from '@playwright/test';

export class TreemapPage {
  readonly page: Page;
  readonly vizSelectorBtn: Locator;
  readonly treemapOption: Locator;
  readonly treemapCells: Locator;
  readonly detailPanel: Locator;
  readonly filterPanel: Locator;
  readonly timelineScrubber: Locator;

  constructor(page: Page) {
    this.page = page;
    this.vizSelectorBtn = page.getByRole('button', { name: 'Select Visualization' });
    this.treemapOption = page.getByRole('button', { name: 'Treemap Explorer' });
    this.treemapCells = page.locator('svg g rect');
    this.detailPanel = page.locator('aside'); // Generic selector, refined in methods
    this.filterPanel = page.locator('aside').filter({ hasText: 'Filters & Options' });
    this.timelineScrubber = page.getByRole('slider', { name: 'Timeline position' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async switchToTreemap() {
    // Only switch if not already selected (handling default state)
    if (await this.treemapOption.isVisible()) return;
    
    await this.vizSelectorBtn.click();
    await this.treemapOption.click();
    // Wait for render
    await expect(this.treemapCells.first()).toBeVisible();
  }

  async switchLens(lens: 'DEBT' | 'COUP' | 'TIME') {
    await this.page.getByRole('button', { name: lens, exact: true }).click();
  }

  async switchMetric(metric: 'Commits' | 'Authors' | 'Events') {
    await this.page.getByRole('button', { name: metric, exact: true }).click();
  }

  async clickCell(index: number = 0) {
    await this.treemapCells.nth(index).click();
  }

  async getDetailPanelTitle() {
    // Assuming the panel has a heading level 3
    return this.detailPanel.getByRole('heading', { level: 3 });
  }

  async closeDetailPanel() {
    await this.detailPanel.getByRole('button', { name: 'Close panel' }).click();
  }

  async openFilterPanel() {
    await this.page.getByRole('button', { name: 'Filters' }).click();
  }

  async filterByAuthor(authorName: string) {
    await this.filterPanel.getByPlaceholder('Search authors...').fill(authorName);
    await this.filterPanel.getByText(authorName, { exact: true }).first().click();
    // Wait for debounce/render
    await this.page.waitForTimeout(500);
  }

  async resetFilters() {
    await this.filterPanel.getByRole('button', { name: 'Reset All Filters' }).click();
    await this.page.waitForTimeout(500);
  }

  async setTimelinePosition(value: string) {
    await this.timelineScrubber.fill(value);
    await this.page.waitForTimeout(200); // Wait for render
  }

  async getCellColor(index: number = 0) {
    return await this.treemapCells.nth(index).getAttribute('fill');
  }
}