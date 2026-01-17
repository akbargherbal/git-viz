// src/plugins/treemap-explorer/renderers/CouplingArcRenderer.ts

import * as d3 from "d3";
import { EnrichedFileData } from "../types";
import {
  CouplingIndex,
  CouplingDataProcessor,
} from "@/services/data/CouplingDataProcessor";

export class CouplingArcRenderer {
  private container: d3.Selection<SVGGElement, unknown, null, undefined>;
  private isDestroyed: boolean = false;

  constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    // Create a group for arcs - pointer-events: none so they don't interfere with cell clicks
    this.container = svg
      .append("g")
      .attr("class", "coupling-arcs")
      .style("pointer-events", "none");
  }

  public render(
    selectedFilePath: string | null,
    leaves: d3.HierarchyRectangularNode<any>[],
    couplingIndex: CouplingIndex,
    threshold: number,
  ): void {
    if (this.isDestroyed) {
      console.warn("CouplingArcRenderer: Cannot render on destroyed instance");
      return;
    }

    // Clear existing arcs
    this.clear();

    if (!selectedFilePath) return;

    // Limit to top 10 arcs for performance
    const partners = CouplingDataProcessor.getTopCouplings(
      couplingIndex,
      selectedFilePath,
      10,
    ).filter((p) => p.strength >= threshold);

    if (partners.length === 0) return;

    // Find source node - FIX: Access d.data directly
    const sourceNode = leaves.find((l) => (l.data as EnrichedFileData).key === selectedFilePath);
    if (!sourceNode) return;

    // Calculate source center
    const sx = (sourceNode.x0 + sourceNode.x1) / 2;
    const sy = (sourceNode.y0 + sourceNode.y1) / 2;

    // Batch create paths for better performance
    const pathData = partners
      .map((partner) => {
        // FIX: Access d.data directly
        const targetNode = leaves.find(
          (l) => (l.data as EnrichedFileData).key === partner.filePath,
        );
        if (!targetNode) return null;

        const tx = (targetNode.x0 + targetNode.x1) / 2;
        const ty = (targetNode.y0 + targetNode.y1) / 2;

        // Calculate control point for quadratic Bezier
        const cx = (sx + tx) / 2;
        const cy = Math.min(sy, ty) - 100; // Curve upwards

        const path = d3.path();
        path.moveTo(sx, sy);
        path.quadraticCurveTo(cx, cy, tx, ty);

        return {
          pathString: path.toString(),
          strength: partner.strength,
        };
      })
      .filter((p): p is { pathString: string; strength: number } => p !== null);

    // Use D3 join pattern for arcs
    this.container
      .selectAll<SVGPathElement, { pathString: string; strength: number }>(
        "path",
      )
      .data(pathData)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("d", (d) => d.pathString)
            .attr("fill", "none")
            .attr(
              "stroke",
              (d) => `rgba(168, 85, 247, ${0.4 + d.strength * 0.6})`,
            )
            .attr("stroke-width", (d) => 1 + d.strength * 3)
            .attr("stroke-linecap", "round")
            .style("opacity", 0)
            .call((path) =>
              path
                .transition()
                .duration(300)
                .style("opacity", 1),
            ),
        (update) =>
          update
            .attr("d", (d) => d.pathString)
            .attr(
              "stroke",
              (d) => `rgba(168, 85, 247, ${0.4 + d.strength * 0.6})`,
            )
            .attr("stroke-width", (d) => 1 + d.strength * 3),
        (exit) => exit.transition().duration(200).style("opacity", 0).remove(),
      );
  }

  public clear(): void {
    if (this.isDestroyed) return;
    this.container.selectAll("path").remove();
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.container.selectAll("*").remove();
    this.container.remove();
    this.isDestroyed = true;
  }
}
