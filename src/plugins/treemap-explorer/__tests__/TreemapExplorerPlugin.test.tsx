// src/plugins/treemap-explorer/__tests__/TreemapExplorerPlugin.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TreemapExplorerPlugin } from "../TreemapExplorerPlugin";
import {
  createMockFileIndex,
  createMockProjectHierarchy,
  createMockFileMetricsIndex,
  createMockTreemapState,
  createMockContainer,
} from "@/test-utils";
import { ExportOptions } from "@/types/plugin";

// Mock child components to isolate plugin logic
vi.mock("../components/TreemapExplorerControls", () => ({
  TreemapExplorerControls: () => <div data-testid="controls">Controls</div>,
}));

vi.mock("../components/TreemapExplorerFilters", () => ({
  TreemapExplorerFilters: () => <div data-testid="filters">Filters</div>,
}));

vi.mock("../components/TreemapDetailPanel", () => ({
  default: () => <div data-testid="detail-panel">Detail Panel</div>,
}));

vi.mock("../components/TimelineScrubber", () => ({
  default: ({ onPlayToggle, onPositionChange }: any) => (
    <div data-testid="timeline-scrubber">
      <button onClick={onPlayToggle} data-testid="play-button">
        Play
      </button>
      <button onClick={() => onPositionChange(50)} data-testid="seek-button">
        Seek
      </button>
    </div>
  ),
}));

describe("TreemapExplorerPlugin Coverage", () => {
  let plugin: TreemapExplorerPlugin;
  let container: HTMLElement;

  const mockFileData = [
    {
      key: "src/A.ts",
      total_commits: 100,
      unique_authors: 5,
      lifecycle_event_count: 10,
    },
    {
      key: "src/B.ts",
      total_commits: 50,
      unique_authors: 3,
      lifecycle_event_count: 5,
    },
  ];

  const mockFileIndex = createMockFileIndex({ files: mockFileData });

  const mockExportOptions: ExportOptions = { format: "json" };

  beforeEach(() => {
    container = createMockContainer();
    plugin = new TreemapExplorerPlugin();
    plugin.init(container, createMockTreemapState());

    // PHASE 5: Provide all required datasets
    plugin.processData({
      file_index: { files: mockFileIndex },
      project_hierarchy: createMockProjectHierarchy({ files: mockFileData }),
      file_metrics_index: createMockFileMetricsIndex({ files: mockFileData }),
    });
  });

  afterEach(() => {
    plugin.destroy();
    vi.restoreAllMocks();
  });

  describe("UI Rendering (React)", () => {
    it("should render UI components via renderUI", () => {
      const state = createMockTreemapState();
      const updateState = vi.fn();

      const { getByTestId } = render(plugin.renderUI(state, updateState));

      expect(getByTestId("controls")).toBeInTheDocument();
      expect(getByTestId("filters")).toBeInTheDocument();
    });

    it("should render detail panel when file is selected", () => {
      const state = createMockTreemapState({ selectedFile: "src/A.ts" });
      const updateState = vi.fn();

      const { getByTestId } = render(plugin.renderUI(state, updateState));

      expect(getByTestId("detail-panel")).toBeInTheDocument();
    });

    it("should render timeline scrubber in time lens mode", () => {
      // Need temporal data for scrubber to show
      plugin.processData({
        file_index: { files: mockFileIndex },
        project_hierarchy: createMockProjectHierarchy({ files: mockFileData }),
        file_metrics_index: createMockFileMetricsIndex({ files: mockFileData }),
        temporal_daily: {
          date_range: { min: "2020-01-01", max: "2021-01-01" },
          days: [],
        },
      });

      const state = createMockTreemapState({ lensMode: "time" });
      const updateState = vi.fn();

      const { getByTestId } = render(plugin.renderUI(state, updateState));

      expect(getByTestId("timeline-scrubber")).toBeInTheDocument();
    });

    it("should render controls via renderControls", () => {
      const props = {
        state: createMockTreemapState(),
        updateState: vi.fn(),
        data: [],
        width: 100,
        height: 100,
      } as any;

      const { getByTestId } = render(plugin.renderControls(props));
      expect(getByTestId("controls")).toBeInTheDocument();
    });

    it("should render filters via renderFilters", () => {
      const props = {
        state: createMockTreemapState(),
        updateState: vi.fn(),
        data: [],
        width: 100,
        height: 100,
        onClose: vi.fn(),
      } as any;

      const { getByTestId } = render(plugin.renderFilters(props));
      expect(getByTestId("filters")).toBeInTheDocument();
    });
  });

  describe("Abort Handling (Phase 2)", () => {
    it("should throw if aborted before processing", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        plugin.processDataCancellable({}, controller.signal),
      ).rejects.toThrow("Operation aborted");
    });

    it("should respect abort signal during render", () => {
      const controller = new AbortController();

      // Hack: Access private property to set signal
      (plugin as any).currentSignal = controller.signal;
      controller.abort();

      const consoleSpy = vi.spyOn(console, "log");

      plugin.render([], createMockTreemapState());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Aborted"),
      );
    });
  });

  describe("Interaction & Events", () => {
    it("should handle cell clicks", () => {
      const onCellClick = vi.fn();
      const state = createMockTreemapState({ onCellClick });

      plugin.render(plugin.exportData(mockExportOptions), state);

      const cell = container.querySelector('rect[data-file-key="src/A.ts"]');
      expect(cell).toBeTruthy();

      // Simulate D3 click event
      if (cell) {
        cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }

      expect(onCellClick).toHaveBeenCalled();
    });

    it("should handle playback controls", () => {
      vi.useFakeTimers();
      const updateState = vi.fn();

      // Setup temporal data
      plugin.processData({
        file_index: { files: mockFileIndex },
        project_hierarchy: createMockProjectHierarchy({ files: mockFileData }),
        file_metrics_index: createMockFileMetricsIndex({ files: mockFileData }),
        temporal_daily: {
          date_range: { min: "2020-01-01", max: "2021-01-01" },
          days: [],
        },
      });

      const state = createMockTreemapState({
        lensMode: "time",
        playing: false,
      });
      const { getByTestId } = render(plugin.renderUI(state, updateState));

      // Toggle Play
      fireEvent.click(getByTestId("play-button"));
      expect(updateState).toHaveBeenCalledWith({ playing: true });

      vi.useRealTimers();
    });
  });

  describe("Size Metrics", () => {
    it("should calculate size by authors", () => {
      const state = createMockTreemapState({ sizeMetric: "authors" });
      plugin.render(plugin.exportData(mockExportOptions), state);
      expect(container.querySelectorAll("rect").length).toBe(2);
    });

    it("should calculate size by events", () => {
      const state = createMockTreemapState({ sizeMetric: "events" });
      plugin.render(plugin.exportData(mockExportOptions), state);
      expect(container.querySelectorAll("rect").length).toBe(2);
    });
  });

  describe("Exports", () => {
    it("should export data", () => {
      const data = plugin.exportData(mockExportOptions);
      expect(data).toHaveLength(2);
      expect(data[0].key).toBe("src/A.ts");
    });

    it("should export image (stub)", async () => {
      const blob = await plugin.exportImage(mockExportOptions);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe("Coupling Lens", () => {
    it("should render arcs when enabled", () => {
      const state = createMockTreemapState({
        lensMode: "coupling",
        selectedFile: "src/A.ts",
        showArcs: true,
      });

      plugin.render(plugin.exportData(mockExportOptions), state);

      // Check if the coupling-arcs group is created
      expect(container.querySelector(".coupling-arcs")).toBeInTheDocument();
    });

    it("should apply opacity to non-selected files in coupling mode", () => {
      const state = createMockTreemapState({
        lensMode: "coupling",
        selectedFile: "src/A.ts",
      });

      plugin.render(plugin.exportData(mockExportOptions), state);

      const selectedCell = container.querySelector(
        'rect[data-file-key="src/A.ts"]',
      ) as HTMLElement;
      const otherCell = container.querySelector(
        'rect[data-file-key="src/B.ts"]',
      ) as HTMLElement;

      expect(selectedCell.style.opacity).toBe("1");
      expect(otherCell.style.opacity).toBe("0.1");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources", () => {
      const stopPlaybackSpy = vi.spyOn(plugin as any, "stopPlayback");
      plugin.cleanup();
      expect(stopPlaybackSpy).toHaveBeenCalled();
    });
  });
});