// src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts

import React from "react";
import type {
  VisualizationPlugin,
  OptimizedDataset,
  PluginControlProps,
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
import { FilterState } from "@/types/visualization";

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
  // Added filter fields to config
  selectedAuthors?: string[];
  selectedExtensions?: string[];
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
    version: "4.2.1", // Bumped for race condition fix
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
    selectedAuthors: [],
    selectedExtensions: [],
  };

  private container: HTMLElement | null = null;

  // PHASE 2: Abort flag for cancellation support
  private aborted = false;

  // ============================================================================
  // PHASE 2: Initial State Definition
  // ============================================================================

  /**
   * Returns initial state for the plugin
   * Called when plugin is first activated or when state needs to be reset
   */
  getInitialState = (): Record<string, unknown> => ({
    metric: "events" as MetricType,
    timeBin: "week" as TimeBinType,
    selectedAuthors: [] as string[],
    selectedExtensions: [] as string[],
  });

  // ============================================================================
  // PHASE 2: Lifecycle Methods
  // ============================================================================

  /**
   * PHASE 2: Cleanup method called when plugin is unmounted
   * Aborts any ongoing operations
   */
  cleanup(): void {
    console.log("[TimelineHeatmap] Cleanup called - aborting operations");
    this.aborted = true;
    // Clear any DOM event listeners or references if needed
  }

  /**
   * PHASE 2: Cancellable version of processData
   * Checks abort signal periodically during expensive operations
   */
  async processDataCancellable(
    dataset: any,
    signal: AbortSignal,
    config?: HeatmapConfig,
  ): Promise<HeatmapData> {
    this.aborted = false;

    // Listen for abort signal
    signal.addEventListener("abort", () => {
      console.log("[TimelineHeatmap] Abort signal received");
      this.aborted = true;
    });

    // Check if already aborted before starting
    if (signal.aborted) {
      console.log("[TimelineHeatmap] Already aborted before processing");
      throw new DOMException("Operation aborted", "AbortError");
    }

    // Use the regular processData implementation
    // The traverse function and other methods will check this.aborted
    return this.processData(dataset, config);
  }

  // ============================================================================
  // PHASE 2: Control Rendering
  // ============================================================================

  /**
   * Renders plugin-specific controls
   * This gives the plugin full ownership of its UI controls
   */
  renderControls = (props: PluginControlProps<Record<string, unknown>>) => {
    const { state, updateState } = props;

    // Cast state to our specific type
    const typedState = state as unknown as TimelineHeatmapState;

    return React.createElement(
      "div",
      { className: "flex gap-4 items-center flex-wrap" },

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
    );
  };

  /**
   * Renders plugin-specific filters in the sidebar
   */
  renderFilters = (
    props: PluginControlProps<Record<string, unknown>> & {
      onClose: () => void;
    },
  ) => {
    const { state, updateState, data, onClose } = props;
    const typedState = state as unknown as TimelineHeatmapState;

    // Extract available authors and extensions from metadata
    const authors = data?.metadata?.authors || [];
    const fileTypes = data?.metadata?.file_types || [];

    return React.createElement(FilterPanel, {
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
      onClose: onClose,
    });
  };

  /**
   * Checks if there are any active filters
   */
  checkActiveFilters = (state: Record<string, unknown>): boolean => {
    const typedState = state as unknown as TimelineHeatmapState;
    return (
      (typedState.selectedAuthors && typedState.selectedAuthors.length > 0) ||
      (typedState.selectedExtensions &&
        typedState.selectedExtensions.length > 0)
    );
  };

  // ============================================================================
  // PHASE 2: Layout Configuration
  // ============================================================================

  layoutConfig = {
    controlsPosition: "header" as const,
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
    if (dataset && dataset.lifecycle && dataset.authors && dataset.files && dataset.dirs) {
      // Construct FilterState from config to allow plugin-controlled filtering
      const filters: FilterState = {
        authors: new Set(config?.selectedAuthors || []),
        fileTypes: new Set(config?.selectedExtensions || []),
        directories: new Set(), // Could be added to state later
        eventTypes: new Set(),
        timeRange: null,
      };

      // Process raw data on the fly using the extracted processor
      optimizedData = DataProcessor.processRawData(
        dataset.lifecycle,
        dataset.authors,
        dataset.files,
        dataset.dirs,
        filters,
      );
    } else {
      // Fallback: Assume legacy OptimizedDataset (already processed)
      optimizedData = dataset as OptimizedDataset;
    }

    // Guard against incomplete or missing data during plugin transitions
    if (!optimizedData || !optimizedData.metadata || !optimizedData.tree) {
      return {
        cells: [],
        directories: [],
        timeBins: [],
        maxValue: 0,
      };
    }

    const { tree, activity, metadata } = optimizedData;
    const timeBinType = config?.timeBin || this.defaultConfig.timeBin;
    const metric = config?.metric || this.defaultConfig.metric;
    const topN = config?.topN || this.defaultConfig.topN;

    // 1. Map IDs to Directory Paths
    const idToPath = new Map<number, string>();
    const traverse = (node: OptimizedDirectoryNode) => {
      // PHASE 2: Check abort flag periodically
      if (this.aborted) {
        console.log("[TimelineHeatmap] Aborting traverse");
        return;
      }

      // Guard against undefined nodes during rapid plugin switching
      if (!node?.type) {
        console.warn(
          "[TimelineHeatmap] Skipping undefined node during traversal",
        );
        return;
      }

      if (node.type === "directory") {
        idToPath.set(node.id, node.path);
        node.children?.forEach(traverse);
      }
    };
    traverse(tree);

    // PHASE 2: Check if aborted after traverse
    if (this.aborted) {
      console.log("[TimelineHeatmap] Aborted after tree traversal");
      throw new DOMException("Operation aborted", "AbortError");
    }

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

    // PHASE 2: Check abort before heavy processing
    if (this.aborted) {
      console.log("[TimelineHeatmap] Aborted before aggregation");
      throw new DOMException("Operation aborted", "AbortError");
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

    // PHASE 2: Check abort periodically during iteration
    let processedCount = 0;
    for (const item of activity) {
      if (this.aborted && processedCount % 100 === 0) {
        console.log("[TimelineHeatmap] Aborted during activity aggregation");
        throw new DOMException("Operation aborted", "AbortError");
      }

      const path = idToPath.get(item.id);
      if (!path || !topDirsSet.has(path)) continue;

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

      processedCount++;
    }

    // PHASE 2: Final abort check
    if (this.aborted) {
      console.log("[TimelineHeatmap] Aborted before building grid");
      throw new DOMException("Operation aborted", "AbortError");
    }

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
            ? Array.from(tempCell.contributorsSet).slice(0, 5)
            : [],
          topFiles: tempCell ? Array.from(tempCell.filesSet).slice(0, 5) : [],
        };

        switch (metric) {
          case "authors":
            cell.value = cell.authors;
            break;
          case "commits":
            cell.value = cell.commits;
            break;
          case "events":
          default:
            cell.value = cell.events;
            break;
        }

        maxValue = Math.max(maxValue, cell.value);
        return cell;
      });
    });

    return { cells, directories: topDirectories, timeBins, maxValue };
  }

  /**
   * Renders the heatmap visualization
   * Color scheme dynamically changes based on config.metric:
   * - events: Green (hue 145°)
   * - authors: Orange/Amber (hue 30°)
   * - commits: Blue (hue 210°)
   */
  render(data: HeatmapData, config: HeatmapConfig): void {
    if (!this.container) return;
    this.container.innerHTML = "";

    const table = document.createElement("table");
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "2px";
    table.style.fontFamily = "monospace";

    // Header Row
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Corner Cell
    const corner = document.createElement("th");
    corner.innerHTML = `<div class="flex flex-col items-start">
      <span class="text-zinc-400">Directory</span>
      <span class="text-[10px] text-zinc-600 font-normal">Top ${config.topN} by Activity</span>
    </div>`;
    corner.style.position = "sticky";
    corner.style.left = "0";
    corner.style.top = "0";
    corner.style.zIndex = "40";
    corner.style.background = "#18181b";
    corner.style.padding = "12px";
    corner.style.textAlign = "left";
    corner.style.borderBottom = "1px solid #27272a";
    headerRow.appendChild(corner);

    // Time Column Headers
    data.timeBins.forEach((bin) => {
      const th = document.createElement("th");
      th.textContent = formatTimeBin(bin, config.timeBin);
      th.style.minWidth = `${config.minCellWidth}px`;
      th.style.padding = "8px";
      th.style.color = "#71717a";
      th.style.fontSize = "10px";
      th.style.textAlign = "center";
      th.style.fontWeight = "normal";
      th.style.userSelect = "none";
      th.style.position = "sticky";
      th.style.top = "0";
      th.style.zIndex = "30";
      th.style.background = "#18181b";
      th.style.borderBottom = "1px solid #27272a";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body Rows
    const tbody = document.createElement("tbody");
    data.directories.forEach((dir, i) => {
      const row = document.createElement("tr");

      // Directory Label (sticky left column)
      const th = document.createElement("th");
      const shortName = dir.length > 40 ? "..." + dir.slice(-37) : dir;
      th.textContent = shortName;
      th.title = dir;
      th.style.position = "sticky";
      th.style.left = "0";
      th.style.zIndex = "20";
      th.style.background = "#242429";
      th.style.padding = "8px 12px";
      th.style.color = "#e4e4e7";
      th.style.fontSize = "11px";
      th.style.textAlign = "left";
      th.style.whiteSpace = "nowrap";
      th.style.borderRight = "1px solid #27272a";
      th.style.borderBottom = "2px dashed #27272a"; // Distinctive dashed border
      row.appendChild(th);

      // Data Cells
      data.cells[i].forEach((cell) => {
        const td = document.createElement("td");
        const value = cell.value;

        let bg = "#18181b";
        let textColor = "transparent";

        if (value > 0) {
          // Log-based intensity calculation for better visual distribution
          const intensity = Math.log(value + 1) / Math.log(data.maxValue + 1);

          // CRITICAL: Metric-based hue selection - colors change based on header selection
          let hue: number;
          switch (config.metric) {
            case "authors":
              hue = 30; // Orange/amber for authors
              break;
            case "commits":
              hue = 210; // Blue for commits
              break;
            case "events":
            default:
              hue = 145; // Green for events (default)
              break;
          }

          const saturation = 70;
          const lightness = 10 + intensity * 50;
          bg = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          textColor = getContrastingTextColor(hue, saturation, lightness);
        }

        td.style.background = bg;
        td.style.height = `${config.cellHeight}px`;
        td.style.color = textColor;
        td.style.fontSize = "10px";
        td.style.textAlign = "center";
        td.style.verticalAlign = "middle";
        td.style.transition = "all 0.1s";
        td.style.userSelect = "none";

        if (value > 0) {
          td.textContent = formatNumber(value);
        }

        // Visual indicators for file lifecycle events
        if (cell.creations > 0) td.style.borderBottom = "2px solid green";
        if (cell.deletions > 0) td.style.borderTop = "2px solid red";

        // Tooltip
        td.title =
          `${dir}\n${formatTimeBin(cell.timeBin, config.timeBin)}\n` +
          `${config.metric}: ${value}\n` +
          `(+${cell.creations} -${cell.deletions} ~${cell.modifications})`;

        // Interactive hover effects
        if (value > 0) {
          td.style.cursor = "pointer";
          td.onclick = () => config.onCellClick?.(cell);
          td.onmouseenter = () => {
            td.style.transform = "scale(1.1)";
            td.style.zIndex = "10";
          };
          td.onmouseleave = () => {
            td.style.transform = "scale(1)";
            td.style.zIndex = "auto";
          };
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    this.container.appendChild(table);
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
    // TODO: Implement table to PNG conversion
    return new Blob();
  }

  exportData(): any {
    // Would need to store processed data if export is needed
    return {};
  }
}