// src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts

import { format } from 'date-fns';
import type { VisualizationPlugin, RawDataset } from '@/types/plugin';
import type { FileEvent, TimeBinType, MetricType } from '@/types/domain';
import { getTimeBinStart, formatTimeBin } from '@/utils/dateHelpers';

interface HeatmapConfig {
  topN: number;
  showCreations: boolean;
  showDeletions: boolean;
  cellHeight: number;
  minCellWidth: number;
  colorScheme: 'activity' | 'intensity';
  timeBin: TimeBinType; // ✅ Added
  metric: MetricType;    // ✅ Added
  onCellClick?: (cell: HeatmapCellWithEvents) => void;
}

interface HeatmapCell {
  directory: string;
  timeBin: Date;
  timeBinKey: string;
  count: number;
  creations: number;
  deletions: number;
  modifications: number;
  files: Set<string>;
  uniqueAuthors: Set<string>;
  events: FileEvent[];
}

interface HeatmapCellWithEvents extends HeatmapCell {
  timeBin: string;
  value: number;
}

interface HeatmapData {
  cells: HeatmapCell[][];
  directories: string[];
  timeBins: Date[];
  maxCount: number;
  maxAuthors: number; // ✅ Added for author metric
}

export class TimelineHeatmapPlugin implements VisualizationPlugin<HeatmapConfig, HeatmapData> {
  metadata = {
    id: 'timeline-heatmap',
    name: 'Timeline Heatmap',
    description: 'Repository activity across time and directory structure',
    version: '2.1.0',
    priority: 1,
  };

  defaultConfig: HeatmapConfig = {
    topN: 20,
    showCreations: true,
    showDeletions: true,
    cellHeight: 25,
    minCellWidth: 80,
    colorScheme: 'activity',
    timeBin: 'week',
    metric: 'events',
  };

  private table: HTMLTableElement | null = null;
  private container: HTMLElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private tooltipTimeout: number | null = null;
  private currentData: HeatmapData | null = null;
  private currentConfig: HeatmapConfig | null = null;

  // ✅ Helper function to get metric value from cell
  private getValueForMetric(cell: HeatmapCell, metric: MetricType): number {
    switch (metric) {
      case 'commits':
        // Count unique commit hashes
        return new Set(cell.events.map(e => e.commit_hash)).size;
      case 'events':
        return cell.count;
      case 'authors':
        return cell.uniqueAuthors.size;
      case 'lines':
        // For now, use event count as proxy (could be enhanced with actual line data)
        return cell.count;
      default:
        return cell.count;
    }
  }

  // Improved color scheme for better readability
  private getActivityColor(value: number, maxValue: number): string {
    if (value === 0 || maxValue === 0) return '#27272a'; // Dark gray for empty
    
    const normalized = Math.min(1, value / maxValue);
    
    // GitHub-style green gradient
    if (normalized < 0.2) {
      return '#0e4429'; // Dark green
    } else if (normalized < 0.4) {
      return '#006d32'; // Medium-dark green
    } else if (normalized < 0.6) {
      return '#26a641'; // Medium green
    } else if (normalized < 0.8) {
      return '#39d353'; // Bright green
    } else {
      return '#00ff41'; // Very bright green
    }
  }

  init(container: HTMLElement, config: HeatmapConfig): void {
    this.container = container;
    this.container.innerHTML = '';
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    this.container.style.background = '#18181b';
    this.currentConfig = config;

    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'absolute hidden bg-zinc-900/95 backdrop-blur text-white text-xs rounded-lg shadow-2xl p-3 pointer-events-none z-50 max-w-xs border border-zinc-700';
    this.tooltip.style.transition = 'opacity 0.2s';
    document.body.appendChild(this.tooltip);
  }

  processData(dataset: RawDataset, config?: HeatmapConfig): HeatmapData {
    const events = dataset.events as FileEvent[];
    
    // ✅ Use config or default
    const timeBinType = config?.timeBin || this.defaultConfig.timeBin;
    const topN = config?.topN || this.defaultConfig.topN;
    
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
      .filter(e => !isNaN(e.commit_datetime.getTime()));

    // ✅ Extract directories and aggregate by DYNAMIC time bin
    const cellMap = new Map<string, HeatmapCell>();
    
    validEvents.forEach(event => {
      const date = event.commit_datetime;
      const binStart = getTimeBinStart(date, timeBinType); // ✅ Dynamic
      const binKey = binStart.toISOString(); // ✅ Dynamic key
      
      // Get top-level or second-level directory
      const parts = event.file_path.split('/').filter(p => p);
      const directory = parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0] || 'root';
      
      const key = `${directory}|${binKey}`;
      
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          directory,
          timeBin: binStart,
          timeBinKey: binKey,
          count: 0,
          creations: 0,
          deletions: 0,
          modifications: 0,
          files: new Set(),
          uniqueAuthors: new Set(),
          events: [],
        });
      }
      
      const cell = cellMap.get(key)!;
      cell.count++;
      cell.files.add(event.file_path);
      cell.uniqueAuthors.add(event.author_name);
      cell.events.push(event);
      
      if (event.status === 'A' || event.status === 'added') cell.creations++;
      if (event.status === 'D' || event.status === 'deleted') cell.deletions++;
      if (event.status === 'M' || event.status === 'modified') cell.modifications++;
    });

    // Get top N directories by total activity
    const directoryCounts = new Map<string, number>();
    cellMap.forEach(cell => {
      const current = directoryCounts.get(cell.directory) || 0;
      directoryCounts.set(cell.directory, current + cell.count);
    });

    const topDirectories = Array.from(directoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([dir]) => dir);

    // ✅ Get all unique time bins (sorted)
    const binSet = new Set<string>();
    cellMap.forEach(cell => binSet.add(cell.timeBinKey));
    const timeBins = Array.from(binSet)
      .sort()
      .map(key => new Date(key));

    // Build 2D array of cells
    const cells: HeatmapCell[][] = topDirectories.map(directory => {
      return timeBins.map(bin => {
        const binKey = bin.toISOString();
        const key = `${directory}|${binKey}`;
        return cellMap.get(key) || {
          directory,
          timeBin: bin,
          timeBinKey: binKey,
          count: 0,
          creations: 0,
          deletions: 0,
          modifications: 0,
          files: new Set(),
          uniqueAuthors: new Set(),
          events: [],
        };
      });
    });

    // ✅ Find max values for different metrics
    const maxCount = Math.max(...Array.from(cellMap.values()).map(c => c.count), 1);
    const maxAuthors = Math.max(...Array.from(cellMap.values()).map(c => c.uniqueAuthors.size), 1);

    return {
      cells,
      directories: topDirectories,
      timeBins,
      maxCount,
      maxAuthors,
    };
  }

  render(data: HeatmapData, config: HeatmapConfig): void {
    if (!this.container) return;
    
    this.currentData = data;
    this.currentConfig = config;

    // Clear previous content
    this.container.innerHTML = '';

    // Create table
    this.table = document.createElement('table');
    this.table.style.borderCollapse = 'separate';
    this.table.style.borderSpacing = '2px';
    this.table.style.width = 'fit-content';
    this.table.style.minWidth = '100%';

    // Create thead with sticky headers
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Empty corner cell
    const cornerTh = document.createElement('th');
    cornerTh.style.position = 'sticky';
    cornerTh.style.left = '0';
    cornerTh.style.top = '0';
    cornerTh.style.zIndex = '30';
    cornerTh.style.background = '#27272a';
    cornerTh.style.minWidth = '200px';
    cornerTh.style.width = '200px';
    cornerTh.style.padding = '12px';
    cornerTh.style.borderBottom = '2px solid #18181b';
    cornerTh.style.color = '#a1a1aa';
    cornerTh.style.fontSize = '11px';
    cornerTh.style.fontWeight = 'bold';
    cornerTh.style.textAlign = 'left';
    cornerTh.textContent = 'Directory';
    headerRow.appendChild(cornerTh);

    // ✅ Dynamic time bin headers
    data.timeBins.forEach((bin) => {
      const th = document.createElement('th');
      th.style.position = 'sticky';
      th.style.top = '0';
      th.style.zIndex = '20';
      th.style.background = '#27272a';
      th.style.minWidth = `${config.minCellWidth}px`;
      th.style.width = `${config.minCellWidth}px`;
      th.style.padding = '8px';
      th.style.color = '#a1a1aa';
      th.style.fontSize = '11px';
      th.style.fontFamily = 'sans-serif';
      th.style.textAlign = 'center';
      th.style.verticalAlign = 'bottom';
      th.style.borderBottom = '2px solid #18181b';
      th.style.whiteSpace = 'nowrap';
      th.style.overflow = 'hidden';
      th.style.textOverflow = 'ellipsis';
      
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.textContent = formatTimeBin(bin, config.timeBin); // ✅ Dynamic formatting
      th.appendChild(span);
      
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    this.table.appendChild(thead);

    // ✅ Determine max value based on metric
    const maxValue = config.metric === 'authors' ? data.maxAuthors : data.maxCount;

    // Create tbody with data rows
    const tbody = document.createElement('tbody');
    
    data.directories.forEach((directory, rowIndex) => {
      const row = document.createElement('tr');
      
      // Directory label (sticky)
      const dirTh = document.createElement('th');
      dirTh.style.position = 'sticky';
      dirTh.style.left = '0';
      dirTh.style.zIndex = '10';
      dirTh.style.background = '#27272a';
      dirTh.style.minWidth = '200px';
      dirTh.style.width = '200px';
      dirTh.style.padding = '8px 12px';
      dirTh.style.color = '#fff';
      dirTh.style.fontSize = '11px';
      dirTh.style.fontFamily = 'monospace';
      dirTh.style.fontWeight = '500';
      dirTh.style.textAlign = 'left';
      dirTh.style.whiteSpace = 'nowrap';
      dirTh.style.overflow = 'hidden';
      dirTh.style.textOverflow = 'ellipsis';
      dirTh.style.borderRight = '2px solid #18181b';
      dirTh.title = directory;
      dirTh.textContent = directory.length > 28 ? '...' + directory.slice(-25) : directory;
      row.appendChild(dirTh);

      // Data cells
      data.cells[rowIndex].forEach((cell, colIndex) => {
        const td = document.createElement('td');
        
        // ✅ Get value based on selected metric
        const cellValue = this.getValueForMetric(cell, config.metric);
        const bgColor = cellValue > 0 ? this.getActivityColor(cellValue, maxValue) : '#27272a';
        const textColor = cellValue > 0 ? '#ffffff' : '#71717a';
        
        td.style.background = bgColor;
        td.style.minWidth = `${config.minCellWidth}px`;
        td.style.width = `${config.minCellWidth}px`;
        td.style.height = `${config.cellHeight}px`;
        td.style.padding = '4px';
        td.style.position = 'relative';
        td.style.cursor = cellValue > 0 ? 'pointer' : 'default';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';
        td.style.transition = 'transform 0.1s, box-shadow 0.1s';

        // Cell content container
        const cellContent = document.createElement('div');
        cellContent.style.position = 'relative';
        cellContent.style.width = '100%';
        cellContent.style.height = '100%';
        cellContent.style.display = 'flex';
        cellContent.style.alignItems = 'center';
        cellContent.style.justifyContent = 'center';

        // ✅ Display metric value
        if (cellValue > 0) {
          const countSpan = document.createElement('span');
          countSpan.style.color = textColor;
          countSpan.style.fontSize = '10px';
          countSpan.style.fontFamily = 'monospace';
          countSpan.style.fontWeight = '600';
          countSpan.textContent = cellValue > 999 ? `${Math.floor(cellValue / 1000)}k` : cellValue.toString();
          cellContent.appendChild(countSpan);
        }

        // Creation indicator (green dot)
        if (config.showCreations && cell.creations > 0) {
          const dotSize = Math.min(5, Math.sqrt(cell.creations) + 2);
          const creationDot = document.createElement('div');
          creationDot.style.position = 'absolute';
          creationDot.style.top = '4px';
          creationDot.style.left = '4px';
          creationDot.style.width = `${dotSize * 2}px`;
          creationDot.style.height = `${dotSize * 2}px`;
          creationDot.style.borderRadius = '50%';
          creationDot.style.background = '#22c55e';
          creationDot.style.border = '1.5px solid #ffffff';
          creationDot.style.pointerEvents = 'none';
          cellContent.appendChild(creationDot);
        }

        // Deletion indicator (red dot)
        if (config.showDeletions && cell.deletions > 0) {
          const dotSize = Math.min(5, Math.sqrt(cell.deletions) + 2);
          const deletionDot = document.createElement('div');
          deletionDot.style.position = 'absolute';
          deletionDot.style.top = '4px';
          deletionDot.style.right = '4px';
          deletionDot.style.width = `${dotSize * 2}px`;
          deletionDot.style.height = `${dotSize * 2}px`;
          deletionDot.style.borderRadius = '50%';
          deletionDot.style.background = '#ef4444';
          deletionDot.style.border = '1.5px solid #ffffff';
          deletionDot.style.pointerEvents = 'none';
          cellContent.appendChild(deletionDot);
        }

        td.appendChild(cellContent);

        // Event handlers
        if (cellValue > 0) {
          td.addEventListener('mouseenter', (e) => this.showTooltip(e, cell, config));
          td.addEventListener('mouseleave', () => this.hideTooltip());
          td.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));
          td.addEventListener('mouseenter', () => {
            td.style.transform = 'scale(1.05)';
            td.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
            td.style.zIndex = '5';
          });
          td.addEventListener('mouseleave', () => {
            td.style.transform = 'scale(1)';
            td.style.boxShadow = 'none';
            td.style.zIndex = 'auto';
          });
          
          // Click handler for detail panel
          td.addEventListener('click', () => {
            if (config.onCellClick) {
              const cellWithEvents: HeatmapCellWithEvents = {
                ...cell,
                timeBin: formatTimeBin(cell.timeBin, config.timeBin),
                value: cellValue,
              };
              config.onCellClick(cellWithEvents);
            }
          });
        }

        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    this.table.appendChild(tbody);
    this.container.appendChild(this.table);
  }

  private showTooltip(event: MouseEvent, cell: HeatmapCell, config: HeatmapConfig): void {
    if (!this.tooltip) return;

    // Clear any pending hide timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }

    // ✅ Get metric-specific value
    const metricValue = this.getValueForMetric(cell, config.metric);
    const metricLabel = config.metric.charAt(0).toUpperCase() + config.metric.slice(1);

    let content = `
      <div class="space-y-1">
        <div class="font-bold text-sm text-purple-400">${cell.directory}</div>
        <div class="text-zinc-400 text-[10px]">${formatTimeBin(cell.timeBin, config.timeBin)}</div>
        <div class="border-t border-zinc-700 pt-1 mt-1"></div>
        <div><span class="text-zinc-500">${metricLabel}:</span> <span class="font-semibold">${metricValue}</span></div>
        <div><span class="text-zinc-500">Total Events:</span> <span class="font-semibold">${cell.count}</span></div>
        <div><span class="text-zinc-500">Unique Files:</span> <span class="font-semibold">${cell.files.size}</span></div>
        <div><span class="text-zinc-500">Contributors:</span> <span class="font-semibold">${cell.uniqueAuthors.size}</span></div>
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

    if (cell.modifications > 0) {
      content += `<div class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
        Modifications: <span class="font-semibold">${cell.modifications}</span>
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
    if (this.table) {
      this.table.remove();
      this.table = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
    this.currentData = null;
    this.currentConfig = null;
  }

  async exportImage(): Promise<Blob> {
    if (!this.table) {
      throw new Error('No visualization to export');
    }

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <text x="400" y="300" text-anchor="middle" fill="white">Export feature for HTML table coming soon...</text>
    </svg>`;
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