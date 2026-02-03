// src/plugins/treemap-explorer/renderers/CouplingRenderer.ts

import * as d3 from "d3";
import { BaseTreemapRenderer } from "./BaseTreemapRenderer";
import { CouplingArcRenderer } from "./CouplingArcRenderer";
import { EnrichedFileData, TreemapExplorerState } from "../types";
import { getCellColor } from "../utils/colorScales";

/**
 * Coupling Lens Renderer
 * Handles:
 * - Opacity dimming for non-coupled files
 * - Coupling arc overlays between related files
 * - Coupling strength visualization
 */
export class CouplingRenderer extends BaseTreemapRenderer {
  private arcRenderer: CouplingArcRenderer | null = null;
  private couplingIndex: Map<string, any> | null = null;

  /**
   * Set coupling index for arc rendering
   */
  setCouplingIndex(index: Map<string, any>): void {
    this.couplingIndex = index;
  }

  /**
   * No data enrichment needed for coupling lens
   * Coupling data already present in EnrichedFileData
   */
  enrichData(
    data: EnrichedFileData[],
    _state: TreemapExplorerState,
  ): EnrichedFileData[] {
    return data;
  }

  /**
   * No special filtering for coupling lens
   * All files remain visible (opacity handles emphasis)
   */
  filterData(
    data: EnrichedFileData[],
    _state: TreemapExplorerState,
  ): EnrichedFileData[] {
    return data;
  }

  /**
   * Use coupling color scale from utils
   */
  getCellColor(file: EnrichedFileData, state: TreemapExplorerState): string {
    return getCellColor(file, state.lensMode, {
      couplingThreshold: state.couplingThreshold,
    });
  }

  /**
   * COUPLING-SPECIFIC: Dim non-selected files when a file is selected
   */
  protected getCellOpacity(
    file: EnrichedFileData,
    state: TreemapExplorerState,
  ): number {
    // If file is selected and this is NOT that file, dim it
    if (state.selectedFile && state.selectedFile !== file.key) {
      return 0.1;
    }
    return 1;
  }

  /**
   * COUPLING-SPECIFIC: Render arcs between coupled files
   */
  renderExtras(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    cells: d3.HierarchyRectangularNode<any>[],
    state: TreemapExplorerState,
  ): void {
    // Initialize arc renderer if needed
    if (!this.arcRenderer) {
      this.arcRenderer = new CouplingArcRenderer(svg);
    }

    // Render arcs if file selected and arcs enabled
    if (state.selectedFile && state.showArcs && this.couplingIndex) {
      this.arcRenderer.render(
        state.selectedFile,
        cells,
        this.couplingIndex,
        state.couplingThreshold || 0.03,
      );
    }
  }

  /**
   * Add coupling strength to tooltip if file has coupling partners
   */
  getTooltipContent(
    file: EnrichedFileData,
    _state: TreemapExplorerState,
  ): {
    show: boolean;
    additionalRows?: Array<{ label: string; value: string }>;
  } {
    const additionalRows: Array<{ label: string; value: string }> = [];

    // If file has coupling data, show strongest coupling
    if (file.coupledFiles && file.coupledFiles.length > 0) {
      const strongest = file.coupledFiles[0]; // Already sorted by strength
      additionalRows.push({
        label: "Coupling",
        value: `${(strongest.strength * 100).toFixed(0)}% with ${strongest.file.split("/").pop()}`,
      });
    }

    return {
      show: true,
      additionalRows,
    };
  }

  /**
   * Cleanup coupling-specific resources
   */
  cleanup(): void {
    if (this.arcRenderer) {
      this.arcRenderer.destroy();
      this.arcRenderer = null;
    }
  }
}
