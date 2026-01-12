// src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts

import * as d3 from 'd3';
import { startOfMonth, format } from 'date-fns';
import type { VisualizationPlugin, RawDataset } from '@/types/plugin';
import type { FileEvent, FileSummary } from '@/types/domain';

interface HeatmapConfig {
  topN: number;
  showCreations: boolean;
  showDeletions: boolean;
  cellHeight: number;
  minCellWidth: number;
  colorScheme: 'activity' | 'intensity';
}

interface HeatmapCell {
  directory: string;
  month: Date;
  monthKey: string;
  count: number;
  creations: number;
  deletions: number;
  files: Set<string>;
}

interface HeatmapData {
  cells: HeatmapCell[][];
  directories: string[];
  months: Date[];
  maxCount: number;
}

export class TimelineHeatmapPlugin implements VisualizationPlugin<HeatmapConfig, HeatmapData> {
  metadata = {
    id: 'timeline-heatmap',
    name: 'Timeline Heatmap',
    description: 'Repository activity across time and directory structure',
    version: '1.1.0',
    priority: 1,
  };

  defaultConfig: HeatmapConfig = {
    topN: 20,
    showCreations: true,
    showDeletions: true,
    cellHeight: 32,
    minCellWidth: 60,
    colorScheme: 'activity',
  };

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private container: HTMLElement | null = null;
  private scrollContainer: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private tooltipTimeout: number | null = null;
  private currentData: HeatmapData | null = null;

  // Improved color scheme for better readability
  private getActivityColor(value: number, maxValue: number): string {
    if (value === 0 || maxValue === 0) return '#27272a'; // Dark gray for empty
    
    const normalized = Math.min(1, value / maxValue);
    
    // GitHub-style green gradient (all colors stay dark enough for white text)
    if (normalized < 0.2) {
      return '#0e4429'; // Dark green
    } else if (normalized < 0.4) {
      return '#006d32'; // Medium-dark green
    } else if (normalized < 0.6) {
      return '#26a641'; // Medium green
    } else if (normalized < 0.8) {
      return '#39d353'; // Bright green
    } else {
      return '#00ff41'; // Very bright green (still readable with white text)
    }
  }

  init(container: HTMLElement, config: HeatmapConfig): void {
    this.container = container;
    this.container.innerHTML = '';
    this.container.style.overflow = 'hidden';
    this.container.style.position = 'relative';

    // Create scroll container
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.width = '100%';
    this.scrollContainer.style.height = '100%';
    this.scrollContainer.style.overflow = 'auto';
    this.scrollContainer.style.position = 'relative';
    this.container.appendChild(this.scrollContainer);

    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'absolute hidden bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-none z-50 max-w-xs border border-gray-700';
    this.tooltip.style.transition = 'opacity 0.2s';
    document.body.appendChild(this.tooltip);

    // Create SVG without viewBox - use actual dimensions
    this.svg = d3.select(this.scrollContainer)
      .append('svg')
      .style('display', 'block')
      .style('background', '#18181b');
  }

  processData(dataset: RawDataset): HeatmapData {
    const events = dataset.events as FileEvent[];
    
    // Filter valid events and parse dates
    const validEvents = events
      .filter(e => 
        e.file_path && 
        e.commit_datetime && 
        !e.file_path.includes('node_modules') &&
        !e.file_path.startsWith('.')
      )
      .map(e => {
        // Handle both Date objects and string dates
        let dateObj: Date;
        if (e.commit_datetime instanceof Date) {
          dateObj = e.commit_datetime;
        } else {
          dateObj = new Date(e.commit_datetime);
        }
        
        return {
          ...e,
          commit_datetime: dateObj
        };
      })
      .filter(e => !isNaN(e.commit_datetime.getTime())); // Remove invalid dates

    // Extract directories and aggregate by month
    const cellMap = new Map<string, HeatmapCell>();
    
    validEvents.forEach(event => {
      const date = event.commit_datetime;
      const monthStart = startOfMonth(date);
      const monthKey = format(monthStart, 'yyyy-MM');
      
      // Get top-level or second-level directory
      const parts = event.file_path.split('/').filter(p => p);
      const directory = parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0] || 'root';
      
      const key = `${directory}|${monthKey}`;
      
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          directory,
          month: monthStart,
          monthKey,
          count: 0,
          creations: 0,
          deletions: 0,
          files: new Set(),
        });
      }
      
      const cell = cellMap.get(key)!;
      cell.count++;
      cell.files.add(event.file_path);
      
      if (event.status === 'A') cell.creations++;
      if (event.status === 'D') cell.deletions++;
    });

    // Get top N directories by total activity
    const directoryCounts = new Map<string, number>();
    cellMap.forEach(cell => {
      const current = directoryCounts.get(cell.directory) || 0;
      directoryCounts.set(cell.directory, current + cell.count);
    });

    const topDirectories = Array.from(directoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.defaultConfig.topN)
      .map(([dir]) => dir);

    // Get all unique months
    const monthSet = new Set<string>();
    cellMap.forEach(cell => monthSet.add(cell.monthKey));
    const months = Array.from(monthSet)
      .sort()
      .map(key => new Date(`${key}-01`));

    // Build 2D array of cells
    const cells: HeatmapCell[][] = topDirectories.map(directory => {
      return months.map(month => {
        const monthKey = format(month, 'yyyy-MM');
        const key = `${directory}|${monthKey}`;
        return cellMap.get(key) || {
          directory,
          month,
          monthKey,
          count: 0,
          creations: 0,
          deletions: 0,
          files: new Set(),
        };
      });
    });

    // Find max count for color scaling
    const maxCount = Math.max(...Array.from(cellMap.values()).map(c => c.count), 1);

    return {
      cells,
      directories: topDirectories,
      months,
      maxCount,
    };
  }

  render(data: HeatmapData, config: HeatmapConfig): void {
    if (!this.svg || !this.container) return;
    
    this.currentData = data;

    // Fixed dimensions for scrollable timeline
    const margin = { top: 80, right: 40, bottom: 100, left: 220 };
    const cellWidth = config.minCellWidth;  // Fixed cell width
    const cellHeight = config.cellHeight;   // Fixed cell height
    
    // Calculate actual SVG dimensions based on data
    const gridWidth = cellWidth * data.months.length;
    const gridHeight = cellHeight * data.directories.length;
    const svgWidth = margin.left + gridWidth + margin.right;
    const svgHeight = margin.top + gridHeight + margin.bottom;

    // Set SVG to actual dimensions (will be scrollable)
    this.svg
      .attr('width', svgWidth)
      .attr('height', svgHeight);

    // Clear previous content
    this.svg.selectAll('*').remove();

    // Add info text at top
    const info = this.svg.append('g')
      .attr('transform', `translate(${margin.left}, 30)`);
    
    info.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', '#fff')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text('Repository Activity Timeline');
    
    info.append('text')
      .attr('x', 0)
      .attr('y', 25)
      .attr('fill', '#a1a1aa')
      .attr('font-size', '12px')
      .text(`${data.directories.length} directories × ${data.months.length} months • Scroll horizontally to explore timeline`);

    // Create main group
    const g = this.svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Helper function to get contrasting text color
    const getTextColor = (count: number, maxCount: number): string => {
      if (count === 0) return '#71717a'; // Gray for empty cells
      // All activity colors (greens) are dark enough for white text
      return '#ffffff';
    };

    // Draw cells
    const cellGroups = g.selectAll('g.cell-group')
      .data(data.cells)
      .enter()
      .append('g')
      .attr('class', 'cell-group');

    cellGroups.each((rowData, rowIndex, nodes) => {
      const rowGroup = d3.select(nodes[rowIndex]);
      
      rowData.forEach((cell, colIndex) => {
        const cellGroup = rowGroup.append('g')
          .attr('class', 'cell')
          .attr('transform', `translate(${colIndex * cellWidth}, ${rowIndex * cellHeight})`);

        const bgColor = cell.count > 0 ? this.getActivityColor(cell.count, data.maxCount) : '#8aece2';
        const textColor = getTextColor(cell.count, data.maxCount);

        // Draw cell background
        cellGroup.append('rect')
          .attr('width', cellWidth - 2)
          .attr('height', cellHeight - 2)
          .attr('rx', 3)
          .attr('fill', bgColor)
          .attr('stroke', '#18181b')
          .attr('stroke-width', 1)
          .style('cursor', cell.count > 0 ? 'pointer' : 'default')
          .on('mouseenter', (event) => this.showTooltip(event, cell, config))
          .on('mouseleave', () => this.hideTooltip())
          .on('mousemove', (event) => this.updateTooltipPosition(event));

        // Draw creation indicator (green dot) with white stroke for visibility
        if (config.showCreations && cell.creations > 0) {
          const dotSize = Math.min(5, Math.sqrt(cell.creations) + 2);
          cellGroup.append('circle')
            .attr('cx', 8)
            .attr('cy', 8)
            .attr('r', dotSize)
            .attr('fill', '#22c55e')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .style('pointer-events', 'none');
        }

        // Draw deletion indicator (red dot) with white stroke for visibility
        if (config.showDeletions && cell.deletions > 0) {
          const dotSize = Math.min(5, Math.sqrt(cell.deletions) + 2);
          cellGroup.append('circle')
            .attr('cx', cellWidth - 10)
            .attr('cy', 8)
            .attr('r', dotSize)
            .attr('fill', '#ef4444')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .style('pointer-events', 'none');
        }
        
        // Add event count text for active cells with contrasting color
        if (cell.count > 0 && cellWidth >= 50 && cellHeight >= 25) {
          cellGroup.append('text')
            .attr('x', cellWidth / 2)
            .attr('y', cellHeight - 6)
            .attr('text-anchor', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '10px')
            .attr('font-family', 'monospace')
            .attr('font-weight', '600')
            .style('pointer-events', 'none')
            .text(cell.count > 999 ? `${Math.floor(cell.count / 1000)}k` : cell.count);
        }
      });
    });

    // Add Y-axis (directory labels) - FIXED POSITION
    const yAxis = g.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(-15, 0)`);

    data.directories.forEach((dir, i) => {
      const labelGroup = yAxis.append('g')
        .attr('transform', `translate(0, ${i * cellHeight})`);
      
      // Background for label
      labelGroup.append('rect')
        .attr('x', -200)
        .attr('y', 0)
        .attr('width', 195)
        .attr('height', cellHeight - 2)
        .attr('fill', '#27272a')
        .attr('opacity', 0.9);
      
      labelGroup.append('text')
        .attr('x', -10)
        .attr('y', cellHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'black')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace')
        .attr('font-weight', '500')
        .style('cursor', 'default')
        .text(dir.length > 28 ? '...' + dir.slice(-25) : dir)
        .append('title')
        .text(dir);
    });

    // Add X-axis (month labels)
    const xAxis = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${cellHeight * data.directories.length + 15})`);

    data.months.forEach((month, i) => {
      xAxis.append('text')
        .attr('x', i * cellWidth + cellWidth / 2)
        .attr('y', 0)
        .attr('transform', `rotate(-45, ${i * cellWidth + cellWidth / 2}, 0)`)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#a1a1aa')
        .attr('font-size', '11px')
        .attr('font-family', 'sans-serif')
        .text(format(month, 'MMM yyyy'));
    });

    // Add legend
    this.renderLegend(g, gridWidth + 30, 20, data.maxCount, config);
  }

  private renderLegend(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: number,
    y: number,
    maxCount: number,
    config: HeatmapConfig
  ): void {
    const legendWidth = 180;
    const legendHeight = 160;

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${x}, ${y})`);

    // Background
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', '#FF91A4')
      .attr('stroke', '#3f3f46')
      .attr('stroke-width', 1)
      .attr('rx', 6);

    // Title
    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .text('Activity Scale');

    // Gradient samples
    const gradientSteps = 5;
    const stepHeight = 16;
    const startY = 40;
    
    for (let i = 0; i < gradientSteps; i++) {
      const value = (i / (gradientSteps - 1)) * maxCount;
      const color = this.getActivityColor(value, maxCount);
      
      legend.append('rect')
        .attr('x', 15)
        .attr('y', startY + i * stepHeight)
        .attr('width', 28)
        .attr('height', stepHeight - 2)
        .attr('rx', 2)
        .attr('fill', color)
        .attr('stroke', '#18181b');

      legend.append('text')
        .attr('x', 50)
        .attr('y', startY + i * stepHeight + stepHeight / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#e4e4e7')
        .attr('font-size', '11px')
        .text(i === 0 ? '0 events' : `${Math.round(value)} events`);
    }

    // Indicators legend
    const indicatorY = startY + gradientSteps * stepHeight + 15;
    
    if (config.showCreations) {
      legend.append('circle')
        .attr('cx', 25)
        .attr('cy', indicatorY)
        .attr('r', 4)
        .attr('fill', '#22c55e')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);
      
      legend.append('text')
        .attr('x', 35)
        .attr('y', indicatorY)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#e4e4e7')
        .attr('font-size', '11px')
        .text('File creations');
    }

    if (config.showDeletions) {
      legend.append('circle')
        .attr('cx', 25)
        .attr('cy', indicatorY + 20)
        .attr('r', 4)
        .attr('fill', '#ef4444')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);
      
      legend.append('text')
        .attr('x', 35)
        .attr('y', indicatorY + 20)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#e4e4e7')
        .attr('font-size', '11px')
        .text('File deletions');
    }
  }

  private showTooltip(event: MouseEvent, cell: HeatmapCell, config: HeatmapConfig): void {
    if (!this.tooltip) return;

    // Clear any pending hide timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }

    const monthLabel = format(cell.month, 'MMMM yyyy');
    
    let content = `
      <div class="font-bold mb-1">${cell.directory}</div>
      <div class="text-gray-300 mb-2">${monthLabel}</div>
      <div class="space-y-1">
        <div>Total Events: <span class="font-semibold">${cell.count}</span></div>
        <div>Unique Files: <span class="font-semibold">${cell.files.size}</span></div>
    `;

    if (config.showCreations && cell.creations > 0) {
      content += `<div class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
        Creations: <span class="font-semibold">${cell.creations}</span>
      </div>`;
    }

    if (config.showDeletions && cell.deletions > 0) {
      content += `<div class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
        Deletions: <span class="font-semibold">${cell.deletions}</span>
      </div>`;
    }

    content += '</div>';

    this.tooltip.innerHTML = content;
    this.tooltip.classList.remove('hidden');
    this.updateTooltipPosition(event);
  }

  private updateTooltipPosition(event: MouseEvent): void {
    if (!this.tooltip) return;

    const padding = 10;
    const tooltipRect = this.tooltip.getBoundingClientRect();
    
    let left = event.pageX + padding;
    let top = event.pageY + padding;

    // Keep tooltip within viewport
    if (left + tooltipRect.width > window.innerWidth) {
      left = event.pageX - tooltipRect.width - padding;
    }

    if (top + tooltipRect.height > window.innerHeight) {
      top = event.pageY - tooltipRect.height - padding;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private hideTooltip(): void {
    if (!this.tooltip) return;

    // Delay hiding to prevent flicker
    this.tooltipTimeout = window.setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.classList.add('hidden');
      }
    }, 100);
  }

  update(data: HeatmapData, config: HeatmapConfig): void {
    this.render(data, config);
  }

  destroy(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
    if (this.scrollContainer) {
      this.scrollContainer.remove();
      this.scrollContainer = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
    this.currentData = null;
  }

  async exportImage(): Promise<Blob> {
    if (!this.svg) {
      throw new Error('No visualization to export');
    }

    const svgNode = this.svg.node();
    if (!svgNode) {
      throw new Error('SVG node not found');
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgNode);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });

    return blob;
  }

  exportData(): any {
    return {
      plugin: this.metadata.id,
      data: this.currentData,
      exportedAt: new Date().toISOString(),
    };
  }
}