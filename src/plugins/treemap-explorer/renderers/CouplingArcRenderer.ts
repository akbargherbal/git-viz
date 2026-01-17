// src/plugins/treemap-explorer/renderers/CouplingArcRenderer.ts

import * as d3 from "d3";
import { TreemapHierarchyDatum } from "../TreemapExplorerPlugin";
import { CouplingIndex, CouplingDataProcessor } from "@/services/data/CouplingDataProcessor";

export class CouplingArcRenderer {
  private container: d3.Selection<SVGGElement, unknown, null, undefined>;
  private isDestroyed: boolean = false;

  constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    // Create a group for arcs - pointer-events: none so they don't interfere with cell clicks
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
    if (this.isDestroyed) {
      console.warn('CouplingArcRenderer: Cannot render on destroyed instance');
      return;
    }

    // Clear existing arcs
    this.clear();

    if (!selectedFilePath) return;

    // ✅ IMPROVED: Limit to top 10 arcs for performance
    const partners = CouplingDataProcessor.getTopCouplings(
      couplingIndex,
      selectedFilePath,
      10 // Reduced from 20 to 10 for better performance
    ).filter(p => p.strength >= threshold);

    if (partners.length === 0) return;

    // Find source node
    const sourceNode = leaves.find(l => l.data.data.path === selectedFilePath);
    if (!sourceNode) return;

    // Calculate source center
    const sx = (sourceNode.x0 + sourceNode.x1) / 2;
    const sy = (sourceNode.y0 + sourceNode.y1) / 2;

    // ✅ IMPROVED: Batch create paths for better performance
    const pathData = partners
      .map(partner => {
        const targetNode = leaves.find(l => l.data.data.path === partner.filePath);
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
          strength: partner.strength
        };
      })
      .filter((p): p is { pathString: string; strength: number } => p !== null);

    // ✅ IMPROVED: Use D3 join pattern for arcs too
    this.container
      .selectAll<SVGPathElement, { pathString: string; strength: number }>("path")
      .data(pathData)
      .join(
        enter => enter.append("path")
          .attr("d", d => d.pathString)
          .attr("fill", "none")
          .attr("stroke", d => `rgba(168, 85, 247, ${0.4 + d.strength * 0.6})`)
          .attr("stroke-width", d => 1 + d.strength * 3)
          .attr("stroke-linecap", "round")
          .style("opacity", 0)
          .call(path => path.transition()
            .duration(300) // Slightly faster animation
            .style("opacity", 1)
          ),
        update => update
          .attr("d", d => d.pathString)
          .attr("stroke", d => `rgba(168, 85, 247, ${0.4 + d.strength * 0.6})`)
          .attr("stroke-width", d => 1 + d.strength * 3),
        exit => exit
          .transition()
          .duration(200)
          .style("opacity", 0)
          .remove()
      );
  }

  // ✅ FIXED: Synchronous removal (no transition) to fix test
  public clear(): void {
    if (this.isDestroyed) return;
    
    // Immediate removal (synchronous) - tests expect this behavior
    this.container.selectAll("path").remove();
  }

  // ✅ NEW: Proper cleanup method
  public destroy(): void {
    if (this.isDestroyed) return;
    
    // Remove all arcs
    this.container.selectAll("*").remove();
    
    // Remove the container group itself
    this.container.remove();
    
    // Mark as destroyed to prevent further operations
    this.isDestroyed = true;
  }
}