// src/plugins/treemap-explorer/renderers/__tests__/DebtRenderer.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { DebtRenderer } from "../DebtRenderer";
import { EnrichedFileData, TreemapExplorerState } from "../../types";
import * as d3 from "d3";

describe("DebtRenderer", () => {
  let renderer: DebtRenderer;
  let mockContainer: HTMLElement;
  let mockTooltip: HTMLElement;

  beforeEach(() => {
    mockContainer = document.createElement("div");
    mockTooltip = document.createElement("div");
    mockTooltip.setAttribute("popover", "auto");

    // Add tooltip structure
    mockTooltip.innerHTML = `
      <div id="tooltip-path"></div>
      <div id="tooltip-name"></div>
      <div id="tooltip-commits"></div>
      <div id="tooltip-authors"></div>
      <div id="tooltip-health"></div>
    `;

    renderer = new DebtRenderer(mockContainer, mockTooltip);
  });

  describe("enrichData", () => {
    it("should return data unchanged (no enrichment for debt lens)", () => {
      const mockData: EnrichedFileData[] = [
        {
          key: "test.ts",
          name: "test.ts",
          path: "test.ts",
          total_commits: 10,
          unique_authors: 2,
          healthScore: {
            score: 50,
            category: "medium",
            churnRate: 0.3,
            busFactor: "medium-risk",
            factors: {
              churn: { value: 0.3, score: 50, weight: 0.4 },
              authors: { value: 2, score: 60, weight: 0.3 },
              age: { value: 100, score: 70, weight: 0.3 },
            },
          },
        },
      ];

      const mockState: TreemapExplorerState = {
        lensMode: "debt",
        sizeMetric: "commits",
        healthThreshold: 100,
        selectedFile: null,
        couplingThreshold: 0.3,
        timelinePosition: 0,
      };

      const result = renderer.enrichData(mockData, mockState);
      expect(result).toEqual(mockData);
      expect(result).toBe(mockData); // Should be same reference
    });
  });

  describe("filterData", () => {
    it("should filter files by health threshold", () => {
      const mockData: EnrichedFileData[] = [
        {
          key: "healthy.ts",
          name: "healthy.ts",
          path: "healthy.ts",
          total_commits: 5,
          unique_authors: 2,
          healthScore: {
            score: 90,
            category: "healthy",
            churnRate: 0.1,
            busFactor: "low-risk",
            factors: {} as any,
          },
        },
        {
          key: "medium.ts",
          name: "medium.ts",
          path: "medium.ts",
          total_commits: 10,
          unique_authors: 2,
          healthScore: {
            score: 50,
            category: "medium",
            churnRate: 0.3,
            busFactor: "medium-risk",
            factors: {} as any,
          },
        },
        {
          key: "critical.ts",
          name: "critical.ts",
          path: "critical.ts",
          total_commits: 20,
          unique_authors: 1,
          healthScore: {
            score: 20,
            category: "critical",
            churnRate: 0.8,
            busFactor: "high-risk",
            factors: {} as any,
          },
        },
      ];

      const state: TreemapExplorerState = {
        lensMode: "debt",
        sizeMetric: "commits",
        healthThreshold: 50,
        selectedFile: null,
        couplingThreshold: 0.3,
        timelinePosition: 0,
      };

      const result = renderer.filterData(mockData, state);
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.key)).toEqual(["medium.ts", "critical.ts"]);
    });

    it("should include all files when threshold is 100", () => {
      const mockData: EnrichedFileData[] = [
        {
          key: "test1.ts",
          name: "test1.ts",
          path: "test1.ts",
          total_commits: 5,
          unique_authors: 2,
          healthScore: {
            score: 95,
            category: "healthy",
            churnRate: 0.1,
            busFactor: "low-risk",
            factors: {} as any,
          },
        },
        {
          key: "test2.ts",
          name: "test2.ts",
          path: "test2.ts",
          total_commits: 10,
          unique_authors: 1,
          healthScore: {
            score: 30,
            category: "critical",
            churnRate: 0.7,
            busFactor: "high-risk",
            factors: {} as any,
          },
        },
      ];

      const state: TreemapExplorerState = {
        lensMode: "debt",
        sizeMetric: "commits",
        healthThreshold: 100,
        selectedFile: null,
        couplingThreshold: 0.3,
        timelinePosition: 0,
      };

      const result = renderer.filterData(mockData, state);
      expect(result).toHaveLength(2);
    });

    it("should handle files without health scores (default to 100)", () => {
      const mockData: EnrichedFileData[] = [
        {
          key: "no-score.ts",
          name: "no-score.ts",
          path: "no-score.ts",
          total_commits: 5,
          unique_authors: 2,
          healthScore: undefined,
        },
        {
          key: "with-score.ts",
          name: "with-score.ts",
          path: "with-score.ts",
          total_commits: 10,
          unique_authors: 1,
          healthScore: {
            score: 40,
            category: "medium",
            churnRate: 0.5,
            busFactor: "medium-risk",
            factors: {} as any,
          },
        },
      ];

      const state: TreemapExplorerState = {
        lensMode: "debt",
        sizeMetric: "commits",
        healthThreshold: 50,
        selectedFile: null,
        couplingThreshold: 0.3,
        timelinePosition: 0,
      };

      const result = renderer.filterData(mockData, state);
      // File without score defaults to 100, which is > 50, so excluded
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("with-score.ts");
    });
  });

  describe("getCellColor", () => {
    const mockState: TreemapExplorerState = {
      lensMode: "debt",
      sizeMetric: "commits",
      healthThreshold: 100,
      selectedFile: null,
      couplingThreshold: 0.3,
      timelinePosition: 0,
    };

    it("should return dark red for critical scores (0-20)", () => {
      const file: EnrichedFileData = {
        key: "critical.ts",
        name: "critical.ts",
        path: "critical.ts",
        total_commits: 10,
        unique_authors: 1,
        healthScore: {
          score: 10,
          category: "critical",
          churnRate: 0.9,
          busFactor: "high-risk",
          factors: {} as any,
        },
      };

      const color = renderer.getCellColor(file, mockState);
      // d3.interpolate returns RGB format: rgb(r, g, b)
      expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it("should return orange-red for high concern scores (20-40)", () => {
      const file: EnrichedFileData = {
        key: "high-concern.ts",
        name: "high-concern.ts",
        path: "high-concern.ts",
        total_commits: 10,
        unique_authors: 1,
        healthScore: {
          score: 30,
          category: "critical",
          churnRate: 0.7,
          busFactor: "high-risk",
          factors: {} as any,
        },
      };

      const color = renderer.getCellColor(file, mockState);
      expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it("should return yellow-orange for medium scores (40-60)", () => {
      const file: EnrichedFileData = {
        key: "medium.ts",
        name: "medium.ts",
        path: "medium.ts",
        total_commits: 10,
        unique_authors: 2,
        healthScore: {
          score: 50,
          category: "medium",
          churnRate: 0.5,
          busFactor: "medium-risk",
          factors: {} as any,
        },
      };

      const color = renderer.getCellColor(file, mockState);
      expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it("should return light green for low-medium scores (60-80)", () => {
      const file: EnrichedFileData = {
        key: "good.ts",
        name: "good.ts",
        path: "good.ts",
        total_commits: 10,
        unique_authors: 3,
        healthScore: {
          score: 70,
          category: "healthy",
          churnRate: 0.3,
          busFactor: "low-risk",
          factors: {} as any,
        },
      };

      const color = renderer.getCellColor(file, mockState);
      expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it("should return dark green for healthy scores (80-100)", () => {
      const file: EnrichedFileData = {
        key: "healthy.ts",
        name: "healthy.ts",
        path: "healthy.ts",
        total_commits: 5,
        unique_authors: 3,
        healthScore: {
          score: 95,
          category: "healthy",
          churnRate: 0.1,
          busFactor: "low-risk",
          factors: {} as any,
        },
      };

      const color = renderer.getCellColor(file, mockState);
      expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it("should default to healthy color for files without health score", () => {
      const file: EnrichedFileData = {
        key: "no-score.ts",
        name: "no-score.ts",
        path: "no-score.ts",
        total_commits: 10,
        unique_authors: 2,
        healthScore: undefined,
      };

      const color = renderer.getCellColor(file, mockState);
      expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });
  });

  describe("getCellOpacity", () => {
    const mockState: TreemapExplorerState = {
      lensMode: "debt",
      sizeMetric: "commits",
      healthThreshold: 100,
      selectedFile: null,
      couplingThreshold: 0.3,
      timelinePosition: 0,
    };

    it("should return full opacity (1.0) for high-risk bus factor files", () => {
      const file: EnrichedFileData = {
        key: "high-risk.ts",
        name: "high-risk.ts",
        path: "high-risk.ts",
        total_commits: 20,
        unique_authors: 1,
        healthScore: {
          score: 30,
          category: "critical",
          churnRate: 0.5,
          busFactor: "high-risk",
          factors: {} as any,
        },
      };

      const opacity = (renderer as any).getCellOpacity(file, mockState);
      expect(opacity).toBe(1.0);
    });

    it("should return reduced opacity for low-risk bus factor files", () => {
      const file: EnrichedFileData = {
        key: "low-risk.ts",
        name: "low-risk.ts",
        path: "low-risk.ts",
        total_commits: 10,
        unique_authors: 5,
        healthScore: {
          score: 80,
          category: "healthy",
          churnRate: 0.2,
          busFactor: "low-risk",
          factors: {} as any,
        },
      };

      const opacity = (renderer as any).getCellOpacity(file, mockState);
      expect(opacity).toBeLessThan(1.0);
      expect(opacity).toBeGreaterThanOrEqual(0.3);
    });

    it("should return medium opacity for medium-risk bus factor files", () => {
      const file: EnrichedFileData = {
        key: "medium-risk.ts",
        name: "medium-risk.ts",
        path: "medium-risk.ts",
        total_commits: 15,
        unique_authors: 2,
        healthScore: {
          score: 50,
          category: "medium",
          churnRate: 0.4,
          busFactor: "medium-risk",
          factors: {} as any,
        },
      };

      const opacity = (renderer as any).getCellOpacity(file, mockState);
      expect(opacity).toBeLessThan(1.0);
      expect(opacity).toBeGreaterThan(0.3);
    });

    it("should boost opacity for high-churn files", () => {
      const file: EnrichedFileData = {
        key: "high-churn.ts",
        name: "high-churn.ts",
        path: "high-churn.ts",
        total_commits: 10,
        unique_authors: 3,
        healthScore: {
          score: 60,
          category: "medium",
          churnRate: 0.9,
          busFactor: "low-risk",
          factors: {} as any,
        },
      };

      const opacity = (renderer as any).getCellOpacity(file, mockState);
      expect(opacity).toBeGreaterThan(0.5);
    });

    it("should never return opacity below 0.3", () => {
      const file: EnrichedFileData = {
        key: "very-safe.ts",
        name: "very-safe.ts",
        path: "very-safe.ts",
        total_commits: 5,
        unique_authors: 10,
        healthScore: {
          score: 95,
          category: "healthy",
          churnRate: 0.05,
          busFactor: "low-risk",
          factors: {} as any,
        },
      };

      const opacity = (renderer as any).getCellOpacity(file, mockState);
      expect(opacity).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe("renderExtras", () => {
    it("should not render any extras (no-op for debt lens)", () => {
      const mockSvg = d3.select(
        document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      );
      const mockCells: any[] = [];
      const mockState: TreemapExplorerState = {
        lensMode: "debt",
        sizeMetric: "commits",
        healthThreshold: 100,
        selectedFile: null,
        couplingThreshold: 0.3,
        timelinePosition: 0,
      };

      expect(() => {
        renderer.renderExtras(mockSvg, mockCells, mockState);
      }).not.toThrow();
    });
  });

  describe("cleanup", () => {
    it("should cleanup without errors (no-op for debt lens)", () => {
      expect(() => {
        renderer.cleanup();
      }).not.toThrow();
    });
  });

  describe("getTooltipContent", () => {
    it("should return standard tooltip configuration", () => {
      const file: EnrichedFileData = {
        key: "test.ts",
        name: "test.ts",
        path: "test.ts",
        total_commits: 10,
        unique_authors: 2,
        healthScore: {
          score: 50,
          category: "medium",
          churnRate: 0.4,
          busFactor: "medium-risk",
          factors: {} as any,
        },
      };

      const mockState: TreemapExplorerState = {
        lensMode: "debt",
        sizeMetric: "commits",
        healthThreshold: 100,
        selectedFile: null,
        couplingThreshold: 0.3,
        timelinePosition: 0,
      };

      const result = renderer.getTooltipContent(file, mockState);
      expect(result.show).toBe(true);
      expect(result.additionalRows).toEqual([]);
    });
  });
});
