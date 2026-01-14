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
  lightness: number
): string {
  const luminance = lightness / 100;
  let threshold = 0.5;
  if (saturation > 50) {
    if (hue >= 60 && hue <= 180) threshold = 0.6;
    else if (hue >= 30 && hue < 60) threshold = 0.55;
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
    version: "3.2.1", // Bumped version
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
    this.container.style.background = "#09090b";
  }

  processData(dataset: OptimizedDataset, config?: HeatmapConfig): HeatmapData {
    const { tree, activity, metadata } = dataset;
    const timeBinType = config?.timeBin || this.defaultConfig.timeBin;
    const metric = config?.metric || this.defaultConfig.metric;
    const topN = config?.topN || this.defaultConfig.topN;

    // 1. Map IDs to Directory Paths
    const idToPath = new Map<number, string>();
    const traverse = (node: OptimizedDirectoryNode) => {
      if (node.type === "directory") {
        // FIX: Use the pre-calculated path from the node directly
        // This ensures consistency with DataLoader's path generation
        idToPath.set(node.id, node.path); 
        node.children?.forEach(traverse);
      }
    };
    traverse(tree);

    // 2. Determine Top Directories
    let topDirectories: string[] = [];

    // OPTIMIZATION: Use pre-calculated directory stats if available
    if (metadata.directory_stats && metadata.directory_stats.length > 0) {
      topDirectories = metadata.directory_stats
        .sort((a, b) => b.activity_score - a.activity_score)
        .slice(0, topN)
        .map(d => d.path);
    } else {
      // Fallback: Iterate activity to calculate top directories
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
    interface TempCell extends Omit<HeatmapCell, 'topContributors' | 'topFiles'> {
      contributorsSet: Set<string>;
      filesSet: Set<string>;
    }
    
    const cellMap = new Map<string, TempCell>();
    const timeBinsSet = new Set<number>();
    const topDirsSet = new Set(topDirectories);

    activity.forEach((item) => {
      const path = idToPath.get(item.id);
      // FIX: Ensure we have a path and it's in our top list
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
          filesSet: new Set()
        });
      }

      const cell = cellMap.get(key)!;
      cell.events += (item.a + item.m + item.del);
      cell.commits += item.c;
      cell.creations += item.a;
      cell.deletions += item.del;
      cell.modifications += item.m;
      cell.authors = Math.max(cell.authors, item.au);
      
      if (item.tc) item.tc.forEach(c => cell.contributorsSet.add(c));
      if (item.tf) item.tf.forEach(f => cell.filesSet.add(f));
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
          topContributors: tempCell ? Array.from(tempCell.contributorsSet).slice(0, 5) : [],
          topFiles: tempCell ? Array.from(tempCell.filesSet).slice(0, 5) : []
        };

        switch (metric) {
          case "authors": cell.value = cell.authors; break;
          case "commits": cell.value = cell.commits; break;
          case "events": default: cell.value = cell.events; break;
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

    // Corner
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

    // Time Columns
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

    // Body
    const tbody = document.createElement("tbody");
    data.directories.forEach((dir, i) => {
      const row = document.createElement("tr");

      // Directory Label
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

      // Cells
      data.cells[i].forEach((cell) => {
        const td = document.createElement("td");
        const value = cell.value;

        let bg = "#18181b";
        let textColor = "transparent";

        if (value > 0) {
          const intensity = Math.log(value + 1) / Math.log(data.maxValue + 1);
          let hue = 145;
          if (config.metric === "authors") hue = 30;
          if (config.metric === "commits") hue = 210;
          if (config.metric === "lines") hue = 340;

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

        if (cell.creations > 0) td.style.borderBottom = "2px solid green";
        if (cell.deletions > 0) td.style.borderTop = "2px solid red";

        td.title = `${dir}\n${formatTimeBin(cell.timeBin, config.timeBin)}\n` +
          `${config.metric}: ${value}\n` +
          `(+${cell.creations} -${cell.deletions} ~${cell.modifications})`;

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

  update() {}
  destroy() {
    if (this.container) this.container.innerHTML = "";
  }
  async exportImage() { return new Blob(); }
  exportData() { return {}; }
}