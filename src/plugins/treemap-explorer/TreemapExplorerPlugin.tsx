// src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx

import {
  VisualizationPlugin,
  PluginControlProps,
  ExportOptions,
} from "@/types/plugin";
import * as d3 from "d3";
import { DataProcessor } from "@/services/data/DataProcessor";
import { CouplingDataProcessor } from "@/services/data/CouplingDataProcessor";
import {
  TemporalDataProcessor,
  TemporalFileData,
  TemporalDailyData,
} from "@/services/data/TemporalDataProcessor";
import { TreemapExplorerControls } from "./components/TreemapExplorerControls";
import { TreemapExplorerFilters } from "./components/TreemapExplorerFilters";
import TreemapDetailPanel from "./components/TreemapDetailPanel";
import TimelineScrubber from "./components/TimelineScrubber";
import { getCellColor } from "./utils/colorScales";
import { CouplingArcRenderer } from "./renderers/CouplingArcRenderer";
import { EnrichedFileData, TreemapExplorerState } from "./types";

export class TreemapExplorerPlugin implements VisualizationPlugin<TreemapExplorerState> {
  metadata = {
    id: "treemap-explorer",
    name: "Treemap Explorer",
    description: "Multi-lens code health, coupling, and temporal analysis",
    version: "2.1.0", // Bumped for Phase 2 lifecycle support
    priority: 2,
    dataRequirements: [
      { dataset: "file_index", required: true, alias: "file_index" },
      {
        dataset: "cochange_network",
        required: false,
        alias: "cochange_network",
      },
      { dataset: "temporal_daily", required: false, alias: "temporal_daily" },
    ],
  };

  defaultConfig: TreemapExplorerState = {
    lensMode: "debt",
    sizeMetric: "commits",
    selectedFile: null,
    healthThreshold: 50,
    couplingThreshold: 0.03,
    showArcs: true,
    timePosition: 100,
    playing: false,
    timeFilters: {
      showCreations: false,
      fadeDormant: true,
    },
  };

  private container: HTMLElement | null = null;
  private data: EnrichedFileData[] = [];
  private temporalData: TemporalDailyData | null = null;
  private dateRange: { min: string; max: string } | null = null;
  private playbackInterval: number | null = null;
  private arcRenderer: CouplingArcRenderer | null = null;
  private couplingIndex: Map<string, any> = new Map();

  // PHASE 2: Abort flag for cancellation support
  private aborted = false;

  getInitialState(): TreemapExplorerState {
    return { ...this.defaultConfig };
  }

  // ============================================================================
  // PHASE 2: Lifecycle Methods
  // ============================================================================

  /**
   * PHASE 2: Cleanup method called when plugin is unmounted
   * Aborts any ongoing operations and cleans up resources
   */
  cleanup(): void {
    console.log("[TreemapExplorer] Cleanup called - aborting operations");
    this.aborted = true;

    // Stop playback
    this.stopPlayback();

    // Clean up D3 visualization
    if (this.arcRenderer) {
      this.arcRenderer.destroy();
    }
  }

  /**
   * PHASE 2: Cancellable version of processData
   * Checks abort signal periodically during expensive operations
   */
  async processDataCancellable(
    dataset: Record<string, any>,
    signal: AbortSignal,
    _config?: TreemapExplorerState,
  ): Promise<EnrichedFileData[]> {
    this.aborted = false;

    // Listen for abort signal
    signal.addEventListener("abort", () => {
      console.log("[TreemapExplorer] Abort signal received");
      this.aborted = true;
    });

    // Check if already aborted before starting
    if (signal.aborted) {
      console.log("[TreemapExplorer] Already aborted before processing");
      throw new DOMException("Operation aborted", "AbortError");
    }

    // Use the regular processData implementation
    // The methods will check this.aborted periodically
    return this.processData(dataset, _config);
  }

  // ============================================================================
  // Core Plugin Methods
  // ============================================================================

  init(container: HTMLElement, _config: TreemapExplorerState): void {
    this.container = container;
    this.container.innerHTML = "";
    this.container.className = "relative w-full h-full bg-zinc-950";
  }

  processData(
    dataset: Record<string, any>,
    _config?: TreemapExplorerState,
  ): EnrichedFileData[] {
    // 1. Load core file metadata (required)
    const fileIndex = dataset.file_index;
    if (!fileIndex) {
      console.error("file_index is required for Treemap Explorer");
      return [];
    }

    // PHASE 2: Check abort before processing
    if (this.aborted) {
      console.log("[TreemapExplorer] Aborted before file enrichment");
      throw new DOMException("Operation aborted", "AbortError");
    }

    // 2. Process base file data
    this.data = DataProcessor.enrichFiles(fileIndex);

    // PHASE 2: Check abort after enrichment
    if (this.aborted) {
      console.log("[TreemapExplorer] Aborted after file enrichment");
      throw new DOMException("Operation aborted", "AbortError");
    }

    // 3. Load optional coupling data
    const cochangeNetwork = dataset.cochange_network;
    if (cochangeNetwork) {
      CouplingDataProcessor.enrichWithCoupling(this.data, cochangeNetwork);
      this.couplingIndex = CouplingDataProcessor.process(cochangeNetwork);
    }

    // PHASE 2: Check abort after coupling
    if (this.aborted) {
      console.log("[TreemapExplorer] Aborted after coupling processing");
      throw new DOMException("Operation aborted", "AbortError");
    }

    // 4. Load optional temporal data
    this.temporalData = dataset.temporal_daily;
    if (this.temporalData) {
      this.dateRange = TemporalDataProcessor.getDateRange(this.temporalData);
    }

    return this.data;
  }

  render(data: EnrichedFileData[], state: TreemapExplorerState): void {
    if (!this.container) return;

    // PHASE 2: Check abort before rendering
    if (this.aborted) {
      console.log("[TreemapExplorer] Aborted - skipping render");
      return;
    }

    this.container.innerHTML = "";

    // Create SVG
    const svg = d3
      .select(this.container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block");

    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Initialize Arc Renderer
    this.arcRenderer = new CouplingArcRenderer(svg);

    // Prepare data based on lens mode
    let enrichedData: EnrichedFileData[] | TemporalFileData[] = data;

    // Enrich with temporal data for Time Lens
    if (state.lensMode === "time" && this.temporalData) {
      const timePosition = state.timePosition ?? 100;
      enrichedData = TemporalDataProcessor.enrichFilesWithTemporal(
        data,
        this.temporalData,
        timePosition,
      );
    }

    // Filter data based on thresholds
    const filteredData = this.filterData(enrichedData, state);

    // PHASE 2: Check abort before layout calculation
    if (this.aborted) {
      console.log("[TreemapExplorer] Aborted - skipping layout calculation");
      return;
    }

    // Calculate treemap layout
    const root = d3
      .hierarchy({ children: filteredData } as any)
      .sum((d: any) => this.getSizeValue(d, state.sizeMetric))
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3
      .treemap<any>()
      .size([width, height])
      .paddingInner(2)
      .paddingOuter(4)
      .round(true);

    treemapLayout(root);

    // PHASE 2: Check abort before rendering cells
    if (this.aborted) {
      console.log("[TreemapExplorer] Aborted - skipping cell rendering");
      return;
    }

    // Render cells
    const cells = root.leaves() as d3.HierarchyRectangularNode<any>[];

    const cellGroups = svg
      .selectAll("g")
      .data(cells)
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    cellGroups
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      // FIX: Access d.data directly (it is the EnrichedFileData object)
      .attr("fill", (d) => this.getCellColor(d.data as EnrichedFileData, state))
      .attr("stroke", (d) =>
        state.selectedFile === (d.data as EnrichedFileData).key
          ? "#fff"
          : "#000",
      )
      .attr("stroke-width", (d) =>
        state.selectedFile === (d.data as EnrichedFileData).key ? 3 : 1,
      )
      .style("cursor", "pointer")
      .style("opacity", (d) => {
        const fileData = d.data as EnrichedFileData;
        if (
          state.selectedFile &&
          state.lensMode === "coupling" &&
          state.selectedFile !== fileData.key
        ) {
          return "0.1";
        }
        return "1";
      })
      .on("click", (_event, d) => {
        const config = state as any;
        if (config.onCellClick) {
          config.onCellClick(d.data);
        }
      });

    // Add labels for larger cells
    cellGroups
      .filter((d) => d.x1 - d.x0 > 40 && d.y1 - d.y0 > 20)
      .append("text")
      .attr("x", (d) => (d.x1 - d.x0) / 2)
      .attr("y", (d) => (d.y1 - d.y0) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "10")
      .attr("font-family", "monospace")
      .style("pointer-events", "none")
      .text((d) => (d.data as EnrichedFileData).key.split("/").pop() || "");

    // Render coupling arcs if in coupling mode and file selected
    if (state.lensMode === "coupling" && state.selectedFile && state.showArcs) {
      this.arcRenderer.render(
        state.selectedFile,
        cells,
        this.couplingIndex,
        state.couplingThreshold || 0.03,
      );
    }
  }

  update(data: EnrichedFileData[], config: TreemapExplorerState): void {
    this.render(data, config);
  }

  destroy(): void {
    this.stopPlayback();
    if (this.arcRenderer) {
      this.arcRenderer.destroy();
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  async exportImage(_options: ExportOptions): Promise<Blob> {
    return new Blob();
  }

  exportData(_options: ExportOptions): any {
    return this.data;
  }

  // Helper methods for internal use
  getCouplingIndex() {
    return this.couplingIndex;
  }

  // Explicitly cast props to satisfy the interface contravariance requirement
  renderControls(props: PluginControlProps<Record<string, unknown>>) {
    const typedProps = props as PluginControlProps<TreemapExplorerState>;
    return (
      <TreemapExplorerControls
        state={typedProps.state}
        updateState={typedProps.updateState}
        data={typedProps.data}
      />
    );
  }

  renderFilters(
    props: PluginControlProps<Record<string, unknown>> & {
      onClose: () => void;
    },
  ) {
    const typedProps = props as PluginControlProps<TreemapExplorerState> & {
      onClose: () => void;
    };
    return (
      <TreemapExplorerFilters
        state={typedProps.state}
        onStateChange={typedProps.updateState}
        onClose={typedProps.onClose}
      />
    );
  }

  // Helper methods

  private filterData(
    data: EnrichedFileData[] | TemporalFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    let filtered = [...data];

    // Debt lens: filter by health threshold
    if (state.lensMode === "debt" && state.healthThreshold !== undefined) {
      filtered = filtered.filter((f) => {
        const score = f.healthScore?.score ?? 100;
        return score <= state.healthThreshold!;
      });
    }

    // Time lens: hide files not yet created
    if (state.lensMode === "time") {
      const timePosition = state.timePosition ?? 100;
      filtered = filtered.filter((f: any) => {
        if ("createdPosition" in f) {
          return f.createdPosition <= timePosition;
        }
        return true;
      });
    }

    return filtered as EnrichedFileData[];
  }

  private getSizeValue(file: any, metric: string): number {
    switch (metric) {
      case "commits":
        return file.total_commits || 0;
      case "authors":
        return file.unique_authors || 0;
      case "events":
        return file.lifecycle_event_count || 0;
      default:
        return file.total_commits || 0;
    }
  }

  private getCellColor(
    file: EnrichedFileData | TemporalFileData,
    state: TreemapExplorerState,
  ): string {
    return getCellColor(file, state.lensMode, {
      couplingThreshold: state.couplingThreshold,
      timePosition: state.timePosition,
      timeFilters: state.timeFilters,
    });
  }

  private startPlayback(
    state: TreemapExplorerState,
    updateState: (updates: Partial<TreemapExplorerState>) => void,
  ): void {
    this.stopPlayback();

    this.playbackInterval = window.setInterval(() => {
      const currentPosition = state.timePosition ?? 0;
      const newPosition = Math.min(currentPosition + 0.5, 100);

      if (newPosition >= 100) {
        updateState({ timePosition: 100, playing: false });
        this.stopPlayback();
      } else {
        updateState({ timePosition: newPosition });
      }
    }, 100); // Update every 100ms
  }

  private stopPlayback(): void {
    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  // Required for the new UI pattern
  renderUI(
    state: TreemapExplorerState,
    updateState: (updates: Partial<TreemapExplorerState>) => void,
  ): JSX.Element {
    const selectedFile = this.data.find((f) => f.key === state.selectedFile);

    return (
      <>
        <TreemapExplorerControls
          state={state}
          updateState={updateState}
          data={this.data}
        />

        <TreemapExplorerFilters
          state={state}
          onStateChange={updateState}
          onClose={() => {}}
        />

        {selectedFile && (
          <TreemapDetailPanel
            file={selectedFile}
            lensMode={state.lensMode}
            onClose={() => updateState({ selectedFile: null })}
          />
        )}

        {/* Timeline Scrubber for Time Lens */}
        {state.lensMode === "time" && this.dateRange && (
          <TimelineScrubber
            minDate={this.dateRange.min}
            maxDate={this.dateRange.max}
            currentPosition={state.timePosition ?? 100}
            visible={true}
            onPositionChange={(position) => {
              updateState({ timePosition: position });
            }}
            onPlayToggle={() => {
              const isPlaying = !state.playing;
              updateState({ playing: isPlaying });

              if (isPlaying) {
                this.startPlayback(state, updateState);
              } else {
                this.stopPlayback();
              }
            }}
            playing={state.playing ?? false}
          />
        )}
      </>
    );
  }
}
