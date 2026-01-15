// src/services/data/__tests__/DatasetRegistry.test.ts

import { describe, it, expect } from "vitest"; // Assuming vitest will be used
import { DatasetRegistry } from "../DatasetRegistry";

describe("DatasetRegistry", () => {
  it("should return correct paths for existing datasets", () => {
    // Verify critical paths that were previously broken
    expect(DatasetRegistry.getPath("file_lifecycle")).toBe(
      "/DATASETS_excalidraw/file_lifecycle.json"
    );
    expect(DatasetRegistry.getPath("file_index")).toBe(
      "/DATASETS_excalidraw/metadata/file_index.json"
    );
    expect(DatasetRegistry.getPath("release_snapshots")).toBe(
      "/DATASETS_excalidraw/milestones/release_snapshots.json"
    );
  });

  it("should return null for non-existent datasets", () => {
    expect(DatasetRegistry.getPath("non_existent_dataset")).toBeNull();
  });

  it("should validate dataset existence correctly", () => {
    const result = DatasetRegistry.validateDatasets([
      "file_lifecycle",
      "fake_dataset",
    ]);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain("fake_dataset");
    expect(result.available).toContain("file_lifecycle");
  });

  it("should list datasets by type", () => {
    const timeSeries = DatasetRegistry.listByType("time_series");
    expect(timeSeries).toContain("temporal_daily");
    expect(timeSeries).toContain("temporal_monthly");
    // Ensure removed datasets are not present
    expect(timeSeries).not.toContain("temporal_weekly");
  });

  it("should provide dataset definitions", () => {
    const def = DatasetRegistry.getDefinition("directory_stats");
    expect(def).toBeDefined();
    expect(def?.type).toBe("hierarchy");
    expect(def?.path).toContain("directory_stats.json");
  });
});
