// src/plugins/treemap-animation/TreemapPlugin.ts

import * as d3 from "d3";
import type { HierarchyRectangularNode } from "d3";
import { VisualizationPlugin, OptimizedDataset } from "@/types/plugin";
import { OptimizedDirectoryNode } from "@/types/domain";

interface TreemapConfig {
  width: number;
  height: number;
}

export class TreemapPlugin implements VisualizationPlugin<TreemapConfig, any> {
  metadata = {
    id: "treemap-animation",
    name: "Treemap Structure",
    description: "Hierarchical view of the repository structure",
    version: "1.0.0",
    priority: 2,
  };

  defaultConfig: TreemapConfig = {
    width: 800,
    height: 600,
  };

  private container: HTMLElement | null = null;

  init(container: HTMLElement, _config: TreemapConfig): void {
    this.container = container;
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.overflow = "hidden";
  }

  processData(
    dataset: OptimizedDataset,
  ): d3.HierarchyNode<OptimizedDirectoryNode> {
    // Assign a default value of 1 to files so the treemap has size
    const root = d3
      .hierarchy(dataset.tree)
      .sum((d) => (d.type === "file" ? 1 : 0))
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    return root;
  }

  render(
    root: HierarchyRectangularNode<OptimizedDirectoryNode>,
    config: TreemapConfig,
  ): void {
    if (!this.container) return;
    this.container.innerHTML = "";

    const width = this.container.clientWidth || config.width;
    const height = this.container.clientHeight || config.height;

    const svg = d3
      .select(this.container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("font-family", "sans-serif");

    const treemap = d3
      .treemap<OptimizedDirectoryNode>()
      .size([width, height])
      .paddingOuter(3)
      .paddingTop(19)
      .paddingInner(1)
      .round(true);

    treemap(root);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const cell = svg
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => {
        const rectNode = d as HierarchyRectangularNode<OptimizedDirectoryNode>;
        return `translate(${rectNode.x0},${rectNode.y0})`;
      });

    // Rectangles
    cell
      .append("rect")
      .attr("width", (d) => {
        const rectNode = d as HierarchyRectangularNode<OptimizedDirectoryNode>;
        return rectNode.x1 - rectNode.x0;
      })
      .attr("height", (d) => {
        const rectNode = d as HierarchyRectangularNode<OptimizedDirectoryNode>;
        return rectNode.y1 - rectNode.y0;
      })
      .attr("fill", (d) => {
        if (d.depth === 0) return "none";
        // Color by top-level parent
        let parent = d;
        while (parent.depth > 1) parent = parent.parent!;
        return color(parent.data.name);
      })
      .attr("fill-opacity", 0.6)
      .attr("stroke", "#18181b");

    // Labels (only for directories with enough space)
    cell.each(function (d) {
      const rectNode = d as HierarchyRectangularNode<OptimizedDirectoryNode>;
      const node = d3.select(this);
      const w = rectNode.x1 - rectNode.x0;
      const h = rectNode.y1 - rectNode.y0;

      if (d.depth === 1 && w > 50 && h > 20) {
        node
          .append("text")
          .attr("x", 4)
          .attr("y", 14)
          .text(d.data.name)
          .attr("fill", "white")
          .attr("font-size", "12px")
          .attr("font-weight", "bold");
      }
    });

    // Tooltips
    cell.append("title").text(
      (d) =>
        `${d
          .ancestors()
          .reverse()
          .map((a) => a.data.name)
          .join("/")}\nFiles: ${d.value}`,
    );
  }

  update() {}
  destroy() {
    if (this.container) this.container.innerHTML = "";
  }
  async exportImage() {
    return new Blob();
  }
  exportData() {
    return {};
  }
}
