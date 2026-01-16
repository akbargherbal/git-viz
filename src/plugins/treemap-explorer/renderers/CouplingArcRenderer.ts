// src/plugins/treemap-explorer/renderers/CouplingArcRenderer.ts

import * as d3 from "d3";
import { TreemapHierarchyDatum } from "../TreemapExplorerPlugin";
import { CouplingIndex, CouplingDataProcessor } from "@/services/data/CouplingDataProcessor";

export class CouplingArcRenderer {
  private container: d3.Selection<SVGGElement, unknown, null, undefined>;

  constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    // Create a group for arcs if it doesn't exist, ensure it's behind cells (if z-index matters)
    // or on top (pointer-events: none)
    this.container = svg.append("g")
      .attr("class", "coupling-arcs")
      .style("pointer-events", "none");
  }

  public render(
    selectedFilePath: string | null,
    leaves: d3.HierarchyRectangularNode<TreemapHierarchyDatum>[],
    couplingIndex: CouplingIndex,
    threshold: number
  ): void {
    // Clear existing arcs
    this.container.selectAll("*").remove();

    if (!selectedFilePath) return;

    // Get coupling partners for the selected file
    const partners = CouplingDataProcessor.getTopCouplings(
      couplingIndex,
      selectedFilePath,
      20 // Limit to top 20 to prevent visual clutter
    ).filter(p => p.strength >= threshold);

    if (partners.length === 0) return;

    // Find source node - Note the double .data access due to wrapper
    const sourceNode = leaves.find(l => l.data.data.path === selectedFilePath);
    if (!sourceNode) return;

    // Calculate source center
    const sx = (sourceNode.x0 + sourceNode.x1) / 2;
    const sy = (sourceNode.y0 + sourceNode.y1) / 2;

    // Draw arcs to partners
    partners.forEach(partner => {
      const targetNode = leaves.find(l => l.data.data.path === partner.filePath);
      if (!targetNode) return;

      const tx = (targetNode.x0 + targetNode.x1) / 2;
      const ty = (targetNode.y0 + targetNode.y1) / 2;

      // Calculate control point for quadratic Bezier
      // We pull the control point towards the center of the screen or upwards
      // to create a nice arc effect
      const cx = (sx + tx) / 2;
      const cy = Math.min(sy, ty) - 100; // Curve upwards

      const path = d3.path();
      path.moveTo(sx, sy);
      path.quadraticCurveTo(cx, cy, tx, ty);

      this.container.append("path")
        .attr("d", path.toString())
        .attr("fill", "none")
        .attr("stroke", `rgba(168, 85, 247, ${0.4 + partner.strength * 0.6})`) // Purple with opacity based on strength
        .attr("stroke-width", 1 + partner.strength * 3)
        .attr("stroke-linecap", "round")
        .style("opacity", 0)
        .transition()
        .duration(400)
        .style("opacity", 1);
    });
  }

  public clear(): void {
    this.container.selectAll("*").remove();
  }
}