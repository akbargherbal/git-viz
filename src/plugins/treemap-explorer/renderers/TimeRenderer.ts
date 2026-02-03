// src/plugins/treemap-explorer/renderers/TimeRenderer.ts

import * as d3 from "d3";
import { BaseTreemapRenderer } from "./BaseTreemapRenderer";
import { EnrichedFileData, TreemapExplorerState, TemporalFileData } from "../types";
import { getCellColor } from "../utils/colorScales";
import { TemporalDataProcessor } from "../../../services/data/TemporalDataProcessor";

/**
 * Time Lens Renderer
 * Handles:
 * - Temporal data enrichment (creation position, activity timeline)
 * - Time-based filtering (show only files created before timeline position)
 * - Age-based color visualization
 */
export class TimeRenderer extends BaseTreemapRenderer {
  private temporalData: any = null;
  private timelineCache: Map<string, Array<{ date: string; commits: number }>> = new Map();

  /**
   * Set temporal data and timeline cache for enrichment
   */
  setTemporalData(
    temporalData: any,
    timelineCache: Map<string, Array<{ date: string; commits: number }>>,
  ): void {
    this.temporalData = temporalData;
    this.timelineCache = timelineCache;
  }

  /**
   * TIME-SPECIFIC: Enrich files with temporal context
   * Adds creation position, activity timeline, etc.
   */
  enrichData(
    data: EnrichedFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    if (!this.temporalData) {
      console.warn("[TimeRenderer] No temporal data available for enrichment");
      return data;
    }

    const timePosition = state.timePosition ?? 100;

    // Use TemporalDataProcessor to enrich files with temporal context
    const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
      data,
      this.temporalData,
      timePosition,
      this.timelineCache,
    );

    return enriched;
  }

  /**
   * TIME-SPECIFIC: Filter files based on timeline position
   * Only show files created before the current timeline position
   */
  filterData(
    data: EnrichedFileData[],
    state: TreemapExplorerState,
  ): EnrichedFileData[] {
    const timePosition = state.timePosition ?? 100;

    return data.filter((f: any) => {
      // Check if file has temporal data (createdPosition)
      if ("createdPosition" in f && typeof f.createdPosition === "number") {
        return f.createdPosition <= timePosition;
      }
      // If no temporal data, include file by default
      return true;
    });
  }

  /**
   * Use time-based color scale from utils
   */
  getCellColor(
    file: EnrichedFileData,
    state: TreemapExplorerState,
  ): string {
    return getCellColor(file, state.lensMode, {
      timePosition: state.timePosition,
      timeFilters: state.timeFilters,
    });
  }

  /**
   * No special overlays for time lens
   * Color and opacity already convey temporal information
   */
  renderExtras(
    _svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _cells: d3.HierarchyRectangularNode<any>[],
    _state: TreemapExplorerState,
  ): void {
    // No overlays needed for time lens
  }

  /**
   * Add temporal info to tooltip
   */
  getTooltipContent(
    file: EnrichedFileData,
    _state: TreemapExplorerState,
  ): {
    show: boolean;
    additionalRows?: Array<{ label: string; value: string }>;
  } {
    const additionalRows: Array<{ label: string; value: string }> = [];

    // Check if file has temporal data
    const temporalFile = file as TemporalFileData;
    if ("createdPosition" in temporalFile && typeof temporalFile.createdPosition === "number") {
      additionalRows.push({
        label: "Created",
        value: `Timeline ${temporalFile.createdPosition.toFixed(0)}%`,
      });
    }

    // Check if file has activity timeline
    if (file.activityTimeline && file.activityTimeline.length > 0) {
      const totalCommits = file.activityTimeline.reduce(
        (sum, bucket) => sum + bucket.commits,
        0,
      );
      additionalRows.push({
        label: "Activity",
        value: `${totalCommits} commits across timeline`,
      });
    }

    return {
      show: true,
      additionalRows,
    };
  }

  /**
   * No special cleanup for time lens
   */
  cleanup(): void {
    // No resources to cleanup
  }
}