// src/plugins/timeline-heatmap/TimelineHeatmapPlugin.ts

import { format } from "date-fns";
import type { VisualizationPlugin, OptimizedDataset } from "@/types/plugin";
import type {
  TimeBinType,
  MetricType,
  OptimizedDirectoryNode,
} from "@/types/domain";
import { getTimeBinStart, formatTimeBin } from "@/utils/dateHelpers";
import { formatNumber } from "@/utils/formatting";

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

// Extended interface to include all metrics
export interface HeatmapCell {
  directory: string;
  timeBin: Date;
  // Metrics
  events: number; // Total events (a + m + del)
  commits: number; // Total commits
  authors: number; // Unique authors
  // Breakdown
  creations: number;
  deletions: number;
  modifications: number;
  // Display helper
  value: number; // The value currently being visualized based on metric
  // Details
  topContributors: string[];
  topFiles: string[];
}

interface HeatmapData {
  cells: HeatmapCell[][];
  directories: string[];
  timeBins: Date[];
  maxValue: number; // Max value for the CURRENT metric
}

// Add this helper function at the top of the class or file
function getContrastingTextColor(
  hue: number,
  saturation: number,
  lightness: number
): string {
  // Convert HSL to relative luminance (simplified, good enough for our use case)
  // This approximation works well for our color ranges
  const luminance = lightness / 100;

  // For saturated colors, we need a higher threshold
  // Green/yellow hues need even higher thresholds due to human eye sensitivity
  let threshold = 0.5;
  if (saturation > 50) {
    // Adjust threshold based on hue (green/yellow are brighter to human eye)
    if (hue >= 60 && hue <= 180) {
      // Green to cyan range
      threshold = 0.6;
    } else if (hue >= 30 && hue < 60) {
      // Yellow-orange range
      threshold = 0.55;
    }
  }

  return luminance > threshold ? "#000000" : "#ffffff";
}

export class TimelineHeatmapPlugin
  implements VisualizationPlugin<HeatmapConfig, HeatmapData>
{
  metadata = {
    id: "timeline-heatmap",
    name: "Timeline Heatmap",
    description: "Repository activity across time and directory structure",
    version: "3.1.0",
    priority: 1,
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

  init(container: HTMLElement, config: HeatmapConfig): void {
    this.container = container;
    this.container.innerHTML = "";
    this.container.style.overflow = "auto";
    this.container.style.background = "#09090b"; // zinc-950
  }

  processData(dataset: OptimizedDataset, config?: HeatmapConfig): HeatmapData {
    const { tree, activity } = dataset;
    const timeBinType = config?.timeBin || this.defaultConfig.timeBin;
    const metric = config?.metric || this.defaultConfig.metric;
    const topN = config?.topN || this.defaultConfig.topN;

    // 1. Map IDs to Directory Paths
    const idToPath = new Map<number, string>();
    const traverse = (node: OptimizedDirectoryNode, currentPath: string) => {
      const path = currentPath ? `${currentPath}/${node.name}` : node.name;
      if (node.type === "directory") {
        idToPath.set(node.id, path);
        node.children?.forEach((child) => traverse(child, path));
      }
    };
    traverse(tree, "");

    // 2. Aggregate Activity by Directory and TimeBin
    const dirActivity = new Map<string, number>(); // For sorting top N
    
    // Intermediate storage to aggregate sets of contributors/files before converting to arrays
    interface TempCell extends Omit<HeatmapCell, 'topContributors' | 'topFiles'> {
      contributorsSet: Set<string>;
      filesSet: Set<string>;
    }
    
    const cellMap = new Map<string, TempCell>();
    const timeBinsSet = new Set<number>();

    activity.forEach((item) => {
      const path = idToPath.get(item.id);
      if (!path) return;

      // Calculate total activity for sorting (always sort by total events for relevance)
      const totalEvents = item.a + item.m + item.del;
      dirActivity.set(path, (dirActivity.get(path) || 0) + totalEvents);

      // Binning
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
          filesSet: new Set()
        });
      }

      const cell = cellMap.get(key)!;
      cell.events += totalEvents;
      cell.commits += item.c;
      cell.creations += item.a;
      cell.deletions += item.del;
      cell.modifications += item.m;
      // Authors is pre-calculated unique count in matrix, we take the max for the bin
      cell.authors = Math.max(cell.authors, item.au);
      
      // Aggregate top contributors and files
      if (item.tc) item.tc.forEach(c => cell.contributorsSet.add(c));
      if (item.tf) item.tf.forEach(f => cell.filesSet.add(f));
    });

    // 3. Get Top N Directories
    const topDirectories = Array.from(dirActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([dir]) => dir);

    // 4. Sort Time Bins
    const timeBins = Array.from(timeBinsSet)
      .sort()
      .map((t) => new Date(t));

    // 5. Build Grid and Calculate Max Value for Color Scale
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
          topContributors: tempCell ? Array.from(tempCell.contributorsSet).slice(0, 5) : [],
          topFiles: tempCell ? Array.from(tempCell.filesSet).slice(0, 5) : []
        };

        // Determine value based on selected metric
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

    // Corner (Sticky Top + Left)
    const corner = document.createElement("th");
    corner.innerHTML = `<div class="flex flex-col items-start">
      <span class="text-zinc-400">Directory</span>
      <span class="text-[10px] text-zinc-600 font-normal">Top ${config.topN} by Activity</span>
    </div>`;
    corner.style.position = "sticky";
    corner.style.left = "0";
    corner.style.top = "0";
    corner.style.zIndex = "40"; // Highest priority
    corner.style.background = "#18181b"; // zinc-900
    corner.style.padding = "12px";
    corner.style.textAlign = "left";
    corner.style.borderBottom = "1px solid #27272a";
    headerRow.appendChild(corner);

    // Time Columns (Sticky Top)
    data.timeBins.forEach((bin) => {
      const th = document.createElement("th");
      th.textContent = formatTimeBin(bin, config.timeBin);
      th.style.minWidth = `${config.minCellWidth}px`;
      th.style.padding = "8px";
      th.style.color = "#71717a"; // zinc-500
      th.style.fontSize = "10px";
      th.style.textAlign = "center";
      th.style.fontWeight = "normal";
      th.style.userSelect = "none"

      // Sticky positioning for time axis
      th.style.position = "sticky";
      th.style.top = "0";
      th.style.zIndex = "30"; // Above body cells, below corner
      th.style.background = "#18181b"; // Opaque background to hide scrolling content
      th.style.borderBottom = "1px solid #27272a";

      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    data.directories.forEach((dir, i) => {
      const row = document.createElement("tr");

      // Directory Label (Sticky Left)
      const th = document.createElement("th");
      // Truncate long paths visually but keep title
      const shortName = dir.length > 40 ? "..." + dir.slice(-37) : dir;
      th.textContent = shortName;
      th.title = dir;
      th.style.position = "sticky";
      th.style.left = "0";
      th.style.zIndex = "20"; // Above body cells, below corner
      th.style.background = "#18181b";
      th.style.padding = "8px 12px";
      th.style.color = "#e4e4e7"; // zinc-200
      th.style.fontSize = "11px";
      th.style.textAlign = "left";
      th.style.whiteSpace = "nowrap";
      th.style.borderRight = "1px solid #27272a";
      row.appendChild(th);

      // Cells
      data.cells[i].forEach((cell) => {
        const td = document.createElement("td");
        const value = cell.value;

        // Color logic
        let bg = "#18181b"; // Default dark
        let textColor = "transparent";

        // Then in your render method, replace the text color logic:
        if (value > 0) {
          const intensity = Math.log(value + 1) / Math.log(data.maxValue + 1);

          let hue = 145; // Green default (Events)
          if (config.metric === "authors") hue = 30; // Orange
          if (config.metric === "commits") hue = 210; // Blue
          if (config.metric === "lines") hue = 340; // Purple

          const saturation = 70;
          const lightness = 10 + intensity * 50; // 10% to 60%
          bg = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

          // Use the helper function
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


        // 1. Numeric Overlay
        if (value > 0) {
          td.textContent = formatNumber(value);
        }

        // 2. Creation Indicator (Green underline)
        if (cell.creations > 0) {
          td.style.borderBottom = "2px solid green"; // green-400
        }

        // Deletion Indicator (Red overline)
        if (cell.deletions > 0) {
          td.style.borderTop = "2px solid red"; // green-400
        }

        // Tooltip
        td.title =
          `${dir}\n${formatTimeBin(cell.timeBin, config.timeBin)}\n` +
          `${config.metric}: ${value}\n` +
          `(+${cell.creations} -${cell.deletions} ~${cell.modifications})`;

        if (value > 0) {
          td.style.cursor = "pointer";
          td.onclick = () => config.onCellClick?.(cell);

          // Hover effect
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

  update() {}
  destroy() {
    if (this.container) this.container.innerHTML = "";
  }
  async exportImage() {
    return new Blob();
  }
  exportData() {
    return {};
  }
}

