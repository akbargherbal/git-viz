/**
 * DataFormatAdapter.test.ts
 * 
 * Tests for data format adaptation and normalization
 */

import { describe, it, expect } from "vitest";
import {
  DataFormatAdapter,
  DataFormat,
  type AdaptedDataset,
} from "../DataFormatAdapter";

describe("DataFormatAdapter", () => {
  describe("Format Detection", () => {
    it("should detect V2.1 frontend format", () => {
      const dataset = {
        project_hierarchy: { name: "root", children: [] },
        file_metrics_index: {},
        file_index: [],
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);
      expect(result.format).toBe(DataFormat.V2_1_FRONTEND);
    });

    it("should detect legacy format", () => {
      const dataset = {
        some_old_field: "value",
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);
      // Should still adapt to target format
      expect(result.format).toBe(DataFormat.V2_1_FRONTEND);
    });
  });

  describe("V2.1 Format Adaptation", () => {
    it("should create empty temporal_daily if missing", () => {
      const dataset = {
        project_hierarchy: { name: "root", children: [] },
        file_metrics_index: {},
        file_index: [],
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);

      expect(result.data.temporal_daily).toBeDefined();
      expect(result.data.temporal_daily.days).toEqual([]);
      expect(result.adaptations).toContain("created_empty_temporal_daily");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should normalize temporal_daily.days from object to array", () => {
      const dataset = {
        project_hierarchy: { name: "root", children: [] },
        file_metrics_index: {},
        file_index: [],
        temporal_daily: {
          days: {
            "2024-01-01": { date: "2024-01-01", files: [] },
            "2024-01-02": { date: "2024-01-02", files: [] },
          },
          date_range: { min: "2024-01-01", max: "2024-01-02" },
        },
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);

      expect(Array.isArray(result.data.temporal_daily.days)).toBe(true);
      expect(result.data.temporal_daily.days).toHaveLength(2);
      expect(result.adaptations).toContain("normalized_temporal_daily_to_array");
    });

    it("should preserve existing temporal_daily array", () => {
      const dataset = {
        project_hierarchy: { name: "root", children: [] },
        file_metrics_index: {},
        file_index: [],
        temporal_daily: {
          days: [
            { date: "2024-01-01", files: [] },
            { date: "2024-01-02", files: [] },
          ],
          date_range: { min: "2024-01-01", max: "2024-01-02" },
        },
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);

      expect(Array.isArray(result.data.temporal_daily.days)).toBe(true);
      expect(result.data.temporal_daily.days).toHaveLength(2);
      expect(result.adaptations).not.toContain("normalized_temporal_daily_to_array");
    });

    it("should create empty file_lifecycle if missing", () => {
      const dataset = {
        project_hierarchy: { name: "root", children: [] },
        file_metrics_index: {},
        file_index: [],
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);

      expect(result.data.file_lifecycle).toBeDefined();
      expect(result.data.file_lifecycle.files).toEqual({});
      expect(result.adaptations).toContain("created_empty_file_lifecycle");
    });

    it("should create empty cochange_network if missing", () => {
      const dataset = {
        project_hierarchy: { name: "root", children: [] },
        file_metrics_index: {},
        file_index: [],
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);

      expect(result.data.cochange_network).toBeDefined();
      expect(result.data.cochange_network.nodes).toEqual([]);
      expect(result.data.cochange_network.links).toEqual([]);
      expect(result.adaptations).toContain("created_empty_cochange_network");
    });

    it("should warn about missing required datasets", () => {
      const dataset = {
        // Missing all required datasets
      };

      const result = DataFormatAdapter.adapt(dataset, DataFormat.V2_1_FRONTEND);

      expect(result.warnings).toContain("Missing required dataset: project_hierarchy");
      expect(result.warnings).toContain("Missing required dataset: file_metrics_index");
      expect(result.warnings).toContain("Missing required dataset: file_index");
    });
  });

  describe("Plugin Validation", () => {
    it("should validate required datasets are present", () => {
      const dataset = {
        project_hierarchy: {},
        file_metrics_index: {},
        file_index: [],
      };

      const requirements = [
        { dataset: "project_hierarchy", required: true },
        { dataset: "file_metrics_index", required: true },
        { dataset: "file_index", required: true },
      ];

      const result = DataFormatAdapter.validateForPlugin(
        dataset,
        "test-plugin",
        requirements
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should error on missing required datasets", () => {
      const dataset = {
        project_hierarchy: {},
        // Missing file_metrics_index and file_index
      };

      const requirements = [
        { dataset: "project_hierarchy", required: true },
        { dataset: "file_metrics_index", required: true },
        { dataset: "file_index", required: true },
      ];

      const result = DataFormatAdapter.validateForPlugin(
        dataset,
        "test-plugin",
        requirements
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("file_metrics_index");
      expect(result.errors[1]).toContain("file_index");
    });

    it("should warn on missing optional datasets", () => {
      const dataset = {
        project_hierarchy: {},
        file_metrics_index: {},
        file_index: [],
        // Missing temporal_daily (optional)
      };

      const requirements = [
        { dataset: "project_hierarchy", required: true },
        { dataset: "temporal_daily", required: false },
      ];

      const result = DataFormatAdapter.validateForPlugin(
        dataset,
        "test-plugin",
        requirements
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("temporal_daily");
    });
  });

  describe("Empty Dataset Creation", () => {
    it("should create valid empty V2.1 dataset", () => {
      const empty = DataFormatAdapter.createEmptyDataset(
        DataFormat.V2_1_FRONTEND
      );

      expect(empty.project_hierarchy).toBeDefined();
      expect(empty.project_hierarchy.name).toBe("root");
      expect(empty.file_metrics_index).toEqual({});
      expect(empty.file_index).toEqual([]);
      expect(empty.temporal_daily.days).toEqual([]);
      expect(empty.file_lifecycle.files).toEqual({});
      expect(empty.cochange_network.nodes).toEqual([]);
    });
  });

  describe("Adaptation Logging", () => {
    it("should not throw when logging adaptations", () => {
      const result: AdaptedDataset = {
        data: {},
        format: DataFormat.V2_1_FRONTEND,
        adaptations: ["test_adaptation"],
        warnings: ["test_warning"],
      };

      expect(() => {
        DataFormatAdapter.logAdaptation(result);
      }).not.toThrow();
    });
  });
});