// src/services/data/__tests__/CouplingDataProcessor.Advanced.test.ts
import { describe, it, expect } from "vitest";
import { CouplingDataProcessor } from "../CouplingDataProcessor";

describe("CouplingDataProcessor - Advanced", () => {
  const mockNetworkData = {
    edges: [
      { source: "A", target: "B", cochangeCount: 10, couplingStrength: 0.8 },
      { source: "A", target: "C", cochangeCount: 5, couplingStrength: 0.4 },
      { source: "B", target: "C", cochangeCount: 2, couplingStrength: 0.2 },
    ],
  };

  describe("Network Statistics", () => {
    it("should calculate network stats correctly", () => {
      const index = CouplingDataProcessor.process(mockNetworkData);
      const stats = CouplingDataProcessor.getNetworkStats(index);

      expect(stats.totalFiles).toBe(3); // A, B, C
      expect(stats.totalEdges).toBe(6); // 3 edges * 2 (bidirectional)
      expect(stats.stronglyCoupledFiles).toBeGreaterThan(0);
    });

    it("should handle empty network stats", () => {
      const index = CouplingDataProcessor.process({ edges: [] });
      const stats = CouplingDataProcessor.getNetworkStats(index);

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalEdges).toBe(0);
    });
  });

  describe("Filtering & Queries", () => {
    const index = CouplingDataProcessor.process(mockNetworkData);

    it("should filter files by coupling strength", () => {
      const stronglyCoupled = CouplingDataProcessor.filterFilesByCoupling(
        index,
        ["A", "B", "C"],
        { minMaxStrength: 0.7 },
      );
      expect(stronglyCoupled).toContain("A"); // Max strength 0.8 (with B)
      expect(stronglyCoupled).toContain("B"); // Max strength 0.8 (with A)
      expect(stronglyCoupled).not.toContain("C"); // Max strength 0.4 (with A)
    });

    it("should get top couplings limited by N", () => {
      const topPartners = CouplingDataProcessor.getTopCouplings(index, "A", 1);
      expect(topPartners).toHaveLength(1);
      expect(topPartners[0].filePath).toBe("B"); // Strongest partner
    });

    it("should check for strong coupling existence", () => {
      expect(CouplingDataProcessor.hasStrongCoupling(index, "A", 0.5)).toBe(
        true,
      );
      expect(CouplingDataProcessor.hasStrongCoupling(index, "C", 0.5)).toBe(
        false,
      );
    });
  });

  describe("Data Enrichment", () => {
    it("should enrich files with coupling metrics", () => {
      const files = [{ key: "A" }, { key: "Z" }] as any[];
      CouplingDataProcessor.enrichWithCoupling(files, mockNetworkData);

      // File A (exists in network)
      expect(files[0].couplingMetrics.maxStrength).toBe(0.8);
      expect(files[0].coupledFiles).toHaveLength(2);

      // File Z (not in network)
      expect(files[1].couplingMetrics.maxStrength).toBe(0);
      expect(files[1].coupledFiles).toHaveLength(0);
    });

    it("should handle missing network data gracefully", () => {
      const files = [{ key: "A" }] as any[];
      CouplingDataProcessor.enrichWithCoupling(files, null);
      expect(files[0].couplingMetrics).toBeUndefined();
    });
  });
});
