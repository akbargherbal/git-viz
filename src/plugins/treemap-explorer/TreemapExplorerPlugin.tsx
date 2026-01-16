// src/plugins/treemap-explorer/TreemapExplorerPlugin.ts

import * as d3 from "d3";
import type { HierarchyRectangularNode } from "d3";
import { VisualizationPlugin, PluginControlProps } from "@/types/plugin";
import { HealthScoreCalculator, HealthScoreResult } from "@/services/data/HealthScoreCalculator";
import { TreemapExplorerControls } from "./components/TreemapExplorerControls";

export interface TreemapExplorerState extends Record<string, unknown> {
  lensMode: 'debt' | 'coupling' | 'time';
  sizeMetric: 'commits' | 'authors' | 'events';
  selectedFile: string | null;
  
  // Debt lens
  healthThreshold: number;
  
  // Coupling lens
  couplingThreshold: number;
  showArcs: boolean;
  
  // Time lens
  timePosition: number; // 0-100
  playing: boolean;
}

export interface EnrichedFileData {
  key: string;
  name: string;
  path: string;
  totalCommits: number;
  uniqueAuthors: number;
  operations: { M?: number; A?: number; D?: number; R?: number };
  ageDays: number;
  firstSeen: string;
  lastModified: string;
  healthScore?: HealthScoreResult;
  
  // For treemap layout
  value: number; // Size based on selected metric
}

interface TreemapConfig {
  width: number;
  height: number;
}

export class TreemapExplorerPlugin implements VisualizationPlugin<TreemapConfig, EnrichedFileData[]> {
  metadata = {
    id: "treemap-explorer",
    name: "Treemap Explorer",
    description: "Spatial code health and coupling analysis",
    version: "2.0.0",
    priority: 2,
    dataRequirements: [
      { dataset: 'file_index', required: true },
      { dataset: 'cochange_network', required: false }, // For coupling lens
      { dataset: 'temporal_daily', required: false }    // For time lens
    ]
  };

  defaultConfig: TreemapConfig = {
    width: 800,
    height: 600,
  };

  private container: HTMLElement | null = null;
  private enrichedData: EnrichedFileData[] = [];

  getInitialState(): TreemapExplorerState {
    return {
      lensMode: 'debt',
      sizeMetric: 'commits',
      selectedFile: null,
      healthThreshold: 30,
      couplingThreshold: 0.3,
      showArcs: true,
      timePosition: 100,
      playing: false
    };
  }

  init(container: HTMLElement, _config: TreemapConfig): void {
    this.container = container;
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.overflow = "hidden";
  }

  renderControls(props: PluginControlProps): JSX.Element {
    return <TreemapExplorerControls {...props} />;
  }

  processData(dataset: any): EnrichedFileData[] {
    // Extract file_index data - can come directly or as part of dataset
    const fileIndex = dataset.file_index || dataset;
    if (!fileIndex || !fileIndex.files) {
      console.warn('TreemapExplorer: file_index dataset not found or invalid');
      return [];
    }

    // Transform file_index into enriched file data with health scores
    const files: EnrichedFileData[] = Object.entries(fileIndex.files).map(([key, fileData]: [string, any]) => {
      const totalCommits = fileData.total_commits || 0;
      const uniqueAuthors = fileData.unique_authors || 0;
      const operations = fileData.operations || {};
      const ageDays = fileData.age_days || 0;

      // Calculate days since last modification
      const lastModifiedDate = new Date(fileData.last_modified);
      const now = new Date();
      const lastModifiedDaysAgo = Math.floor((now.getTime() - lastModifiedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate health score
      const healthScore = HealthScoreCalculator.calculate({
        totalCommits,
        uniqueAuthors,
        operations,
        ageDays,
        lastModifiedDaysAgo
      });

      // Extract file name from key
      const pathParts = key.split('/');
      const name = pathParts[pathParts.length - 1];

      return {
        key,
        name,
        path: key,
        totalCommits,
        uniqueAuthors,
        operations,
        ageDays,
        firstSeen: fileData.first_seen,
        lastModified: fileData.last_modified,
        healthScore,
        value: totalCommits // Default size metric
      };
    });

    this.enrichedData = files;
    return files;
  }

  render(
    files: EnrichedFileData[],
    config: TreemapConfig
  ): void {
    if (!this.container || files.length === 0) return;

    // Get current state from config which includes plugin state
    const currentState: TreemapExplorerState = {
      lensMode: (config as any).lensMode || 'debt',
      sizeMetric: (config as any).sizeMetric || 'commits',
      selectedFile: (config as any).selectedFile || null,
      healthThreshold: (config as any).healthThreshold || 30,
      couplingThreshold: (config as any).couplingThreshold || 0.3,
      showArcs: (config as any).showArcs !== false,
      timePosition: (config as any).timePosition || 100,
      playing: (config as any).playing || false
    };
    
    // Update values based on size metric
    const updatedFiles = this.applySizeMetric(files, currentState.sizeMetric);
    
    this.container.innerHTML = "";

    const width = this.container.clientWidth || config.width;
    const height = this.container.clientHeight || config.height;

    const svg = d3
      .select(this.container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("font-family", "monospace")
      .style("background-color", "#09090b");

    // Create flat treemap structure (no hierarchy, just files)
    const root = d3.hierarchy({
      name: "root",
      children: updatedFiles.map(f => ({
        name: f.name,
        value: f.value,
        data: f
      }))
    } as any)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3
      .treemap<any>()
      .size([width, height])
      .paddingOuter(2)
      .paddingInner(1)
      .round(true);

    treemap(root as any);

    // Draw cells
    const cells = svg
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", (d: any) => {
        const rectNode = d as HierarchyRectangularNode<any>;
        return `translate(${rectNode.x0},${rectNode.y0})`;
      })
      .attr("class", "treemap-cell")
      .style("cursor", "pointer");

    // Rectangles
    cells
      .append("rect")
      .attr("width", (d: any) => {
        const rectNode = d as HierarchyRectangularNode<any>;
        return rectNode.x1 - rectNode.x0;
      })
      .attr("height", (d: any) => {
        const rectNode = d as HierarchyRectangularNode<any>;
        return rectNode.y1 - rectNode.y0;
      })
      .attr("fill", (d: any) => this.getCellColor(d.data.data, currentState))
      .attr("stroke", "#18181b")
      .attr("stroke-width", 1)
      .style("transition", "all 0.15s ease");

    // Labels (only for cells with enough space)
    cells.each(function (d: any) {
      const rectNode = d as HierarchyRectangularNode<any>;
      const node = d3.select(this);
      const w = rectNode.x1 - rectNode.x0;
      const h = rectNode.y1 - rectNode.y0;

      if (w > 50 && h > 20) {
        node
          .append("text")
          .attr("x", w / 2)
          .attr("y", h / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "white")
          .attr("font-size", "10px")
          .attr("font-weight", "500")
          .style("pointer-events", "none")
          .text((d: any) => {
            const fileName = d.data.data.name;
            // Truncate long names
            return fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
          });
      }
    });

    // Tooltips
    cells.append("title").text((d: any) => {
      const file = d.data.data as EnrichedFileData;
      const healthScore = file.healthScore?.score || 0;
      return `${file.path}\nHealth: ${healthScore}\nCommits: ${file.totalCommits}\nAuthors: ${file.uniqueAuthors}`;
    });
  }

  private applySizeMetric(files: EnrichedFileData[], metric: string): EnrichedFileData[] {
    return files.map(f => ({
      ...f,
      value: this.getMetricValue(f, metric)
    }));
  }

  private getMetricValue(file: EnrichedFileData, metric: string): number {
    switch (metric) {
      case 'commits':
        return Math.max(1, file.totalCommits);
      case 'authors':
        return Math.max(1, file.uniqueAuthors);
      case 'events':
        const ops = file.operations;
        const total = (ops.M || 0) + (ops.A || 0) + (ops.D || 0) + (ops.R || 0);
        return Math.max(1, total);
      default:
        return Math.max(1, file.totalCommits);
    }
  }

  private getCellColor(file: EnrichedFileData, state: TreemapExplorerState): string {
    switch (state.lensMode) {
      case 'debt':
        return this.getDebtColor(file);
      case 'coupling':
        return this.getCouplingColor(file, state);
      case 'time':
        return this.getTimeColor(file, state);
      default:
        return '#27272a'; // zinc-800
    }
  }

  private getDebtColor(file: EnrichedFileData): string {
    if (!file.healthScore) return '#27272a';
    return HealthScoreCalculator.getHealthColor(file.healthScore.score);
  }

  private getCouplingColor(_file: EnrichedFileData, _state: TreemapExplorerState): string {
    // Placeholder for Phase 2
    // Will use cochange_network data to determine coupling strength
    return '#7c3aed'; // purple-600
  }

  private getTimeColor(_file: EnrichedFileData, _state: TreemapExplorerState): string {
    // Placeholder for Phase 3
    // Will use temporal_daily data to show activity over time
    return '#3b82f6'; // blue-500
  }

  update(
    files: EnrichedFileData[],
    config: TreemapConfig
  ): void {
    // For now, just re-render
    // In future phases, we'll implement more efficient updates
    this.render(files, config);
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  async exportImage(): Promise<Blob> {
    // TODO: Implement SVG to PNG export
    return new Blob();
  }

  exportData(): Record<string, any> {
    return {
      files: this.enrichedData.map(f => ({
        path: f.path,
        healthScore: f.healthScore?.score,
        category: f.healthScore?.category,
        commits: f.totalCommits,
        authors: f.uniqueAuthors,
        churnRate: f.healthScore?.churnRate
      }))
    };
  }
}