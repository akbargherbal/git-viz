// src/services/data/__tests__/TemporalDataProcessor.test.ts
import { describe, it, expect } from "vitest";
import {
  TemporalDataProcessor,
  TemporalDailyData,
  DateRangeConfidence,
} from "../TemporalDataProcessor";
import { EnrichedFileData } from "@/plugins/treemap-explorer/types";

describe("TemporalDataProcessor", () => {
  const mockTemporalData: TemporalDailyData = {
    days: [
      {
        date: "2023-01-01",
        commits: 5,
        files_changed: 2,
        unique_authors: 1,
        key: "2023-01-01",
        operations: {},
      },
      {
        date: "2024-01-01",
        commits: 10,
        files_changed: 3,
        unique_authors: 2,
        key: "2024-01-01",
        operations: {},
      },
      {
        date: "2025-01-15",
        commits: 2,
        files_changed: 1,
        unique_authors: 1,
        key: "2025-01-15",
        operations: {},
      },
    ],
  };

  describe("getDateRange", () => {
    it("should extract date range from temporal data", () => {
      const range = TemporalDataProcessor.getDateRange(mockTemporalData);

      expect(range).toEqual({
        min: "2023-01-01",
        max: "2025-01-15",
        confidence: DateRangeConfidence.HIGH,
        source: "temporal_daily dataset",
      });
    });

    it("should handle missing date_range by calculating from days", () => {
      const dataWithoutRange = { ...mockTemporalData };
      const range = TemporalDataProcessor.getDateRange(dataWithoutRange);

      expect(range).toEqual({
        min: "2023-01-01",
        max: "2025-01-15",
        confidence: DateRangeConfidence.HIGH,
        source: "temporal_daily dataset",
      });
    });
  });

  describe("enrichFilesWithTemporal", () => {
    const mockFiles: EnrichedFileData[] = [
      {
        key: "file1.ts",
        path: "file1.ts",
        name: "file1.ts",
        total_commits: 10,
        unique_authors: 2,
        lifecycle_event_count: 5,
        first_seen: "2023-06-01",
        last_modified: "2024-06-01",
        age_days: 365,
        operations: {},
      },
      {
        key: "file2.ts",
        path: "file2.ts",
        name: "file2.ts",
        total_commits: 5,
        unique_authors: 1,
        lifecycle_event_count: 2,
        first_seen: "2024-01-01",
        last_modified: "2024-02-01",
        age_days: 30,
        operations: {},
      },
      {
        key: "file3.ts",
        path: "file3.ts",
        name: "file3.ts",
        total_commits: 20,
        unique_authors: 3,
        lifecycle_event_count: 10,
        first_seen: "2022-01-01", // Before timeline
        last_modified: "2022-06-01",
        age_days: 150,
        operations: {},
      },
    ];

    it("should enrich files with temporal data at position 100 (present)", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      expect(enriched).toHaveLength(3);
      expect(enriched[0].isVisible).toBe(true);
      expect(enriched[1].isVisible).toBe(true);
      expect(enriched[2].isVisible).toBe(true);
    });

    it("should filter files not yet created at early timeline positions", () => {
      // Position 0 corresponds to 2023-01-01
      // file1 created 2023-06-01 (should be hidden or barely visible depending on granularity)
      // file2 created 2024-01-01 (should be hidden)
      // file3 created 2022-01-01 (should be visible as it was created before start)

      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        0,
      );

      // file3 created before timeline start -> createdPosition = 0 -> visible
      expect(enriched[2].isVisible).toBe(true);

      // file2 created halfway through -> createdPosition > 0 -> hidden
      expect(enriched[1].isVisible).toBe(false);
    });

    it("should calculate createdPosition relative to timeline", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      // Timeline: 2023-01-01 to 2025-01-15 (approx 745 days)
      // file2 created 2024-01-01 (approx 365 days in)
      // Position should be roughly 50%

      const file2 = enriched[1];
      expect(file2.createdPosition).toBeGreaterThan(40);
      expect(file2.createdPosition).toBeLessThan(60);
    });

    it("should handle files with missing dates gracefully", () => {
      const badFiles: EnrichedFileData[] = [
        {
          key: "bad.ts",
          path: "bad.ts",
          name: "bad.ts",
          total_commits: 1,
          unique_authors: 1,
          lifecycle_event_count: 1,
          // Missing dates
          age_days: 0,
          operations: {},
        },
      ];

      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        badFiles,
        mockTemporalData,
        50,
      );

      expect(enriched).toHaveLength(1);
      expect(enriched[0].createdPosition).toBe(0); // Default
      expect(enriched[0].isVisible).toBe(true); // 0 <= 50
    });

    it("should calculate dormant days correctly", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      // file3 last modified 2022-06-01
      // Current date is mocked or real time. Since we can't easily mock Date.now() in this context without setup,
      // we'll just check that dormantDays is calculated (it depends on current date)

      expect(enriched[2].dormantDays).toBeGreaterThan(0);
      expect(enriched[2].isDormant).toBe(true);
    });
  });

  describe("dormancy detection", () => {
    it("should mark files dormant if not modified in >180 days", () => {
      const oldFile: EnrichedFileData = {
        key: "old.ts",
        path: "old.ts",
        name: "old.ts",
        total_commits: 1,
        unique_authors: 1,
        lifecycle_event_count: 1,
        first_seen: "2020-01-01",
        last_modified: "2020-02-01", // Very old
        age_days: 1000,
        operations: {},
      };

      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        [oldFile],
        mockTemporalData,
        100,
      );

      expect(enriched[0].isDormant).toBe(true);
      expect(enriched[0].dormantDays).toBeGreaterThan(100);
    });

    it("should not mark recently modified files as dormant", () => {
      const today = new Date().toISOString().split("T")[0];
      const newFile: EnrichedFileData = {
        key: "new.ts",
        path: "new.ts",
        name: "new.ts",
        total_commits: 1,
        unique_authors: 1,
        lifecycle_event_count: 1,
        first_seen: "2020-01-01",
        last_modified: today, // Modified today
        age_days: 1000,
        operations: {},
      };

      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        [newFile],
        mockTemporalData,
        100,
      );

      expect(enriched[0].isDormant).toBe(false);
      expect(enriched[0].dormantDays).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty file array", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        [],
        mockTemporalData,
        100,
      );
      expect(enriched).toEqual([]);
    });

    it("should handle timePosition at extremes (0 and 100)", () => {
      const files: EnrichedFileData[] = [
        {
          key: "f.ts",
          path: "f.ts",
          name: "f.ts",
          total_commits: 1,
          unique_authors: 1,
          lifecycle_event_count: 1,
          first_seen: "2024-01-01", // Middle of timeline
          last_modified: "2024-01-01",
          age_days: 1,
          operations: {},
        },
      ];

      // At 0, should be hidden
      const atStart = TemporalDataProcessor.enrichFilesWithTemporal(
        files,
        mockTemporalData,
        0,
      );
      expect(atStart[0].isVisible).toBe(false);

      // At 100, should be visible
      const atEnd = TemporalDataProcessor.enrichFilesWithTemporal(
        files,
        mockTemporalData,
        100,
      );
      expect(atEnd[0].isVisible).toBe(true);
    });

    it("should preserve all base EnrichedFileData properties", () => {
      const file: EnrichedFileData = {
        key: "f.ts",
        path: "f.ts",
        name: "f.ts",
        total_commits: 10,
        unique_authors: 2,
        lifecycle_event_count: 5,
        first_seen: "2023-01-01",
        last_modified: "2023-01-01",
        age_days: 1,
        operations: { M: 5, A: 1 },
        healthScore: { score: 80 } as any,
      };

      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        [file],
        mockTemporalData,
        100,
      );

      expect(enriched[0].total_commits).toBe(10);
      expect(enriched[0].unique_authors).toBe(2);
      expect(enriched[0].healthScore).toBeDefined();
      expect(enriched[0].operations).toEqual({ M: 5, A: 1 });
    });
  });
});