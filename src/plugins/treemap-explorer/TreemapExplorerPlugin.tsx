// src/plugins/treemap-explorer/TreemapExplorerPlugin.tsx

import {
  VisualizationPlugin,
  PluginControlProps,
  ExportOptions,
} from "@/types/plugin";
import * as d3 from "d3";
import { V2FileIndex } from "@/services/data/DataProcessor";
import { CouplingDataProcessor } from "@/services/data/CouplingDataProcessor";
import {
  TemporalDataProcessor,
  TemporalDailyData,
  DateRangeConfidence,
} from "@/services/data/TemporalDataProcessor";
import { HealthScoreCalculator } from "@/services/data/HealthScoreCalculator";
import { TreemapExplorerControls } from "./components/TreemapExplorerControls";
import { TreemapExplorerFilters } from "./components/TreemapExplorerFilters";
import TimelineScrubber from "./components/TimelineScrubber";
import { CouplingArcRenderer } from "./renderers/CouplingArcRenderer";
import { EnrichedFileData, TreemapExplorerState } from "./types";
import { ProjectHierarchyNode, FileMetrics } from "@/types/domain";

import { BaseTreemapRenderer } from "./renderers/BaseTreemapRenderer";
import { DebtRenderer } from "./renderers/DebtRenderer";
import { CouplingRenderer } from "./renderers/CouplingRenderer";
import { TimeRenderer } from "./renderers/TimeRenderer";

export class TreemapExplorerPlugin implements VisualizationPlugin<TreemapExplorerState> {
  metadata = {
    id: "treemap-explorer",
    name: "Treemap Explorer",
    description: "Multi-lens code health, coupling, and temporal analysis",
    version: "2.4.0",
    priority: 2,
    dataRequirements: [
      {
        dataset: "project_hierarchy",
        required: true,
        alias: "project_hierarchy",
      },
      {
        dataset: "file_metrics_index",
        required: true,
        alias: "file_metrics_index",
      },
      {
        dataset: "file_index",
        required: true,
        alias: "file_index",
      },
      {
        dataset: "cochange_network",
        required: false,
        alias: "cochange_network",
      },
      { dataset: "temporal_daily", required: false, alias: "temporal_daily" },
      {
        dataset: "file_lifecycle",
        required: false,
        alias: "file_lifecycle",
      },
      {
        dataset: "temporal_activity_map",
        required: false,
        alias: "temporal_activity_map",
      },
    ],
  };

  defaultConfig: TreemapExplorerState = {
    lensMode: "debt",
    sizeMetric: "commits",
    selectedFile: null,
    healthThreshold: 100,
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
  private timelineCache: Map<string, Array<{ date: string; commits: number }>> =
    new Map();
  private temporalDataReady: boolean = false;

  private debtRenderer: DebtRenderer | null = null;
  private couplingRenderer: CouplingRenderer | null = null;
  private timeRenderer: TimeRenderer | null = null;

  getInitialState(): TreemapExplorerState {
    return { ...this.defaultConfig };
  }

  cleanup(): void {
    console.log("[TreemapExplorer] Cleanup called - aborting operations");
    this.stopPlayback();
    this.temporalDataReady = false;

    this.debtRenderer?.cleanup();
    this.couplingRenderer?.cleanup();
    this.timeRenderer?.cleanup();

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

  init(container: HTMLElement, _config: TreemapExplorerState): void {
    console.log("[TreemapExplorer] DEBUG - init() called");
    this.container = container;
    this.container.innerHTML = "";
    this.container.className = "relative w-full h-full bg-zinc-950";

    this.createTooltip();

    console.log(
      "[TreemapExplorer] DEBUG - Creating renderers, container:",
      !!this.container,
      "tooltip:",
      !!this.tooltip,
    );
    if (this.container && this.tooltip) {
      this.debtRenderer = new DebtRenderer(this.container, this.tooltip);
      this.couplingRenderer = new CouplingRenderer(
        this.container,
        this.tooltip,
      );
      this.timeRenderer = new TimeRenderer(this.container, this.tooltip);
      console.log("[TreemapExplorer] DEBUG - Renderers created:", {
        debt: !!this.debtRenderer,
        coupling: !!this.couplingRenderer,
        time: !!this.timeRenderer,
      });
    } else {
      console.error(
        "[TreemapExplorer] DEBUG - Failed to create renderers! Container:",
        !!this.container,
        "Tooltip:",
        !!this.tooltip,
      );
    }
  }

  private createTooltip(): void {
    if (this.tooltip) {
      this.tooltip.remove();
    }

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

  /**
   * Helper to compute days since last modification
   */
  private computeDaysSince(isoDateString: string | undefined): number {
    if (!isoDateString) return 0;
    const lastModified = new Date(isoDateString);
    const now = new Date();
    const diffMs = now.getTime() - lastModified.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  processData(
    dataset: Record<string, any>,
    _config?: TreemapExplorerState,
  ): EnrichedFileData[] {
    // DEBUG: Log what datasets are available
    console.log(
      "[TreemapExplorer] DEBUG - Available datasets:",
      Object.keys(dataset),
    );

    if (
      dataset.project_hierarchy &&
      dataset.file_metrics_index &&
      dataset.file_index
    ) {
      const hierarchy = dataset.project_hierarchy as {
        tree: ProjectHierarchyNode;
      };
      const metrics = dataset.file_metrics_index as Record<string, FileMetrics>;
      const fileIndex = dataset.file_index as V2FileIndex;

      const enrichedFiles: EnrichedFileData[] = [];

      const traverse = (node: ProjectHierarchyNode) => {
        if (node.type === "file") {
          const metric = metrics[node.path];
          const fileStats = fileIndex.files[node.path];

          if (metric && fileStats) {
            const partners = metric.coupling.top_partners;
            const avgStrength =
              partners.length > 0
                ? partners.reduce((sum, p) => sum + p.strength, 0) /
                  partners.length
                : 0;

            // Extract real operations from file_index
            const realOperations = {
              M: 0,
              A: 0,
              D: 0,
              R: 0,
              ...fileStats.operations,
            };

            // Compute days since last modification for age factor
            const lastModifiedDaysAgo = this.computeDaysSince(
              fileStats.last_modified,
            );

            // Compute health factors breakdown client-side
            const healthFactors = HealthScoreCalculator.calculate({
              totalCommits: fileStats.total_commits,
              uniqueAuthors: fileStats.unique_authors ?? 1,
              operations: realOperations,
              ageDays: fileStats.age_days ?? 0,
              lastModifiedDaysAgo: lastModifiedDaysAgo,
            });

            // Build complete health score object
            const healthScore = node.attributes
              ? {
                  score: node.attributes.health_score,
                  category: node.attributes.health_category as
                    | "healthy"
                    | "medium"
                    | "critical",
                  churnRate: node.attributes.churn_rate,
                  busFactor: node.attributes.bus_factor_status as
                    | "low-risk"
                    | "medium-risk"
                    | "high-risk",
                  factors: healthFactors.factors,
                }
              : undefined;

            enrichedFiles.push({
              key: node.path,
              name: node.name,
              path: node.path,
              total_commits: metric.volume.total_commits,
              unique_authors: fileStats.unique_authors ?? 1,
              lifecycle_event_count: fileStats.lifecycle_event_count ?? 0,
              primary_author: fileStats.primary_author
                ? {
                    email: fileStats.primary_author.email,
                    commit_count: fileStats.primary_author.commit_count,
                    percentage: fileStats.primary_author.percentage,
                  }
                : undefined,
              healthScore: healthScore,
              couplingScore: metric.coupling.max_strength,
              couplingMetrics: {
                maxStrength: metric.coupling.max_strength,
                avgStrength: avgStrength,
                totalPartners: metric.coupling.top_partners.length,
                strongCouplings: metric.coupling.top_partners.filter(
                  (p) => p.strength > 0.5,
                ).length,
              },
              coupledFiles: metric.coupling.top_partners.map((p) => ({
                file: p.path,
                strength: p.strength,
                cochangeCount: p.cochange_count,
              })),
              first_seen: fileStats.first_seen,
              last_modified: fileStats.last_modified,
              age_days: fileStats.age_days,
              operations: realOperations,
            });
          }
        }
        node.children?.forEach(traverse);
      };

      traverse(hierarchy.tree);
      this.data = enrichedFiles;

      // Use full cochange_network if available
      if (dataset.cochange_network) {
        this.couplingIndex = CouplingDataProcessor.process(
          dataset.cochange_network,
        );

        enrichedFiles.forEach((file) => {
          const couplingData = this.couplingIndex.get(file.key);
          if (couplingData) {
            file.maxCoupling = couplingData.maxStrength;
          }
        });

        if (this.couplingRenderer) {
          this.couplingRenderer.setCouplingIndex(this.couplingIndex);
        }
      } else {
        // Fallback: Build lossy index from file_metrics_index
        this.couplingIndex = new Map();

        enrichedFiles.forEach((file) => {
          if (file.coupledFiles) {
            const partners = file.coupledFiles.map((p) => ({
              filePath: p.file,
              strength: p.strength,
              cochangeCount: p.cochangeCount,
            }));

            const maxStrength = file.couplingMetrics?.maxStrength || 0;
            const totalPartners = partners.length;
            const avgStrength =
              totalPartners > 0
                ? partners.reduce((sum, p) => sum + p.strength, 0) /
                  totalPartners
                : 0;

            this.couplingIndex.set(file.key, {
              filePath: file.key,
              partners: partners,
              maxStrength: maxStrength,
              avgStrength: avgStrength,
              totalPartners: totalPartners,
            });
          }
        });

        if (this.couplingRenderer) {
          this.couplingRenderer.setCouplingIndex(this.couplingIndex);
        }
      }

      // NEW LOGIC START: Calculate date range BEFORE precomputing timelines
      this.temporalData = dataset.temporal_daily;

      // Try to get range from temporal data first
      let dateRangeResult = TemporalDataProcessor.getDateRange(
        this.temporalData as TemporalDailyData,
      );

      // If low confidence and we have file metadata, try to calculate better range
      if (
        dateRangeResult.confidence === DateRangeConfidence.LOW &&
        enrichedFiles.length > 0
      ) {
        const calculatedRange =
          TemporalDataProcessor.calculateRangeFromFiles(enrichedFiles);
        if (calculatedRange) {
          dateRangeResult = calculatedRange;
        }
      }

      // Store the date range (now always set)
      this.dateRange = {
        min: dateRangeResult.min,
        max: dateRangeResult.max,
      };

      // Log the confidence level
      if (dateRangeResult.confidence !== DateRangeConfidence.HIGH) {
        console.warn(
          `[TreemapExplorer] Using ${dateRangeResult.confidence} confidence date range from ${dateRangeResult.source}`,
        );
      }

      // Pre-compute activity timelines if file_lifecycle available
      if (dataset.file_lifecycle) {
        console.log("[TreemapExplorer] DEBUG - file_lifecycle status:", {
          exists: !!dataset.file_lifecycle,
          hasFiles: !!dataset.file_lifecycle.files,
          fileCount: dataset.file_lifecycle.files
            ? Object.keys(dataset.file_lifecycle.files).length
            : 0,
          samplePaths: dataset.file_lifecycle.files
            ? Object.keys(dataset.file_lifecycle.files).slice(0, 3)
            : [],
        });
        console.log(
          "[TreemapExplorer] DEBUG - enrichedFiles sample paths:",
          enrichedFiles.slice(0, 3).map((f) => f.path),
        );

        console.log(
          "[TreemapExplorer] Pre-computing activity timelines from file_lifecycle",
        );

        // UPDATED: Pass the global date range to precomputeTimelines
        this.timelineCache = TemporalDataProcessor.precomputeTimelines(
          enrichedFiles,
          dataset.file_lifecycle,
          4, // bucketWeeks (ignored if global range provided)
          this.dateRange, // Pass global range for unified timeline
        );

        enrichedFiles.forEach((file) => {
          const timeline = this.timelineCache.get(file.key);
          if (timeline) {
            file.activityTimeline = timeline;
          }
        });
      }

      // DEBUG: Check temporal data loading
      console.log("[TreemapExplorer] DEBUG - temporal_daily status:", {
        exists: !!dataset.temporal_daily,
        hasData: dataset.temporal_daily
          ? Object.keys(dataset.temporal_daily.days || {}).length
          : 0,
        timeRendererExists: !!this.timeRenderer,
        fallbackApplied: !dataset.temporal_daily && !!this.temporalData,
      });

      // Set temporal data on time renderer
      if (this.timeRenderer) {
        console.log(
          "[TreemapExplorer] Setting temporal data on TimeRenderer in processData",
        );
        this.timeRenderer.setTemporalData(
          this.temporalData,
          this.timelineCache,
        );
        this.temporalDataReady = true;
        console.log("[TreemapExplorer] Temporal data marked as ready");
      } else {
        console.warn(
          "[TreemapExplorer] TimeRenderer not initialized yet - will set temporal data during render",
        );
      }

      return this.data;
    }
    // Safety return - should never be reached as required datasets are always registered
    console.error(
      "[TreemapExplorer] Required datasets missing - cannot process data",
    );
    return [];
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

    // (Fallback in case processData was called before init)
    if (state.lensMode === "time" && this.timeRenderer && this.temporalData) {
      console.log(
        "[TreemapExplorer] DEBUG - Ensuring temporal data is set on TimeRenderer before render",
      );
      this.timeRenderer.setTemporalData(this.temporalData, this.timelineCache);
    }

    // Use unified renderer system for all lenses
    console.log(`[TreemapExplorer] Rendering with ${state.lensMode} lens`);
    this.renderWithUnifiedSystem(data, state);
  }

  private renderWithUnifiedSystem(
    data: EnrichedFileData[],
    state: TreemapExplorerState,
  ): void {
    if (!this.container) return;

    this.container.innerHTML = "";

    // Get appropriate renderer
    const renderer = this.getRenderer(state.lensMode);
    if (!renderer) {
      console.error(`No renderer available for lens mode: ${state.lensMode}`);
      return;
    }

    // Pipeline: enrich → filter → layout → render
    const enrichedData = renderer.enrichData(data, state);
    const filteredData = renderer.filterData(enrichedData, state);

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

    // Create SVG
    const svg = d3
      .select(this.container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block");

    const rect = this.container.getBoundingClientRect();
    const width = rect.width;

    // RESERVED SPACE: Subtract timeline scrubber height when in time lens mode
    // This prevents the scrubber from obscuring bottom treemap cells
    const TIMELINE_SCRUBBER_HEIGHT = 80; // Matches h-20 (5rem) in TimelineScrubber.tsx
    const height =
      state.lensMode === "time"
        ? rect.height - TIMELINE_SCRUBBER_HEIGHT
        : rect.height;

    // Build treemap layout with adjusted height
    const cells = renderer["buildTreemapLayout"](
      filteredData,
      width,
      height,
      state.sizeMetric,
    );

    // Render cells
    renderer.renderCells(svg, cells, state, (file) => {
      const config = state as any;
      if (config.onCellClick) {
        config.onCellClick(file);
      }
    });

    // Render lens-specific extras
    renderer.renderExtras(svg, cells, state);
  }

  private getRenderer(lensMode: string): BaseTreemapRenderer | null {
    switch (lensMode) {
      case "debt":
        return this.debtRenderer;
      case "coupling":
        return this.couplingRenderer;
      case "time":
        return this.timeRenderer;
      default:
        return null;
    }
  }

  update(data: EnrichedFileData[], config: TreemapExplorerState): void {
    this.render(data, config);
  }

  destroy(): void {
    this.stopPlayback();

    // Cleanup all renderers
    this.debtRenderer?.cleanup();
    this.couplingRenderer?.cleanup();
    this.timeRenderer?.cleanup();

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

  renderOverlay(props: PluginControlProps<TreemapExplorerState>) {
    // DEBUG: Check dateRange value
    console.log("[TreemapExplorer] renderOverlay - dateRange:", this.dateRange);

    const { state, updateState } = props;

    // Only render if we have a valid date range and data is ready
    if (!this.temporalDataReady || !this.dateRange) {
      console.log("[TreemapExplorer] renderOverlay - Not ready yet", {
        temporalDataReady: this.temporalDataReady,
        dateRange: !!this.dateRange,
      });
      return null;
    }

    return (
      <TimelineScrubber
        minDate={this.dateRange.min}
        maxDate={this.dateRange.max}
        currentPosition={state.timePosition ?? 100}
        visible={state.lensMode === "time"}
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
    );
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
}
