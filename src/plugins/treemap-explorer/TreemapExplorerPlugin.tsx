// src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx

import * as d3 from "d3";
import type { HierarchyRectangularNode } from "d3";
import { VisualizationPlugin, PluginControlProps } from "@/types/plugin";
import { HealthScoreCalculator, HealthScoreResult } from "@/services/data/HealthScoreCalculator";
import { CouplingDataProcessor, CouplingIndex } from "@/services/data/CouplingDataProcessor";
import { TreemapExplorerControls } from "./components/TreemapExplorerControls";
import { TreemapExplorerFilters } from "./components/TreemapExplorerFilters";
import { CouplingArcRenderer } from "./renderers/CouplingArcRenderer";
import { getCellColor } from "./utils/colorScales";

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
  
  // Coupling Metrics (Phase 2)
  couplingMetrics?: {
    maxStrength: number;
    totalPartners: number;
  };
  
  // For treemap layout
  value: number; 
}

// Wrapper structure used for D3 hierarchy leaves
export interface TreemapHierarchyDatum {
  name: string;
  value: number;
  data: EnrichedFileData;
}

interface TreemapConfig {
  width: number;
  height: number;
  onCellClick?: (data: any) => void;
}

export class TreemapExplorerPlugin implements VisualizationPlugin<TreemapConfig, EnrichedFileData[]> {
  metadata = {
    id: "treemap-explorer",
    name: "Treemap Explorer",
    description: "Spatial code health and coupling analysis",
    version: "2.2.0", // Bumped version for refactor
    priority: 2,
    dataRequirements: [
      { dataset: 'file_index', required: true },
      { dataset: 'cochange_network', required: false },
      { dataset: 'temporal_daily', required: false }
    ]
  };

  defaultConfig: TreemapConfig = {
    width: 800,
    height: 600,
  };

  private container: HTMLElement | null = null;
  private couplingIndex: CouplingIndex = new Map();
  private arcRenderer: CouplingArcRenderer | null = null;
  
  // ✅ NEW: Persistent SVG element (not recreated on every render)
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  
  // ✅ NEW: Pre-computed coupling strengths cache
  private couplingStrengthCache: Map<string, number> = new Map();

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
    this.container.style.position = "relative";
    
    // ✅ NEW: Create SVG once during initialization
    this.svg = d3.select(this.container)
      .append("svg")
      .style("font-family", "monospace")
      .style("background-color", "#09090b");
    
    // ✅ NEW: Initialize arc renderer once
    this.arcRenderer = new CouplingArcRenderer(this.svg);
  }

  // Expose coupling index for Detail Panel
  public getCouplingIndex(): CouplingIndex {
    return this.couplingIndex;
  }

  renderControls(props: PluginControlProps): JSX.Element {
    return <TreemapExplorerControls {...props} />;
  }

  renderFilters = (props: PluginControlProps<Record<string, unknown>> & { onClose: () => void }) => {
    const { state, updateState, onClose } = props;
    const typedState = state as unknown as TreemapExplorerState;

    return (
      <TreemapExplorerFilters
        state={typedState}
        onStateChange={updateState}
        onClose={onClose}
      />
    );
  };

  processData(dataset: any): EnrichedFileData[] {
    const fileIndex = dataset.file_index || dataset;
    if (!fileIndex || !fileIndex.files) {
      console.warn('TreemapExplorer: file_index dataset not found or invalid');
      return [];
    }

    // Process coupling data
    if (dataset.cochange_network) {
      this.couplingIndex = CouplingDataProcessor.process(dataset.cochange_network);
    }

    const files: EnrichedFileData[] = Object.entries(fileIndex.files).map(([key, fileData]: [string, any]) => {
      const totalCommits = fileData.total_commits || 0;
      const uniqueAuthors = fileData.unique_authors || 0;
      const operations = fileData.operations || {};
      const ageDays = fileData.age_days || 0;

      const lastModifiedDate = new Date(fileData.last_modified);
      const now = new Date();
      const lastModifiedDaysAgo = Math.floor((now.getTime() - lastModifiedDate.getTime()) / (1000 * 60 * 60 * 24));

      const healthScore = HealthScoreCalculator.calculate({
        totalCommits,
        uniqueAuthors,
        operations,
        ageDays,
        lastModifiedDaysAgo
      });

      // Get coupling metrics if available
      let couplingMetrics;
      if (this.couplingIndex.size > 0) {
        const metrics = CouplingDataProcessor.getFileCouplingMetrics(this.couplingIndex, key);
        couplingMetrics = {
          maxStrength: metrics.maxStrength,
          totalPartners: metrics.totalPartners
        };
      }

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
        couplingMetrics,
        value: totalCommits
      };
    });

    return files;
  }

  render(
    files: EnrichedFileData[],
    config: TreemapConfig
  ): void {
    if (!this.container || !this.svg || files.length === 0) return;

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
    
    const updatedFiles = this.applySizeMetric(files, currentState.sizeMetric);
    
    // ✅ NEW: Update SVG dimensions (no recreation)
    const width = this.container.clientWidth || config.width;
    const height = this.container.clientHeight || config.height;
    
    this.svg
      .attr("width", width)
      .attr("height", height);

    // ✅ NEW: Pre-compute coupling strengths ONCE before render loop
    this.precomputeCouplingStrengths(currentState);

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
    
    const leaves = root.leaves() as unknown as HierarchyRectangularNode<TreemapHierarchyDatum>[];

    // ✅ NEW: D3 Join Pattern - properly handles enter/update/exit
    const cells = this.svg
      .selectAll<SVGGElement, HierarchyRectangularNode<TreemapHierarchyDatum>>("g.cell")
      .data(leaves, d => d.data.data.key) // Key function for stable identity
      .join(
        // Enter: New cells
        enter => {
          const cellGroup = enter
            .append("g")
            .attr("class", "cell")
            .style("cursor", "pointer");
          
          cellGroup.append("rect");
          cellGroup.append("text")
            .attr("class", "cell-label")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "10px")
            .style("pointer-events", "none");
          
          return cellGroup;
        },
        // Update: Existing cells (returns selection as-is)
        update => update,
        // Exit: Remove old cells
        exit => exit.remove()
      );

    // ✅ NEW: Update positions and attributes (not recreate)
    cells
      .attr("transform", d => `translate(${d.x0},${d.y0})`)
      .on("click", (_event, d) => {
        if (config.onCellClick) {
          config.onCellClick(d.data.data);
        }
      });

    // Update rectangles
    cells
      .select<SVGRectElement>("rect")
      .attr("width", d => Math.max(0, d.x1 - d.x0))
      .attr("height", d => Math.max(0, d.y1 - d.y0))
      .attr("fill", d => this.getCellFillColor(d, currentState))
      .attr("stroke", "#18181b")
      .attr("stroke-width", 1);

    // Update labels
    cells.each(function (d) {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      const textElement = d3.select(this).select<SVGTextElement>("text");
      
      if (w > 50 && h > 20) {
        const isSelected = d.data.data.path === currentState.selectedFile;
        textElement
          .attr("x", w / 2)
          .attr("y", h / 2)
          .attr("fill", isSelected ? "#000" : "white")
          .text(d.data.data.name.length > 20 ? d.data.data.name.substring(0, 17) + '...' : d.data.data.name)
          .style("display", null);
      } else {
        textElement.style("display", "none");
      }
    });

    // ✅ NEW: Clear and re-render arcs (renderer instance reused)
    if (this.arcRenderer) {
      this.arcRenderer.clear();
      
      if (currentState.lensMode === 'coupling' && currentState.showArcs && currentState.selectedFile) {
        // Limit to top 10 arcs for performance
        this.arcRenderer.render(
          currentState.selectedFile,
          leaves,
          this.couplingIndex,
          currentState.couplingThreshold
        );
      }
    }
  }

  // ✅ NEW: Pre-compute coupling strengths to avoid O(n²) lookups
  private precomputeCouplingStrengths(state: TreemapExplorerState): void {
    this.couplingStrengthCache.clear();
    
    if (state.lensMode === 'coupling' && state.selectedFile) {
      const partners = CouplingDataProcessor.getTopCouplings(
        this.couplingIndex,
        state.selectedFile,
        100 // Get top 100 partners
      );
      
      partners.forEach(p => {
        if (p.strength >= state.couplingThreshold) {
          this.couplingStrengthCache.set(p.filePath, p.strength);
        }
      });
    }
  }

  // ✅ NEW: Extracted color logic with pre-computed cache lookup
  private getCellFillColor(
    d: HierarchyRectangularNode<TreemapHierarchyDatum>,
    state: TreemapExplorerState
  ): string {
    const path = d.data.data.path;
    
    // Coupling lens with selection
    if (state.lensMode === 'coupling' && state.selectedFile) {
      // Selected file is white
      if (path === state.selectedFile) {
        return '#ffffff';
      }
      
      // ✅ NEW: O(1) lookup from pre-computed cache (not O(n) search)
      if (this.couplingStrengthCache.has(path)) {
        const strength = this.couplingStrengthCache.get(path)!;
        return `hsl(270, ${40 + strength * 30}%, ${20 + strength * 20}%)`;
      }
      
      // Not coupled - dimmed
      return '#18181b';
    }
    
    // Default color scales for debt/time lenses
    return getCellColor(d.data.data, state.lensMode, state);
  }

  private applySizeMetric(files: EnrichedFileData[], metric: string): EnrichedFileData[] {
    return files.map(f => ({
      ...f,
      value: this.getMetricValue(f, metric)
    }));
  }

  private getMetricValue(file: EnrichedFileData, metric: string): number {
    switch (metric) {
      case 'commits': return Math.max(1, file.totalCommits);
      case 'authors': return Math.max(1, file.uniqueAuthors);
      case 'events':
        const ops = file.operations;
        return Math.max(1, (ops.M || 0) + (ops.A || 0) + (ops.D || 0) + (ops.R || 0));
      default: return Math.max(1, file.totalCommits);
    }
  }

  update(files: EnrichedFileData[], config: TreemapConfig): void {
    // ✅ NEW: update() now just calls render() (which handles everything efficiently)
    this.render(files, config);
  }

  // ✅ NEW: Proper cleanup of all resources
  destroy(): void {
    // Clean up arc renderer
    if (this.arcRenderer) {
      this.arcRenderer.destroy();
      this.arcRenderer = null;
    }
    
    // Clean up SVG and all D3 selections
    if (this.svg) {
      this.svg.selectAll("*").remove();
      this.svg.remove();
      this.svg = null;
    }
    
    // Clear data structures
    this.couplingIndex.clear();
    this.couplingStrengthCache.clear();
    
    // Clear container reference
    this.container = null;
  }

  async exportImage(): Promise<Blob> {
    return new Blob();
  }

  exportData(): any {
    return {};
  }
}