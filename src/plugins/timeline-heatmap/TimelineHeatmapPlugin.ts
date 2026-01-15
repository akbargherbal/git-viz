// src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts

import React from "react";
import type { 
  VisualizationPlugin, 
  OptimizedDataset, 
  PluginControlProps 
} from "@/types/plugin";
import type {
  TimeBinType,
  MetricType,
  OptimizedDirectoryNode,
} from "@/types/domain";
import { getTimeBinStart, formatTimeBin } from "@/utils/dateHelpers";
import { formatNumber } from "@/utils/formatting";
import { DataProcessor } from "@/services/data/DataProcessor";
import { MetricSelector } from "@/components/common/MetricSelector";
import { TimeBinSelector } from "@/components/common/TimeBinSelector";
import { FilterPanel } from "@/components/common/FilterPanel";

// ============================================================================
// PHASE 2: Plugin State Interface
// ============================================================================

/**
 * State shape for Timeline Heatmap Plugin
 * Manages all plugin-specific configuration and filtering
 */
export interface TimelineHeatmapState extends Record<string, unknown> {
  /** Selected metric for visualization */
  metric: MetricType;
  
  /** Time bin granularity */
  timeBin: TimeBinType;
  
  /** Selected authors for filtering (email addresses) */
  selectedAuthors: string[];
  
  /** Selected file extensions for filtering */
  selectedExtensions: string[];
}

// ============================================================================
// Config and Data Types
// ============================================================================

interface HeatmapConfig {
  topN: number;
  showCreations: boolean;
  showDeletions: boolean;
  cellHeight: number;
  minCellWidth: number;
  colorScheme: "activity" | "intensity";
  timeBin: TimeBinType;
  metric: MetricType;
  onCellClick?: (cell: any) => void;
}

export interface HeatmapCell {
  directory: string;
  timeBin: Date;
  events: number;
  commits: number;
  authors: number;
  creations: number;
  deletions: number;
  modifications: number;
  value: number;
  topContributors: string[];
  topFiles: string[];
}

interface HeatmapData {
  cells: HeatmapCell[][];
  directories: string[];
  timeBins: Date[];
  maxValue: number;
}

function getContrastingTextColor(
  hue: number,
  saturation: number,
  lightness: number,
): string {
  const luminance = lightness / 100;
  let threshold = 0.5;
  if (saturation > 50) {
    if (hue >= 60 && hue <= 180) threshold = 0.6;
    else if (hue >= 30 && hue < 60) threshold = 0.55;
  }
  return luminance > threshold ? "#000000" : "#ffffff";
}

// ============================================================================
// Timeline Heatmap Plugin Implementation
// ============================================================================

export class TimelineHeatmapPlugin implements VisualizationPlugin<
  HeatmapConfig,
  HeatmapData,
  Record<string, unknown>
> {
  metadata = {
    id: "timeline-heatmap",
    name: "Timeline Heatmap",
    description: "Repository activity across time and directory structure",
    version: "4.0.0", // Bumped for Phase 2 migration
    priority: 1,
    dataRequirements: [
      { dataset: "file_lifecycle", required: true, alias: "lifecycle" },
      { dataset: "author_network", required: true, alias: "authors" },
      { dataset: "file_index", required: true, alias: "files" },
      { dataset: "directory_stats", required: true, alias: "dirs" },
    ],
  };

  defaultConfig: HeatmapConfig = {
    topN: 20,
    showCreations: true,
    showDeletions: true,
    cellHeight: 30,
    minCellWidth: 60,
    colorScheme: "activity",
    timeBin: "week",
    metric: "events",
  };

  private container: HTMLElement | null = null;

  // ============================================================================
  // PHASE 2: Initial State Definition
  // ============================================================================

  /**
   * Returns initial state for the plugin
   * Called when plugin is first activated or when state needs to be reset
   */
  getInitialState = (): Record<string, unknown> => ({
    metric: 'events' as MetricType,
    timeBin: 'week' as TimeBinType,
    selectedAuthors: [] as string[],
    selectedExtensions: [] as string[],
  });

  // ============================================================================
  // PHASE 2: Control Rendering
  // ============================================================================

  /**
   * Renders plugin-specific controls
   * This gives the plugin full ownership of its UI controls
   */
  renderControls = (props: PluginControlProps<Record<string, unknown>>) => {
    const { state, updateState, data } = props;
    
    // Cast state to our specific type (safe because we control the initial state)
    const typedState = state as unknown as TimelineHeatmapState;
    
    // Extract available authors and extensions from metadata
    const authors = data?.metadata?.authors || [];
    const fileTypes = data?.metadata?.file_types || [];
    
    return React.createElement(
      'div',
      { className: 'flex gap-4 items-center flex-wrap' },
      
      // Metric Selector
      React.createElement(MetricSelector, {
        value: typedState.metric,
        onChange: (metric: MetricType) => updateState({ metric }),
      }),
      
      // Time Bin Selector
      React.createElement(TimeBinSelector, {
        value: typedState.timeBin,
        onChange: (timeBin: TimeBinType) => updateState({ timeBin }),
      }),
      
      // Filter Panel (Authors & File Types)
      React.createElement(FilterPanel, {
        authors: authors.map((a: any) => ({
          value: a.email,
          label: a.name || a.email,
          count: a.commit_count,
        })),
        extensions: fileTypes.map((ft: any) => ({
          extension: ft.extension,
          count: ft.count,
        })),
        selectedAuthors: typedState.selectedAuthors,
        selectedExtensions: typedState.selectedExtensions,
        onAuthorsChange: (authors: string[]) => 
          updateState({ selectedAuthors: authors }),
        onExtensionsChange: (extensions: string[]) => 
          updateState({ selectedExtensions: extensions }),
      }),
    );
  };

  // ============================================================================
  // PHASE 2: Layout Configuration
  // ============================================================================

  layoutConfig = {
    controlsPosition: 'header' as const,
  };

  // ============================================================================
  // Core Plugin Lifecycle Methods
  // ============================================================================

  init(container: HTMLElement, _config: HeatmapConfig): void {
    this.container = container;
    this.container.innerHTML = "";
    this.container.style.overflow = "auto";
    this.container.style.background = "#09090b";
  }

  processData(dataset: any, config?: HeatmapConfig): HeatmapData {
    let optimizedData: OptimizedDataset;

    // Check if we received the raw data map from PluginDataLoader
    // The keys match the 'alias' fields in dataRequirements
    if (dataset.lifecycle && dataset.authors && dataset.files && dataset.dirs) {
      // Process raw data on the fly using the extracted processor
      optimizedData = DataProcessor.processRawData(
        dataset.lifecycle,
        dataset.authors,
        dataset.files,
        dataset.dirs
      );
    } else {
      // Fallback: Assume legacy OptimizedDataset
      optimizedData = dataset as OptimizedDataset;
    }

    const { tree, activity, metadata } = optimizedData;
    const timeBinType = config?.timeBin || this.defaultConfig.timeBin;
    const metric = config?.metric || this.defaultConfig.metric;
    const topN = config?.topN || this.defaultConfig.topN;

    // 1. Map IDs to Directory Paths
    const idToPath = new Map<number, string>();
    const traverse = (node: OptimizedDirectoryNode) => {
      if (node.type === "directory") {
        idToPath.set(node.id, node.path);
        node.children?.forEach(traverse);
      }
    };
    traverse(tree);

    // 2. Determine Top Directories
    let topDirectories: string[] = [];

    if (metadata.directory_stats && metadata.directory_stats.length > 0) {
      topDirectories = metadata.directory_stats
        .sort((a, b) => b.activity_score - a.activity_score)
        .slice(0, topN)
        .map((d) => d.path);
    } else {
      const dirActivity = new Map<string, number>();
      activity.forEach((item) => {
        const path = idToPath.get(item.id);
        if (path) {
          const totalEvents = item.a + item.m + item.del;
          dirActivity.set(path, (dirActivity.get(path) || 0) + totalEvents);
        }
      });
      topDirectories = Array.from(dirActivity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([dir]) => dir);
    }

    // 3. Aggregate Activity for Selected Directories
    interface TempCell extends Omit<
      HeatmapCell,
      "topContributors" | "topFiles"
    > {
      contributorsSet: Set<string>;
      filesSet: Set<string>;
    }

    const cellMap = new Map<string, TempCell>();
    const timeBinsSet = new Set<number>();
    const topDirsSet = new Set(topDirectories);

    activity.forEach((item) => {
      const path = idToPath.get(item.id);
      if (!path || !topDirsSet.has(path)) return;

      const date = new Date(item.d);
      const binStart = getTimeBinStart(date, timeBinType);
      const binKey = binStart.getTime();
      timeBinsSet.add(binKey);

      const key = `${path}|${binKey}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          directory: path,
          timeBin: binStart,
          events: 0,
          commits: 0,
          authors: 0,
          creations: 0,
          deletions: 0,
          modifications: 0,
          value: 0,
          contributorsSet: new Set(),
          filesSet: new Set(),
        });
      }

      const cell = cellMap.get(key)!;
      cell.events += item.a + item.m + item.del;
      cell.commits += item.c;
      cell.creations += item.a;
      cell.deletions += item.del;
      cell.modifications += item.m;
      cell.authors = Math.max(cell.authors, item.au);

      if (item.tc) item.tc.forEach((c) => cell.contributorsSet.add(c));
      if (item.tf) item.tf.forEach((f) => cell.filesSet.add(f));
    });

    // 4. Sort Time Bins
    const timeBins = Array.from(timeBinsSet)
      .sort()
      .map((t) => new Date(t));

    // 5. Build Grid
    let maxValue = 0;

    const cells = topDirectories.map((dir) => {
      return timeBins.map((bin) => {
        const key = `${dir}|${bin.getTime()}`;
        const tempCell = cellMap.get(key);

        const cell: HeatmapCell = {
          directory: dir,
          timeBin: bin,
          events: tempCell ? tempCell.events : 0,
          commits: tempCell ? tempCell.commits : 0,
          authors: tempCell ? tempCell.authors : 0,
          creations: tempCell ? tempCell.creations : 0,
          deletions: tempCell ? tempCell.deletions : 0,
          modifications: tempCell ? tempCell.modifications : 0,
          value: 0,
          topContributors: tempCell
            ? Array.from(tempCell.contributorsSet)
            : [],
          topFiles: tempCell ? Array.from(tempCell.filesSet) : [],
        };

        // Assign value based on metric
        if (metric === "commits") cell.value = cell.commits;
        else if (metric === "events") cell.value = cell.events;
        else if (metric === "authors") cell.value = cell.authors;
        else cell.value = cell.events;

        maxValue = Math.max(maxValue, cell.value);
        return cell;
      });
    });

    return {
      cells,
      directories: topDirectories,
      timeBins,
      maxValue,
    };
  }

  render(data: HeatmapData, config: HeatmapConfig): void {
    if (!this.container) return;

    const { cells, directories, timeBins, maxValue } = data;
    const { cellHeight, minCellWidth, colorScheme, onCellClick } = config;

    // Clear container
    this.container.innerHTML = "";

    // Calculate dimensions
    const cellWidth = Math.max(minCellWidth, 80);
    const labelWidth = 220;
    const totalWidth = labelWidth + timeBins.length * cellWidth;
    const totalHeight = directories.length * cellHeight;

    // Create SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", totalWidth.toString());
    svg.setAttribute("height", totalHeight.toString());
    svg.style.display = "block";
    svg.style.fontFamily = "ui-monospace, monospace";

    // Directory labels (Y-axis)
    directories.forEach((dir, i) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", (labelWidth - 10).toString());
      text.setAttribute("y", (i * cellHeight + cellHeight / 2).toString());
      text.setAttribute("text-anchor", "end");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "#a1a1aa");
      text.setAttribute("font-size", "12");
      text.style.cursor = "default";
      text.textContent = dir.split("/").pop() || dir;

      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title"
      );
      title.textContent = dir;
      text.appendChild(title);

      g.appendChild(text);
      svg.appendChild(g);
    });

    // Time labels (X-axis) - only show every nth based on width
    const labelInterval = Math.ceil(timeBins.length / 12);
    timeBins.forEach((bin, i) => {
      if (i % labelInterval === 0 || i === timeBins.length - 1) {
        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.setAttribute("x", (labelWidth + i * cellWidth + cellWidth / 2).toString());
        text.setAttribute("y", "-5");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#a1a1aa");
        text.setAttribute("font-size", "10");
        text.textContent = formatTimeBin(bin, config.timeBin);
        svg.appendChild(text);
      }
    });

    // Render cells
    cells.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        const x = labelWidth + colIdx * cellWidth;
        const y = rowIdx * cellHeight;

        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        rect.setAttribute("x", x.toString());
        rect.setAttribute("y", y.toString());
        rect.setAttribute("width", (cellWidth - 1).toString());
        rect.setAttribute("height", (cellHeight - 1).toString());

        // Color calculation
        if (cell.value === 0) {
          rect.setAttribute("fill", "#18181b");
          rect.setAttribute("stroke", "#27272a");
        } else {
          const intensity = maxValue > 0 ? cell.value / maxValue : 0;

          let hue: number, saturation: number, lightness: number;
          if (colorScheme === "activity") {
            hue = 270 - intensity * 90;
            saturation = 60 + intensity * 30;
            lightness = 20 + intensity * 40;
          } else {
            hue = 270;
            saturation = 70;
            lightness = 15 + intensity * 50;
          }

          rect.setAttribute("fill", `hsl(${hue}, ${saturation}%, ${lightness}%)`);
          rect.setAttribute("stroke", "#27272a");

          // Value text
          if (cellWidth >= 60) {
            const text = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "text"
            );
            text.setAttribute("x", (x + cellWidth / 2).toString());
            text.setAttribute("y", (y + cellHeight / 2).toString());
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.setAttribute("font-size", "11");
            text.setAttribute("font-weight", "600");
            text.setAttribute(
              "fill",
              getContrastingTextColor(hue, saturation, lightness)
            );
            text.style.pointerEvents = "none";
            text.textContent = formatNumber(cell.value);
            svg.appendChild(text);
          }
        }

        rect.style.cursor = "pointer";
        rect.style.transition = "opacity 0.15s";

        rect.addEventListener("mouseenter", () => {
          rect.style.opacity = "0.8";
        });

        rect.addEventListener("mouseleave", () => {
          rect.style.opacity = "1";
        });

        if (onCellClick) {
          rect.addEventListener("click", () => onCellClick(cell));
        }

        // Tooltip
        const title = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "title"
        );
        title.textContent = [
          `${cell.directory}`,
          `${formatTimeBin(cell.timeBin, config.timeBin)}`,
          `Events: ${cell.events}`,
          `Commits: ${cell.commits}`,
          `Authors: ${cell.authors}`,
        ].join("\n");
        rect.appendChild(title);

        svg.appendChild(rect);
      });
    });

    this.container.appendChild(svg);
  }

  update(data: HeatmapData, config: HeatmapConfig): void {
    this.render(data, config);
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  async exportImage(): Promise<Blob> {
    if (!this.container) {
      return new Blob();
    }
    // TODO: Implement SVG to PNG conversion
    return new Blob();
  }

  exportData(): any {
    // Would need to store processed data if export is needed
    return {};
  }
}