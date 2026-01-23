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
    version: "2.2.0", // Bumped for tooltip feature
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
  private tooltip: HTMLElement | null = null;
  private data: EnrichedFileData[] = [];
  private temporalData: TemporalDailyData | null = null;
  private dateRange: { min: string; max: string } | null = null;
  private playbackInterval: number | null = null;
  private arcRenderer: CouplingArcRenderer | null = null;
  private couplingIndex: Map<string, any> = new Map();
  private currentSignal: AbortSignal | null = null;

  getInitialState(): TreemapExplorerState {
    return { ...this.defaultConfig };
  }

  // ============================================================================
  // PHASE 2: Lifecycle Methods
  // ============================================================================

  cleanup(): void {
    console.log("[TreemapExplorer] Cleanup called - aborting operations");
    this.stopPlayback();
    if (this.arcRenderer) {
      this.arcRenderer.destroy();
    }
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  async processDataCancellable(
    dataset: Record<string, any>,
    signal: AbortSignal,
    _config?: TreemapExplorerState,
  ): Promise<EnrichedFileData[]> {
    this.currentSignal = signal;

    if (signal.aborted) {
      console.log("[TreemapExplorer] Already aborted before processing");
      throw new DOMException("Operation aborted", "AbortError");
    }

    return this.processData(dataset, _config);
  }

  // ============================================================================
  // Core Plugin Methods
  // ============================================================================

  init(container: HTMLElement, _config: TreemapExplorerState): void {
    this.container = container;
    this.container.innerHTML = "";
    this.container.className = "relative w-full h-full bg-zinc-950";

    // Create tooltip element using Popover API
    this.createTooltip();
  }

  private createTooltip(): void {
    // Remove existing tooltip if any
    if (this.tooltip) {
      this.tooltip.remove();
    }

    // Create tooltip container with Popover API
    this.tooltip = document.createElement("div");
    this.tooltip.id = "treemap-tooltip";
    this.tooltip.setAttribute("popover", "manual");
    this.tooltip.style.margin = "0";
    this.tooltip.style.border = "none";
    this.tooltip.style.padding = "0";
    this.tooltip.style.background = "transparent";

    this.tooltip.innerHTML = `
      <div class="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 text-white max-w-sm">
        <div class="font-mono text-xs text-zinc-400 mb-1" id="tooltip-path"></div>
        <div class="font-semibold text-sm mb-3" id="tooltip-name"></div>
        
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-zinc-400">Commits:</span>
            <span class="font-mono" id="tooltip-commits"></span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">Authors:</span>
            <span class="font-mono" id="tooltip-authors"></span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-400">Health Score:</span>
            <span class="font-mono" id="tooltip-health"></span>
          </div>
          <div class="flex justify-between" id="tooltip-coupling-row" style="display: none;">
            <span class="text-zinc-400">Coupling:</span>
            <span class="font-mono" id="tooltip-coupling"></span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.tooltip);
  }

  private showTooltip(
    event: MouseEvent,
    file: EnrichedFileData,
    state: TreemapExplorerState,
  ): void {
    if (!this.tooltip) return;

    // Populate tooltip content
    const pathEl = this.tooltip.querySelector("#tooltip-path") as HTMLElement;
    const nameEl = this.tooltip.querySelector("#tooltip-name") as HTMLElement;
    const commitsEl = this.tooltip.querySelector(
      "#tooltip-commits",
    ) as HTMLElement;
    const authorsEl = this.tooltip.querySelector(
      "#tooltip-authors",
    ) as HTMLElement;
    const healthEl = this.tooltip.querySelector(
      "#tooltip-health",
    ) as HTMLElement;
    const couplingRowEl = this.tooltip.querySelector(
      "#tooltip-coupling-row",
    ) as HTMLElement;
    const couplingEl = this.tooltip.querySelector(
      "#tooltip-coupling",
    ) as HTMLElement;

    if (pathEl && nameEl && commitsEl && authorsEl && healthEl) {
      const pathParts = file.key.split("/");
      const fileName = pathParts.pop() || "";
      const filePath = pathParts.join("/");

      pathEl.textContent = filePath || "/";
      nameEl.textContent = fileName;
      commitsEl.textContent = file.total_commits?.toString() || "0";
      authorsEl.textContent = file.unique_authors?.toString() || "0";
      healthEl.textContent = `${file.healthScore?.score?.toFixed(0) || "100"}/100`;

      // Show coupling info if in coupling mode
      if (state.lensMode === "coupling" && file.couplingScore !== undefined) {
        couplingRowEl.style.display = "flex";
        couplingEl.textContent = file.couplingScore.toFixed(3);
      } else {
        couplingRowEl.style.display = "none";
      }
    }

    // Show popover
    (this.tooltip as any).showPopover();

    // Position tooltip
    this.positionTooltip(event);
  }

  private positionTooltip(event: MouseEvent): void {
    if (!this.tooltip) return;

    const tooltipRect = this.tooltip.getBoundingClientRect();
    const padding = 12;

    let left = event.clientX + padding;
    let top = event.clientY + padding;

    // Prevent tooltip from going off-screen (right)
    if (left + tooltipRect.width > window.innerWidth) {
      left = event.clientX - tooltipRect.width - padding;
    }

    // Prevent tooltip from going off-screen (bottom)
    if (top + tooltipRect.height > window.innerHeight) {
      top = event.clientY - tooltipRect.height - padding;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      (this.tooltip as any).hidePopover();
    }
  }

  processData(
    dataset: Record<string, any>,
    _config?: TreemapExplorerState,
  ): EnrichedFileData[] {
    const fileIndex = dataset.file_index;
    if (!fileIndex) {
      console.error("file_index is required for Treemap Explorer");
      return [];
    }

    if (this.currentSignal?.aborted) {
      console.log("[TreemapExplorer] Aborted before file enrichment");
      throw new DOMException("Operation aborted", "AbortError");
    }

    this.data = DataProcessor.enrichFiles(fileIndex);

    if (this.currentSignal?.aborted) {
      console.log("[TreemapExplorer] Aborted after file enrichment");
      throw new DOMException("Operation aborted", "AbortError");
    }

    const cochangeNetwork = dataset.cochange_network;
    if (cochangeNetwork) {
      CouplingDataProcessor.enrichWithCoupling(this.data, cochangeNetwork);
      this.couplingIndex = CouplingDataProcessor.process(cochangeNetwork);
    }

    if (this.currentSignal?.aborted) {
      console.log("[TreemapExplorer] Aborted after coupling processing");
      throw new DOMException("Operation aborted", "AbortError");
    }

    this.temporalData = dataset.temporal_daily;
    if (this.temporalData) {
      this.dateRange = TemporalDataProcessor.getDateRange(this.temporalData);
    }

    return this.data;
  }

  render(data: EnrichedFileData[], state: TreemapExplorerState): void {
    if (!this.container) return;

    if (!Array.isArray(data)) {
      console.error("[TreemapExplorer] Received invalid data format:", data);
      return;
    }

    if (this.currentSignal?.aborted) {
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

    // Prepare data based on lens mode
    let enrichedData: EnrichedFileData[] | TemporalFileData[] = data;

    if (state.lensMode === "time" && this.temporalData) {
      const timePosition = state.timePosition ?? 100;
      enrichedData = TemporalDataProcessor.enrichFilesWithTemporal(
        data,
        this.temporalData,
        timePosition,
      );
    }

    // Filter data
    const filteredData = this.filterData(enrichedData, state);

    if (filteredData.length === 0) {
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-full text-zinc-500">
          <div class="text-center">
            <p class="mb-2">No files match the current filters</p>
            <p class="text-sm opacity-75">Try adjusting the health threshold or lens settings</p>
          </div>
        </div>
      `;
      return;
    }

    if (this.currentSignal?.aborted) {
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

    if (this.currentSignal?.aborted) {
      console.log("[TreemapExplorer] Aborted - skipping cell rendering");
      return;
    }

    // Render cells WITHOUT text labels
    const cells = root.leaves() as d3.HierarchyRectangularNode<any>[];

    const cellGroups = svg
      .selectAll("g.cell-group")
      .data(cells)
      .join("g")
      .attr("class", "cell-group")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    cellGroups
      .append("rect")
      .attr("data-viz", "treemap-cell")
      .attr("data-file-key", (d) => (d.data as EnrichedFileData).key)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
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
      .style("transition", "stroke 0.2s, stroke-width 0.2s")
      .on("mouseenter", (event, d) => {
        const rect = event.currentTarget;
        d3.select(rect).attr("stroke", "#fff").attr("stroke-width", 3);

        this.showTooltip(event, d.data as EnrichedFileData, state);
      })
      .on("mousemove", (event) => {
        this.positionTooltip(event);
      })
      .on("mouseleave", (event, d) => {
        const rect = event.currentTarget;
        const fileData = d.data as EnrichedFileData;

        d3.select(rect)
          .attr("stroke", state.selectedFile === fileData.key ? "#fff" : "#000")
          .attr("stroke-width", state.selectedFile === fileData.key ? 3 : 1);

        this.hideTooltip();
      })
      .on("click", (_event, d) => {
        const config = state as any;
        if (config.onCellClick) {
          config.onCellClick(d.data);
        }
      });

    // NO TEXT LABELS - removed entirely for cleaner visualization

    // Initialize Arc Renderer
    this.arcRenderer = new CouplingArcRenderer(svg);

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
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
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

  getCouplingIndex() {
    return this.couplingIndex;
  }

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

  private filterData(
    data: EnrichedFileData[] | TemporalFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    let filtered = [...data];

    if (state.lensMode === "debt" && state.healthThreshold !== undefined) {
      filtered = filtered.filter((f) => {
        const score = f.healthScore?.score ?? 100;
        return score <= state.healthThreshold!;
      });
    }

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
    }, 100);
  }

  private stopPlayback(): void {
    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

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
            couplingIndex={this.couplingIndex}
            couplingThreshold={state.couplingThreshold}
            onClose={() => updateState({ selectedFile: null })}
          />
        )}
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
