// src/plugins/treemap-explorer/__tests__/TreemapExplorerPlugin.Temporal.test.tsx

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TreemapExplorerPlugin } from "../TreemapExplorerPlugin";
import { TreemapExplorerState } from "../types";
import { TemporalDataProcessor } from "@/services/data/TemporalDataProcessor";
import {
  createTemporalFile,
  createMockProjectHierarchy,
  createMockFileMetricsIndex,
  createMockTemporalData,
  createMockTreemapState,
} from "@/test-utils/factories";

describe("TreemapExplorerPlugin - Temporal Behavior", () => {
  let plugin: TreemapExplorerPlugin;
  let container: HTMLElement;

  beforeEach(() => {
    plugin = new TreemapExplorerPlugin();
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
  });

  /**
   * Helper to create complete dataset with optional temporal_daily
   */
  const createDataset = (options: {
    includeTemporalDaily?: boolean;
    filesWithoutDates?: boolean;
  } = {}) => {
    const files = options.filesWithoutDates
      ? [
          createTemporalFile({
            key: "src/App.tsx",
            path: "src/App.tsx",
            first_seen: undefined,
            last_modified: undefined,
          }),
        ]
      : [
          createTemporalFile({
            key: "src/App.tsx",
            path: "src/App.tsx",
            first_seen: "2023-01-15",
            last_modified: "2024-01-20",
          }),
          createTemporalFile({
            key: "src/utils/helper.ts",
            path: "src/utils/helper.ts",
            first_seen: "2023-06-10",
            last_modified: "2024-01-15",
          }),
        ];

    const dataset: any = {
      project_hierarchy: createMockProjectHierarchy({ files }),
      file_metrics_index: createMockFileMetricsIndex({ files }),
      file_index: {
        files: files.reduce((acc, f) => {
          acc[f.key] = {
            path: f.path,
            total_commits: f.total_commits,
            unique_authors: f.unique_authors,
            first_seen: f.first_seen,
            last_modified: f.last_modified,
            age_days: f.age_days,
            operations: f.operations,
            lifecycle_event_count: 50,
            primary_author: {
              email: "dev@example.com",
              commit_count: 30,
              percentage: 60,
            },
          };
          return acc;
        }, {} as any),
      },
    };

    if (options.includeTemporalDaily) {
      dataset.temporal_daily = createMockTemporalData();
    }

    return dataset;
  };

  describe("BASELINE: Normal Behavior (Post-Fix)", () => {
    it("should show scrubber when files have date metadata (fallback works)", () => {
      const datasets = createDataset({ includeTemporalDaily: false });
      const state: TreemapExplorerState = createMockTreemapState({
        lensMode: "time",
      });

      plugin.init(container, state);
      plugin.processData(datasets, state);

      const overlayProps = {
        state,
        updateState: vi.fn(),
        data: [],
      };
      const overlay = plugin.renderOverlay(overlayProps);

      expect(overlay).not.toBeNull();
      
      const dateRange = (plugin as any).dateRange;
      expect(dateRange).not.toBeNull();
      expect(dateRange.min).toBe("2023-01-15");
      expect(dateRange.max).toBe("2024-01-20");
    });

    it("should show scrubber when temporal_daily is present", () => {
      const datasets = createDataset({ includeTemporalDaily: true });
      const state: TreemapExplorerState = createMockTreemapState({
        lensMode: "time",
      });

      plugin.init(container, state);
      plugin.processData(datasets, state);

      const overlayProps = {
        state,
        updateState: vi.fn(),
        data: [],
      };
      const overlay = plugin.renderOverlay(overlayProps);

      expect(overlay).not.toBeNull();
      
      const dateRange = (plugin as any).dateRange;
      expect(dateRange).not.toBeNull();
      expect(dateRange.min).toBe("2022-01-01");
      expect(dateRange.max).toBe("2025-01-15");
    });

    it("should show scrubber with defaults when files lack ALL date metadata", () => {
      const datasets = createDataset({
        includeTemporalDaily: false,
        filesWithoutDates: true,
      });
      const state: TreemapExplorerState = createMockTreemapState({
        lensMode: "time",
      });

      plugin.init(container, state);
      plugin.processData(datasets, state);

      const overlayProps = {
        state,
        updateState: vi.fn(),
        data: [],
      };
      const overlay = plugin.renderOverlay(overlayProps);

      expect(overlay).not.toBeNull();
      
      const dateRange = (plugin as any).dateRange;
      expect(dateRange).toEqual({
        min: "2020-01-01",
        max: "2024-12-31",
      });
    });
  });

  describe("BASELINE: TemporalDataProcessor Safe Defaults", () => {
    it("should return default range when getDateRange receives null", () => {
      const result = TemporalDataProcessor.getDateRange(null as any);

      expect(result).toEqual({
        min: "2020-01-01",
        max: "2024-12-31",
      });
    });

    it("should handle empty days array", () => {
      const result = TemporalDataProcessor.getDateRange({
        days: [],
      } as any);

      expect(result).toEqual({
        min: "2020-01-01",
        max: "2024-12-31",
      });
    });
  });

  describe("PHASE 1: Split-Brain Fix - Verification", () => {
    it("FIXED: scrubber visible even when files lack ALL date metadata", () => {
      const datasets = createDataset({
        includeTemporalDaily: false,
        filesWithoutDates: true,
      });
      const state: TreemapExplorerState = createMockTreemapState({
        lensMode: "time",
      });

      plugin.init(container, state);
      plugin.processData(datasets, state);

      const overlayProps = {
        state,
        updateState: vi.fn(),
        data: [],
      };
      const overlay = plugin.renderOverlay(overlayProps);

      expect(overlay).not.toBeNull();
      
      const dateRange = (plugin as any).dateRange;
      expect(dateRange).not.toBeNull();
      expect(dateRange).toEqual({
        min: "2020-01-01",
        max: "2024-12-31",
      });
    });

    it("should use default date range when temporal_daily is null", () => {
      const datasets = createDataset({
        includeTemporalDaily: false,
        filesWithoutDates: true,
      });
      const state: TreemapExplorerState = createMockTreemapState({
        lensMode: "time",
      });

      plugin.init(container, state);
      plugin.processData(datasets, state);

      const dateRange = (plugin as any).dateRange;
      expect(dateRange).toEqual({
        min: "2020-01-01",
        max: "2024-12-31",
      });
    });

    it("REGRESSION: maintains existing behavior when temporal_daily is present", () => {
      const datasets = createDataset({ includeTemporalDaily: true });
      const state: TreemapExplorerState = createMockTreemapState({
        lensMode: "time",
      });

      plugin.init(container, state);
      plugin.processData(datasets, state);

      const overlayProps = {
        state,
        updateState: vi.fn(),
        data: [],
      };
      const overlay = plugin.renderOverlay(overlayProps);

      expect(overlay).not.toBeNull();
      
      const dateRange = (plugin as any).dateRange;
      expect(dateRange.min).toBe("2022-01-01");
      expect(dateRange.max).toBe("2025-01-15");
    });

    it("REGRESSION: maintains fallback behavior when files have dates", () => {
      const datasets = createDataset({ includeTemporalDaily: false });
      const state: TreemapExplorerState = createMockTreemapState({
        lensMode: "time",
      });

      plugin.init(container, state);
      plugin.processData(datasets, state);

      const dateRange = (plugin as any).dateRange;
      expect(dateRange.min).toBe("2023-01-15");
      expect(dateRange.max).toBe("2024-01-20");
    });
  });
});
