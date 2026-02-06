// src/plugins/treemap-explorer/renderers/BaseTreemapRenderer.ts

import * as d3 from "d3";
import { EnrichedFileData, TreemapExplorerState } from "../types";

/**
 * Abstract base class for lens-specific treemap renderers
 * Provides shared layout logic and defines interface for lens customization
 */
export abstract class BaseTreemapRenderer<
  TState extends TreemapExplorerState = TreemapExplorerState,
> {
  protected container: HTMLElement;
  protected tooltip: HTMLElement | null;

  // Track base initialization
  protected baseInitialized: boolean = true;

  constructor(container: HTMLElement, tooltip: HTMLElement | null) {
    this.container = container;
    this.tooltip = tooltip;

    if (!container) {
      console.error("[BaseTreemapRenderer] Missing required container", {
        container: !!container,
        tooltip: !!tooltip,
      });
      this.baseInitialized = false;
    }
  }

  /**
   * Validation helper for derived classes
   */
  protected ensureBaseInitialized(methodName: string): void {
    if (!this.baseInitialized) {
      throw new Error(
        `[BaseTreemapRenderer] ${methodName}() called with invalid container/tooltip. ` +
          `Ensure renderer is properly constructed.`,
      );
    }
  }

  /**
   * Enrich base file data with lens-specific calculations
   * Example: Time lens adds temporal context, Coupling lens adds coupling metrics
   */
  abstract enrichData(
    data: EnrichedFileData[],
    state: TState,
    additionalContext?: any,
  ): EnrichedFileData[];

  /**
   * Filter data based on lens-specific criteria
   * Example: Debt lens filters by health threshold, Time lens filters by timeline position
   */
  abstract filterData(
    data: EnrichedFileData[],
    state: TState,
  ): EnrichedFileData[];

  /**
   * Calculate cell color based on lens-specific logic
   * Example: Debt=health score, Coupling=strength, Time=creation date
   */
  abstract getCellColor(file: EnrichedFileData, state: TState): string;

  /**
   * Render lens-specific extras (overlays, annotations, etc.)
   * Example: Coupling lens renders arc lines between files
   */
  abstract renderExtras(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    cells: d3.HierarchyRectangularNode<any>[],
    state: TState,
  ): void;

  /**
   * Cleanup lens-specific resources
   */
  abstract cleanup(): void;

  /**
   * Get lens-specific tooltip content
   */
  abstract getTooltipContent(
    file: EnrichedFileData,
    state: TState,
  ): {
    show: boolean;
    additionalRows?: Array<{ label: string; value: string }>;
  };

  /**
   * Shared treemap layout calculation
   * Used by all lens renderers
   */
  protected buildTreemapLayout(
    data: EnrichedFileData[],
    width: number,
    height: number,
    sizeMetric: string,
  ): d3.HierarchyRectangularNode<any>[] {
    this.ensureBaseInitialized("buildTreemapLayout");

    const root = d3
      .hierarchy({ children: data } as any)
      .sum((d: any) => this.getSizeValue(d, sizeMetric))
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3
      .treemap<any>()
      .size([width, height])
      .paddingInner(2)
      .paddingOuter(4)
      .round(true);

    treemapLayout(root);

    return root.leaves() as d3.HierarchyRectangularNode<any>[];
  }

  /**
   * Get numeric size value for a given metric
   */
  protected getSizeValue(file: any, metric: string): number {
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

  /**
   * Render treemap cells (shared by all lenses)
   * Delegates color calculation to lens-specific implementation
   */
  renderCells(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    cells: d3.HierarchyRectangularNode<any>[],
    state: TState,
    onCellClick?: (file: EnrichedFileData) => void,
  ): void {
    this.ensureBaseInitialized("renderCells");

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
      .style("opacity", (d) =>
        this.getCellOpacity(d.data as EnrichedFileData, state),
      )
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
        if (onCellClick) {
          onCellClick(d.data as EnrichedFileData);
        }
      });
  }

  /**
   * Get cell opacity (can be overridden by lens)
   * Default: full opacity unless file is not selected in coupling mode
   */
  protected getCellOpacity(_file: EnrichedFileData, _state: TState): number {
    return 1;
  }

  /**
   * Show tooltip with base content + lens-specific additions
   */
  protected showTooltip(
    event: MouseEvent,
    file: EnrichedFileData,
    state: TState,
  ): void {
    if (!this.tooltip) return;

    // Populate base tooltip content
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

    if (pathEl && nameEl && commitsEl && authorsEl && healthEl) {
      const pathParts = file.key.split("/");
      const fileName = pathParts.pop() || "";
      const filePath = pathParts.join("/");

      pathEl.textContent = filePath || "/";
      nameEl.textContent = fileName;
      commitsEl.textContent = file.total_commits?.toString() || "0";
      authorsEl.textContent = file.unique_authors?.toString() || "0";
      healthEl.textContent = `${file.healthScore?.score?.toFixed(0) || "100"}/100`;

      // Get lens-specific tooltip additions
      const tooltipData = this.getTooltipContent(file, state);

      // Handle additional rows (like coupling strength)
      if (tooltipData.additionalRows && tooltipData.additionalRows.length > 0) {
        tooltipData.additionalRows.forEach((row) => {
          const rowEl = this.tooltip?.querySelector(
            `#tooltip-${row.label.toLowerCase().replace(/\s+/g, "-")}`,
          ) as HTMLElement;
          if (rowEl) {
            const parentRow = rowEl.closest('[id$="-row"]') as HTMLElement;
            if (parentRow) parentRow.style.display = "flex";
            rowEl.textContent = row.value;
          }
        });
      }
    }

    // Show popover
    (this.tooltip as any).showPopover();

    // Position tooltip
    this.positionTooltip(event);
  }

  /**
   * Position tooltip near cursor
   */
  protected positionTooltip(event: MouseEvent): void {
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

  /**
   * Hide tooltip
   */
  protected hideTooltip(): void {
    if (this.tooltip) {
      (this.tooltip as any).hidePopover();
    }
  }
}