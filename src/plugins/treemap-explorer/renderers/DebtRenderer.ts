// src/plugins/treemap-explorer/renderers/DebtRenderer.ts

import * as d3 from "d3";
import { BaseTreemapRenderer } from "./BaseTreemapRenderer";
import { EnrichedFileData, TreemapExplorerState } from "../types";

/**
 * Debt Lens Renderer
 * Colors cells by health score (red = critical, green = healthy)
 * Filters files by health threshold
 */
export class DebtRenderer extends BaseTreemapRenderer {
  enrichData(
    data: EnrichedFileData[],
    _state: TreemapExplorerState,
    _additionalContext?: any,
  ): EnrichedFileData[] {
    // Debt lens uses base data without additional enrichment
    // Health scores are already calculated in the data
    return data;
  }

  filterData(
    data: EnrichedFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    const threshold = state.healthThreshold ?? 100;

    return data.filter((file) => {
      const score = file.healthScore?.score ?? 100;
      return score <= threshold;
    });
  }

  getCellColor(file: EnrichedFileData, _state: TreemapExplorerState): string {
    const score = file.healthScore?.score ?? 100;

    // IMPROVED: Full red→yellow→green spectrum using RdYlGn
    // This provides much better visual differentiation
    // Score 0-30: Red shades (critical)
    // Score 30-70: Yellow/orange shades (medium)
    // Score 70-100: Green shades (healthy)

    // Use D3's built-in diverging scale for better contrast
    if (score <= 20) {
      // Critical: Dark red (0-20)
      return d3.interpolate("#b91c1c", "#dc2626")(score / 20);
    } else if (score <= 40) {
      // High concern: Red to orange (20-40)
      return d3.interpolate("#dc2626", "#f97316")((score - 20) / 20);
    } else if (score <= 60) {
      // Medium: Orange to yellow (40-60)
      return d3.interpolate("#f97316", "#fbbf24")((score - 40) / 20);
    } else if (score <= 80) {
      // Low-medium: Yellow to light green (60-80)
      return d3.interpolate("#fbbf24", "#84cc16")((score - 60) / 20);
    } else {
      // Healthy: Light green to dark green (80-100)
      return d3.interpolate("#84cc16", "#16a34a")((score - 80) / 20);
    }
  }

  renderExtras(
    _svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _cells: d3.HierarchyRectangularNode<any>[],
    _state: TreemapExplorerState,
  ): void {
    // Debt lens has no additional overlays or visualizations
    // (No arcs like coupling, no timeline like time mode)
  }

  cleanup(): void {
    // Debt lens has no resources to clean up
    // (No arc renderer, no intervals, etc.)
  }

  getTooltipContent(
    _file: EnrichedFileData,
    _state: TreemapExplorerState,
  ): {
    show: boolean;
    additionalRows?: Array<{ label: string; value: string }>;
  } {
    // Debt lens shows standard tooltip without additional rows
    // Health score is already shown in base tooltip
    return {
      show: true,
      additionalRows: [],
    };
  }

  /**
   * Override opacity for debt lens
   * Modulate opacity based on bus factor and churn to show multiple risk dimensions
   * - High opacity (1.0): High risk (low bus factor + high churn)
   * - Medium opacity (0.7): Medium risk
   * - Low opacity (0.4): Low risk (well-distributed ownership + stable)
   */
  protected getCellOpacity(
    file: EnrichedFileData,
    _state: TreemapExplorerState,
  ): number {
    // Base opacity
    let opacity = 1.0;

    // Reduce opacity for files with better bus factor (lower risk)
    if (file.healthScore?.busFactor) {
      const busFactor = file.healthScore.busFactor;
      if (busFactor === "low-risk") {
        opacity *= 0.5; // Very transparent for low-risk files
      } else if (busFactor === "medium-risk") {
        opacity *= 0.75; // Semi-transparent for medium-risk
      }
      // high-risk stays at full opacity (1.0)
    }

    // Increase opacity for high-churn files (they need attention)
    if (file.healthScore?.churnRate) {
      const churnRate = file.healthScore.churnRate;
      if (churnRate > 0.8) {
        opacity = Math.min(opacity + 0.3, 1.0); // Boost visibility for high churn
      }
    }

    return Math.max(opacity, 0.3); // Never go below 0.3 (keep visible)
  }
}
