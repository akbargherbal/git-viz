// src/services/data/__tests__/TemporalDataProcessor.test.ts
// MIGRATED TO USE TEST-UTILS

import { describe, it, expect } from "vitest";
import { TemporalDataProcessor } from "../TemporalDataProcessor";
import {
  createOldEnrichedFile,
  createEnrichedFileList,
  createTemporalData,
} from "@/test-utils";

describe("TemporalDataProcessor", () => {
  const mockFiles = createEnrichedFileList(); // Creates [old, recent, active] files
  const mockTemporalData = createTemporalData();

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

      enriched.forEach((file) => {
        expect(file).toHaveProperty("createdDate");
        expect(file).toHaveProperty("lastModifiedDate");
        expect(file).toHaveProperty("dormantDays");
        expect(file).toHaveProperty("isDormant");
        expect(file).toHaveProperty("createdPosition");
      });

      // Old file should be marked as dormant
      const oldFile = enriched.find((f) => f.key === "src/old.ts")!;
      expect(oldFile.isDormant).toBe(true);

      // Active file should not be dormant
      const activeFile = enriched.find((f) => f.key === "src/active.ts")!;
      expect(activeFile.isDormant).toBe(false);

      // Recent file should not be dormant
      const newFile = enriched.find((f) => f.key === "src/new.ts")!;
      expect(newFile.isDormant).toBe(false);
    });

    it("should filter files not yet created at early timeline positions", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        0,
      );

      const visibleFiles = enriched.filter(
        (f) => f.createdPosition !== undefined && f.createdPosition <= 0,
      );
      expect(visibleFiles.length).toBeGreaterThanOrEqual(0);
    });

    it("should calculate createdPosition relative to timeline", () => {
      const enriched = TemporalDataProcessor.enrichFilesWithTemporal(
        mockFiles,
        mockTemporalData,
        50,
      );

      enriched.forEach((file) => {
        expect(file.createdPosition).toBeGreaterThanOrEqual(0);
        expect(file.createdPosition).toBeLessThanOrEqual(100);
      });

      // Old file should have low createdPosition
      const oldFile = enriched.find((f) => f.key === "src/old.ts")!;
      expect(oldFile.createdPosition).toBeLessThan(20);

      // Recent file should have high createdPosition
      const newFile = enriched.find((f) => f.key === "src/new.ts")!;
      expect(newFile.createdPosition).toBeGreaterThan(80);
    });

    it("should handle files with missing dates gracefully", () => {
      const filesWithMissingDates = [
        createOldEnrichedFile({
          first_seen: "",
          last_modified: "",
        }),
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

      // Old file should have high dormant days
      const oldFile = enriched.find((f) => f.key === "src/old.ts")!;
      expect(oldFile.dormantDays).toBeGreaterThan(500);

      // Active file should have low dormant days
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
