// src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts
// FILTER PLAN PHASE 1: Added processingStateKeys and validateState

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
import {
  getTimeBinStart,
  formatTimeBin,
  getNextTimeBin,
} from "@/utils/dateHelpers";
import { formatNumber } from "@/utils/formatting";
import { DataProcessor } from "@/services/data/DataProcessor";
import { TimeBinSelector } from "@/components/common/TimeBinSelector";
import { TimelineHeatmapFilters } from "./components/TimelineHeatmapFilters";
import { FilterState } from "@/types/visualization";

// ============================================================================
// PHASE 2: Plugin State Interface
// ============================================================================

/**
 * State shape for Timeline Heatmap Plugin
 * Manages all plugin-specific configuration and filtering
 */
export interface TimelineHeatmapState extends Record<string, unknown> {
  /** Selected metric for visualization (fixed to "commits") */
  metric: MetricType;

  /** Time bin granularity */
  timeBin: TimeBinType;

  /** Number of directories to display (replaces fixed topN) */
  directoryCount: number;

  /** Directories excluded from visualization */
  excludedDirectories: string[];
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
  directoryCount?: number;
  excludedDirectories?: string[];
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
  TimelineHeatmapState
> {
  metadata = {
    id: "timeline-heatmap",
    name: "Timeline Heatmap",
    description: "Repository activity across time and directory structure",
    version: "5.1.0", // FILTER PLAN PHASE 1: Added processing state metadata
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
    metric: "commits", // Fixed to commits
    directoryCount: 20,
    excludedDirectories: [],
  };

  private container: HTMLElement | null = null;

  // PHASE 2: Abort flag for cancellation support
  private aborted = false;

  // ============================================================================
  // FILTER PLAN PHASE 1: Processing State Metadata
  // ============================================================================

  /**
   * Declare which state fields require data reprocessing
   * Other fields (if added later) only trigger re-render
   *
   * NOTE: 'timeBin' affects processing but is handled separately via filters.timeBin
   * NOTE: 'metric' is fixed to 'commits', so not needed in processing state
   */
  processingStateKeys: Extract<keyof TimelineHeatmapState, string>[] = [
    "excludedDirectories",
    "directoryCount",
  ];

  /**
   * Validate state for debugging and development
   * Helps catch configuration errors early
   */
  validateState = (state: TimelineHeatmapState): string[] => {
    const errors: string[] = [];

    if (state.directoryCount < 5 || state.directoryCount > 100) {
      errors.push("directoryCount must be between 5 and 100");
    }

    if (!Array.isArray(state.excludedDirectories)) {
      errors.push("excludedDirectories must be an array");
    }

    if (!["commits"].includes(state.metric)) {
      errors.push('metric must be "commits"');
    }

    if (!["day", "week", "month"].includes(state.timeBin)) {
      errors.push("timeBin must be one of: day, week, month");
    }

    return errors;
  };

  // ============================================================================
  // PHASE 2: Initial State Definition
  // ============================================================================

  /**
   * Returns initial state for the plugin
   * Called when plugin is first activated or when state needs to be reset
   */
  getInitialState = (): TimelineHeatmapState => ({
    metric: "commits" as MetricType, // Fixed to commits
    timeBin: "week" as TimeBinType,
    directoryCount: 20,
    excludedDirectories: [] as string[],
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
   * Metric is now fixed to "commits", so only time bin selector is shown
   */
  renderControls = (props: PluginControlProps<Record<string, unknown>>) => {
    const { state, updateState } = props;

    // Cast state to our specific type inside the function
    const typedState = state as TimelineHeatmapState;

    return React.createElement(
      "div",
      { className: "flex gap-4 items-center flex-wrap" },

      // Time Bin Selector (only control now)
      React.createElement(TimeBinSelector, {
        value: typedState.timeBin,
        onChange: (timeBin: TimeBinType) => updateState({ timeBin }),
      }),
    );
  };

  /**
   * Renders plugin-specific filters in the sidebar
   * Now uses the dedicated TimelineHeatmapFilters component
   */

  renderFilters = (
    props: PluginControlProps<Record<string, unknown>> & {
      onClose: () => void;
    },
  ) => {
    const { state, updateState, data, onClose } = props;

    // Cast state to our specific type inside the function
    const typedState = state as TimelineHeatmapState;

    // Extract available data from metadata
    const directories = data?.metadata?.directory_stats || [];

    return React.createElement(TimelineHeatmapFilters, {
      directories: directories,
      excludedDirectories: typedState.excludedDirectories || [],
      directoryCount: typedState.directoryCount || 20,
      onExcludedDirectoriesChange: (excluded: string[]) =>
        updateState({ excludedDirectories: excluded }),
      onDirectoryCountChange: (count: number) =>
        updateState({ directoryCount: count }),

      onClose: onClose,
    });
  };

  /**
   * Checks if there are any active filters
   */
  checkActiveFilters = (state: Record<string, unknown>): boolean => {
    const typedState = state as TimelineHeatmapState;
    return (
      typedState.excludedDirectories &&
      typedState.excludedDirectories.length > 0
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
    if (
      dataset &&
      dataset.lifecycle &&
      dataset.authors &&
      dataset.files &&
      dataset.dirs
    ) {
      // DataFormatAdapter ensures these datasets exist (even if empty)
      // Just check if they have actual data
      if (Object.keys(dataset.lifecycle.files || {}).length === 0) {
        console.warn(
          "[TimelineHeatmap] file_lifecycle is empty - no timeline data to display",
        );
        return {
          cells: [],
          directories: [],
          timeBins: [],
          maxValue: 0,
        };
      }

      // Construct FilterState from config to allow plugin-controlled filtering
      const filters: FilterState = {
        authors: new Set(),
        fileTypes: new Set(),
        directories: new Set(),
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

    // PHASE 2: Use directoryCount from config/state instead of fixed topN
    const directoryCount =
      config?.directoryCount ?? config?.topN ?? this.defaultConfig.topN;
    const excludedDirs = new Set(config?.excludedDirectories || []);

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

    // 2. Determine Top Directories (PHASE 2: Apply exclusions and dynamic count)
    let topDirectories: string[] = [];

    if (metadata.directory_stats && metadata.directory_stats.length > 0) {
      topDirectories = metadata.directory_stats
        .filter((d) => !excludedDirs.has(d.path)) // PHASE 2: Filter exclusions
        .sort((a, b) => b.activity_score - a.activity_score)
        .slice(0, directoryCount) // PHASE 2: Use dynamic count
        .map((d) => d.path);
    } else {
      const dirActivity = new Map<string, number>();
      activity.forEach((item) => {
        const path = idToPath.get(item.id);
        if (path && !excludedDirs.has(path)) {
          // PHASE 2: Filter exclusions
          const totalEvents = item.a + item.m + item.del;
          dirActivity.set(path, (dirActivity.get(path) || 0) + totalEvents);
        }
      });
      topDirectories = Array.from(dirActivity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, directoryCount) // PHASE 2: Use dynamic count
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
    const topDirsSet = new Set(topDirectories);

    // NEW: Determine Time Range from Activity
    let minTime = Infinity;
    let maxTime = -Infinity;

    // First pass to find range
    for (const item of activity) {
      const t = new Date(item.d).getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }

    // Handle empty data
    if (minTime === Infinity) {
      return { cells: [], directories: [], timeBins: [], maxValue: 0 };
    }

    // Generate continuous time bins
    const timeBins: Date[] = [];
    let currentBin = getTimeBinStart(new Date(minTime), timeBinType);
    const endBin = getTimeBinStart(new Date(maxTime), timeBinType);

    // Safety break to prevent infinite loops if something goes wrong with dates
    let safetyCounter = 0;
    const MAX_BINS = 5000; // Reasonable limit for visualization

    while (currentBin <= endBin && safetyCounter < MAX_BINS) {
      timeBins.push(new Date(currentBin));
      currentBin = getNextTimeBin(currentBin, timeBinType);
      safetyCounter++;
    }

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

    // 4. Build Grid - Always use commits as the value
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
          value: tempCell ? tempCell.commits : 0, // Always use commits
          topContributors: tempCell
            ? Array.from(tempCell.contributorsSet).slice(0, 5)
            : [],
          topFiles: tempCell ? Array.from(tempCell.filesSet).slice(0, 5) : [],
        };

        maxValue = Math.max(maxValue, cell.value);
        return cell;
      });
    });

    return { cells, directories: topDirectories, timeBins, maxValue };
  }

  /**
   * Renders the heatmap visualization
   * Color scheme is fixed to Blue (hue 210°) for commits
   * PHASE 2: Now reflects dynamic directoryCount
   */
  render(data: HeatmapData, config: HeatmapConfig): void {
    if (!this.container) return;

    // ISSUE #06: Structural validation guard
    if (!data || !data.directories || !Array.isArray(data.cells)) {
      console.warn(
        `[TimelineHeatmap] Received invalid data format. Expected HeatmapData object, got:`,
        Array.isArray(data) ? "Array" : typeof data,
      );
      return;
    }

    this.container.innerHTML = "";

    const table = document.createElement("table");
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "2px";
    table.style.fontFamily = "monospace";

    // Header Row
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Corner Cell (PHASE 2: Show actual directory count)
    const corner = document.createElement("th");
    const actualCount = config.directoryCount ?? config.topN;
    corner.innerHTML = `<div class="flex flex-col items-start">
      <span class="text-zinc-400">Directory</span>
      <span class="text-[10px] text-zinc-600 font-normal">Top ${actualCount} by Activity</span>
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
      th.style.borderBottom = "2px dashed #27272a";
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

          // Fixed Blue color scheme for commits
          const hue = 210; // Blue
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
          `Commits: ${value}\n` +
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
            td.style.transform = "";
            td.style.zIndex = "";
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
