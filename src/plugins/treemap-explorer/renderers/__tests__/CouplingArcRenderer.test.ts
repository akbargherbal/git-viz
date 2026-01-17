// src/plugins/treemap-explorer/renderers/__tests__/CouplingArcRenderer.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as d3 from "d3";
import { CouplingArcRenderer } from "../CouplingArcRenderer";
import { CouplingDataProcessor } from "@/services/data/CouplingDataProcessor";

describe("CouplingArcRenderer", () => {
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let container: HTMLElement;
  let renderer: CouplingArcRenderer;

  // Mock Data
  const mockCouplingIndex = CouplingDataProcessor.process({
    edges: [
      {
        source: "file1",
        target: "file2",
        couplingStrength: 0.9,
        cochangeCount: 10,
      },
      {
        source: "file1",
        target: "file3",
        couplingStrength: 0.2,
        cochangeCount: 2,
      },
    ],
  });

  // Mock D3 Hierarchy Leaves (simplified)
  // IMPORTANT: Include 'key' in data.data as renderer uses it

  // Mock D3 Hierarchy Leaves (simplified)
  // Structure matches real D3 hierarchy output: leaf.data points directly to EnrichedFileData
  const mockLeaves = [
    { x0: 0, x1: 100, y0: 0, y1: 100, data: { key: "file1", path: "file1" } },
    { x0: 200, x1: 300, y0: 0, y1: 100, data: { key: "file2", path: "file2" } },
    { x0: 400, x1: 500, y0: 0, y1: 100, data: { key: "file3", path: "file3" } },
  ] as any[];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    svg = d3.select(container).append("svg") as any;
    renderer = new CouplingArcRenderer(svg);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should initialize with a group element", () => {
    const group = container.querySelector("g.coupling-arcs");
    expect(group).not.toBeNull();
  });

  it("should render arcs for partners above threshold", () => {
    // Render for file1 with threshold 0.5
    renderer.render("file1", mockLeaves, mockCouplingIndex, 0.5);

    const paths = container.querySelectorAll("path");
    // Should only draw arc to file2 (0.9), file3 (0.2) is below threshold
    expect(paths.length).toBe(1);

    // Verify stroke width correlates to strength
    const path = paths[0];
    const strokeWidth = parseFloat(path.getAttribute("stroke-width") || "0");
    // Formula: 1 + strength * 3 -> 1 + 0.9 * 3 = 3.7
    expect(strokeWidth).toBeCloseTo(3.7);
  });

  it("should render multiple arcs if multiple partners qualify", () => {
    // Render for file1 with threshold 0.1
    renderer.render("file1", mockLeaves, mockCouplingIndex, 0.1);

    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(2);
  });

  it("should clear arcs when clear() is called", () => {
    renderer.render("file1", mockLeaves, mockCouplingIndex, 0.1);
    expect(container.querySelectorAll("path").length).toBe(2);

    renderer.clear();
    expect(container.querySelectorAll("path").length).toBe(0);
  });

  it("should handle missing source or target nodes gracefully", () => {
    // file4 does not exist in leaves
    renderer.render("file4", mockLeaves, mockCouplingIndex, 0.1);
    expect(container.querySelectorAll("path").length).toBe(0);
  });
});
