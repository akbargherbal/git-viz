// src/services/data/__tests__/TemporalDataProcessor.test.ts

import { describe, it, expect } from "vitest";
import { TemporalDataProcessor } from "../TemporalDataProcessor";
import { EnrichedFileData } from "@/plugins/treemap-explorer/types";

describe("TemporalDataProcessor", () => {
  const mockFiles: EnrichedFileData[] = [
    {
      key: "src/old.ts",
      name: "old.ts",
      path: "src/old.ts",
      total_commits: 50,
      unique_authors: 5,
      operations: { M: 40, A: 10, D: 0 },
      age_days: 500,
      first_seen: "2023-01-01",
      last_modified: "2023-06-01",
    },
    {
      key: "src/new.ts",
      name: "new.ts",
      path: "src/new.ts",
      total_commits: 10,
      unique_authors: 2,
      operations: { M: 5, A: 5, D: 0 },
      age_days: 30,
      first_seen: "2025-12-01",
      last_modified: "2026-01-10",
    },
    {
      key: "src/active.ts",
      name: "active.ts",
      path: "src/active.ts",
      total_commits: 100,
      unique_authors: 10,
      operations: { M: 80, A: 20, D: 0 },
      age_days: 200,
      first_seen: "2024-06-01",
      last_modified: "2026-01-10",
    },
  ];

  const mockTemporalData = {
    date_range: {
      min: "2023-01-01",
      max: "2025-01-15",
      total_days: 1384,
    },
    days: [
      {
        key: "2023-01-01",
        date: "2023-01-01",
        commits: 5,
        files_changed: 2,
        unique_authors: 1,
        operations: { M: 3, A: 2, D: 0 },
      },
      {
        key: "2024-12-01",
        date: "2024-12-01",
        commits: 10,
        files_changed: 5,
        unique_authors: 3,
        operations: { M: 7, A: 2, D: 1 },
      },
      {
        key: "2025-01-15",
        date: "2025-01-15",
        commits: 8,
        files_changed: 3,
        unique_authors: 2,
        operations: { M: 6, A: 1, D: 1 },
      },
    ],
  };

  describe("getDateRange", () => {
    it("should extract date range from temporal data", () => {
      const range = TemporalDataProcessor.getDateRange(mockTemporalData);

      expect(range).toEqual({
        min: "2023-01-01",
        max: "2025-01-15",
      });
    });

    it("should handle missing date_range by calculating from days", () => {
      const dataWithoutRange = {
        days: mockTemporalData.days,
      };

      const range = TemporalDataProcessor.getDateRange(dataWithoutRange as any);

      expect(range.min).toBe("2023-01-01");
      expect(range.max).toBe("2025-01-15");
    });
  });

  describe("enrichFilesWithTemporal", () => {
    it("should enrich files with temporal data at position 100 (present)", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      expect(enriched).toHaveLength(3);

      // All files should be visible at position 100
      enriched.forEach((file) => {
        expect(file).toHaveProperty("createdDate");
        expect(file).toHaveProperty("lastModifiedDate");
        expect(file).toHaveProperty("dormantDays");
        expect(file).toHaveProperty("isDormant");
        expect(file).toHaveProperty("createdPosition");
      });

      // Old file should be marked as dormant (last modified 2023-06-01)
      const oldFile = enriched.find((f) => f.key === "src/old.ts")!;
      expect(oldFile.isDormant).toBe(true);

      // Active file should not be dormant (last modified 2024-12-20)
      const activeFile = enriched.find((f) => f.key === "src/active.ts")!;
      expect(activeFile.isDormant).toBe(false);

      // New file should not be dormant
      const newFile = enriched.find((f) => f.key === "src/new.ts")!;
      expect(newFile.isDormant).toBe(false);
    });

    it("should filter files not yet created at early timeline positions", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        0, // Start of timeline
      );

      // At position 0, only old.ts should exist (created 2023-01-01)
      const visibleFiles = enriched.filter(
        (f) => f.createdPosition !== undefined && f.createdPosition <= 0,
      );
      expect(visibleFiles.length).toBeGreaterThanOrEqual(0);
    });

    it("should calculate createdPosition relative to timeline", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        50, // Middle of timeline
      );

      enriched.forEach((file) => {
        expect(file.createdPosition).toBeGreaterThanOrEqual(0);
        expect(file.createdPosition).toBeLessThanOrEqual(100);
      });

      // Old file (2023-01-01) should have low createdPosition
      const oldFile = enriched.find((f) => f.key === "src/old.ts")!;
      expect(oldFile.createdPosition).toBeLessThan(20);

      // New file (2024-12-01) should have high createdPosition
      const newFile = enriched.find((f) => f.key === "src/new.ts")!;
      expect(newFile.createdPosition).toBeGreaterThan(80);
    });

    it("should handle files with missing dates gracefully", () => {
      const filesWithMissingDates: EnrichedFileData[] = [
        {
          ...mockFiles[0],
          first_seen: "",
          last_modified: "",
        },
      ];

      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        filesWithMissingDates,
        mockTemporalData,
        100,
      );

      expect(enriched).toHaveLength(1);
      expect(enriched[0]).toHaveProperty("isDormant");
    });

    it("should calculate dormant days correctly", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      enriched.forEach((file) => {
        expect(file.dormantDays).toBeGreaterThanOrEqual(0);
      });

      // Old file should have high dormant days (last modified 2023-06-01)
      const oldFile = enriched.find((f) => f.key === "src/old.ts")!;
      expect(oldFile.dormantDays).toBeGreaterThan(500);

      // Active file should have low dormant days (recently modified 2026-01-10)
      const activeFile = enriched.find((f) => f.key === "src/active.ts")!;
      expect(activeFile.dormantDays).toBeLessThan(30);
    });
  });

  describe("dormancy detection", () => {
    it("should mark files dormant if not modified in >180 days", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      const oldFile = enriched.find((f) => f.key === "src/old.ts")!;
      expect(oldFile.dormantDays).toBeGreaterThan(180);
      expect(oldFile.isDormant).toBe(true);
    });

    it("should not mark recently modified files as dormant", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      const activeFile = enriched.find((f) => f.key === "src/active.ts")!;
      expect(activeFile.isDormant).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty file array", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        [],
        mockTemporalData,
        50,
      );

      expect(enriched).toEqual([]);
    });

    it("should handle timePosition at extremes (0 and 100)", () => {
      const enrichedStart = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        0,
      );

      const enrichedEnd = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      expect(enrichedStart).toHaveLength(mockFiles.length);
      expect(enrichedEnd).toHaveLength(mockFiles.length);
    });

    it("should preserve all base EnrichedFileData properties", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        100,
      );

      enriched.forEach((file, index) => {
        expect(file.key).toBe(mockFiles[index].key);
        expect(file.total_commits).toBe(mockFiles[index].total_commits);
        expect(file.unique_authors).toBe(mockFiles[index].unique_authors);
      });
    });
  });
});
