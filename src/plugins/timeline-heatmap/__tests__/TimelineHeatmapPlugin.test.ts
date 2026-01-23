import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TimelineHeatmapPlugin } from "../TimelineHeatmapPlugin";
import { createMockContainer, destroyMockContainer } from "@/test-utils";
import { DataProcessor } from "@/services/data/DataProcessor";

// Mock DataProcessor to avoid complex data processing logic in unit tests
vi.mock("@/services/data/DataProcessor", () => ({
  DataProcessor: {
    processRawData: vi.fn(),
  },
}));

describe("TimelineHeatmapPlugin", () => {
  let plugin: TimelineHeatmapPlugin;
  let container: HTMLElement;

  beforeEach(() => {
    plugin = new TimelineHeatmapPlugin();
    container = createMockContainer();
    plugin.init(container, plugin.defaultConfig);
  });

  afterEach(() => {
    plugin.destroy();
    destroyMockContainer(container);
    vi.clearAllMocks();
  });

  describe("Lifecycle", () => {
    it("should initialize correctly", () => {
      expect(plugin.metadata.id).toBe("timeline-heatmap");
      expect(container.style.overflow).toBe("auto");
    });

    it("should provide initial state", () => {
      const state = plugin.getInitialState();
      expect(state).toEqual({
        metric: "events",
        timeBin: "week",
        selectedAuthors: [],
        selectedExtensions: [],
      });
    });

    it("should handle cleanup", () => {
      const consoleSpy = vi.spyOn(console, "log");
      plugin.cleanup();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cleanup called"),
      );
    });
  });

  describe("Data Processing", () => {
    const mockDataset = {
      lifecycle: {},
      authors: [],
      files: {},
      dirs: [],
    };

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
        {
          id: 1,
          d: new Date("2024-01-01").getTime(),
          a: 5,
          m: 2,
          del: 1,
          c: 3,
          au: 2,
        },
      ],
    };

    beforeEach(() => {
      (DataProcessor.processRawData as any).mockReturnValue(mockOptimizedData);
    });

    it("should process raw dataset using DataProcessor", () => {
      plugin.processData(mockDataset);
      expect(DataProcessor.processRawData).toHaveBeenCalled();
    });

    it("should handle processed data correctly", () => {
      const result = plugin.processData(mockDataset);

      expect(result.directories).toContain("src");
      expect(result.cells.length).toBe(1); // One directory
      expect(result.cells[0].length).toBeGreaterThan(0); // Time bins

      // Check cell values
      const cell = result.cells[0][0];
      expect(cell.events).toBe(8); // 5 + 2 + 1
      expect(cell.commits).toBe(3);
      expect(cell.authors).toBe(2);
    });

    it("should respect metric configuration", () => {
      const config = { ...plugin.defaultConfig, metric: "commits" as const };
      const result = plugin.processData(mockDataset, config);

      // Value should match commits
      expect(result.cells[0][0].value).toBe(3);
    });

    it("should handle empty/invalid data gracefully", () => {
      (DataProcessor.processRawData as any).mockReturnValue(null);
      const result = plugin.processData(mockDataset);

      expect(result.cells).toEqual([]);
      expect(result.directories).toEqual([]);
    });
  });

  describe("Abort Handling", () => {
    it("should respect abort signal before processing", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        plugin.processDataCancellable({}, controller.signal),
      ).rejects.toThrow("Operation aborted");
    });

    it("should respect abort signal during processing", async () => {
      const controller = new AbortController();

      // Create a mock dataset that is valid enough to pass the initial checks
      // and trigger the traversal where the abort check happens.
      const validMockData = {
        metadata: { directory_stats: [] },
        tree: { id: 1, type: "directory", path: "root", children: [] },
        activity: [],
      };

      // Start the cancellable process
      const processPromise = plugin.processDataCancellable(
        validMockData,
        controller.signal,
      );

      // Trigger abort immediately
      controller.abort();

      // Manually set the internal flag to simulate the race condition where
      // the flag is set while processData is running.
      (plugin as any).aborted = true;

      // Now calling processData with valid data should throw because we set the flag
      // and the data is valid enough to reach the abort checks.
      expect(() => plugin.processData(validMockData)).toThrow(
        "Operation aborted",
      );

      // Clean up the promise rejection
      try {
        await processPromise;
      } catch (e) {
        // Expected
      }
    });
  });

  describe("Rendering", () => {
    it("should render heatmap table", () => {
      const data = {
        cells: [
          [
            {
              directory: "src",
              timeBin: new Date(),
              events: 10,
              commits: 5,
              authors: 2,
              creations: 0,
              deletions: 0,
              modifications: 10,
              value: 10,
              topContributors: [],
              topFiles: [],
            },
          ],
        ],
        directories: ["src"],
        timeBins: [new Date()],
        maxValue: 10,
      };

      plugin.render(data, plugin.defaultConfig);

      expect(container.querySelector("table")).toBeInTheDocument();
      expect(container.querySelector("th")?.textContent).toContain("Directory");
      expect(container.textContent).toContain("src");
    });

    it("should render controls", () => {
      const props = {
        state: plugin.getInitialState(),
        updateState: vi.fn(),
        data: null,
        config: plugin.defaultConfig,
      };

      const controls = plugin.renderControls(props);
      expect(controls).toBeDefined();
      expect(controls.props.className).toContain("flex gap-4");
    });
  });
});
