// src/services/data/__tests__/HealthScoreCalculator.test.ts
import { describe, it, expect } from "vitest";
import {
  HealthScoreCalculator,
  HealthScoreInputs,
} from "../HealthScoreCalculator";

describe("HealthScoreCalculator", () => {
  const baseInput: HealthScoreInputs = {
    totalCommits: 10,
    uniqueAuthors: 3,
    operations: { M: 10, A: 5, D: 2, R: 0 },
    ageDays: 100,
    lastModifiedDaysAgo: 5,
  };

  describe("calculate", () => {
    it("should return a valid health score result", () => {
      const result = HealthScoreCalculator.calculate(baseInput);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.category).toMatch(/healthy|medium|critical/);
      expect(result.factors).toBeDefined();
    });

    it("should handle zero operations gracefully", () => {
      const input = { ...baseInput, operations: {} };
      const result = HealthScoreCalculator.calculate(input);
      expect(result.churnRate).toBe(0);
    });
  });

  describe("Scoring Logic", () => {
    it("should penalize high churn", () => {
      // 90 modifications, 10 total others = 0.9 churn rate (High Churn)
      const highChurnInput = {
        ...baseInput,
        operations: { M: 90, A: 5, D: 5, R: 0 },
      };
      const result = HealthScoreCalculator.calculate(highChurnInput);
      expect(result.factors.churn.score).toBeLessThan(50);
    });

    it("should reward low churn", () => {
      // 10 modifications, 90 additions = 0.1 churn rate (Low Churn)
      const lowChurnInput = {
        ...baseInput,
        operations: { M: 10, A: 90, D: 0, R: 0 },
      };
      const result = HealthScoreCalculator.calculate(lowChurnInput);
      expect(result.factors.churn.score).toBeGreaterThan(90);
    });

    it("should penalize low bus factor (1 author)", () => {
      const soloInput = { ...baseInput, uniqueAuthors: 1 };
      const result = HealthScoreCalculator.calculate(soloInput);
      expect(result.factors.authors.score).toBe(30);
      expect(result.busFactor).toBe("high-risk");
    });

    it("should reward high bus factor (5+ authors)", () => {
      const teamInput = { ...baseInput, uniqueAuthors: 10 };
      const result = HealthScoreCalculator.calculate(teamInput);
      expect(result.factors.authors.score).toBeGreaterThan(90);
      expect(result.busFactor).toBe("low-risk");
    });

    it("should penalize dormant files", () => {
      const dormantInput = { ...baseInput, lastModifiedDaysAgo: 400 };
      const result = HealthScoreCalculator.calculate(dormantInput);
      expect(result.factors.age.score).toBeLessThan(80);
    });
  });

  describe("Categorization & Insights", () => {
    it("should categorize critical scores correctly", () => {
      expect(HealthScoreCalculator.categorize(20)).toBe("critical");
      expect(HealthScoreCalculator.categorize(50)).toBe("medium");
      expect(HealthScoreCalculator.categorize(80)).toBe("healthy");
    });

    it("should generate correct color codes", () => {
      expect(HealthScoreCalculator.getHealthColor(20)).toContain("hsl(0,"); // Red
      expect(HealthScoreCalculator.getHealthColor(50)).toContain("hsl(45,"); // Amber
      expect(HealthScoreCalculator.getHealthColor(80)).toContain("hsl(145,"); // Green
    });

    it("should provide specific insights for critical files", () => {
      const criticalResult = HealthScoreCalculator.calculate({
        ...baseInput,
        uniqueAuthors: 1, // High risk
        operations: { M: 100, A: 0, D: 0, R: 0 }, // 100% churn
        // Force age penalty to ensure score drops below 30 (Critical)
        // Age Score floor is 70. Weighted (0.3) = 21.
        // Author Score (1) is 30. Weighted (0.3) = 9.
        // Churn Score (1.0) is 0. Weighted (0.4) = 0.
        // Total = 30 (Critical)
        lastModifiedDaysAgo: 800,
      });
      const insight = HealthScoreCalculator.getInsight(criticalResult);
      expect(insight).toContain("Critical technical debt");
    });
  });
});
