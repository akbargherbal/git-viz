import { describe, it, expect, beforeEach, vi } from "vitest";
import { TimelineHeatmapPlugin } from "../TimelineHeatmapPlugin";
import { DataProcessor } from "@/services/data/DataProcessor";

vi.mock("@/services/data/DataProcessor", () => ({
  DataProcessor: {
    processRawData: vi.fn(),
  },
}));

describe("TimelineHeatmapPlugin - Granularity & Continuity", () => {
  let plugin: TimelineHeatmapPlugin;

  beforeEach(() => {
    plugin = new TimelineHeatmapPlugin();
  });

  it("should include empty time bins when activity has gaps", () => {
    const mockOptimizedData = {
      metadata: {
        directory_stats: [{ path: "src", activity_score: 100 }],
      },
      tree: {
        id: 1,
        type: "directory",
        path: "src",
        children: [],
      },
      activity: [
        // Week 1: Activity present
        {
          id: 1,
          d: "2024-01-01", // Monday
          a: 5,
          m: 0,
          del: 0,
          c: 1,
          au: 1,
        },
        // Week 2: NO ACTIVITY (Gap)
        // Week 3: Activity present
        {
          id: 1,
          d: "2024-01-15", // Monday (2 weeks later)
          a: 5,
          m: 0,
          del: 0,
          c: 1,
          au: 1,
        },
      ],
    };

    (DataProcessor.processRawData as any).mockReturnValue(mockOptimizedData);

    const mockRawDataset = {
      lifecycle: {},
      authors: [],
      files: {},
      dirs: [],
    };

    const config = { ...plugin.defaultConfig, timeBin: "week" as const };
    const result = plugin.processData(mockRawDataset, config);

    // We expect 3 bins: Start (Week 1), Gap (Week 2), End (Week 3)
    expect(result.timeBins.length).toBe(3);

    // Verify they are sorted
    const times = result.timeBins.map((d) => d.getTime());
    expect(times[1]).toBeGreaterThan(times[0]);
    expect(times[2]).toBeGreaterThan(times[1]);
  });
});
