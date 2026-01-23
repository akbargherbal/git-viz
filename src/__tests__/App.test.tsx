// src/__tests__/App.test.tsx

// Mocks must be defined before imports to avoid hoisting issues in some environments
import { vi } from "vitest";

vi.mock("@/plugins/core/PluginRegistry");
vi.mock("@/services/data/PluginDataLoader");
vi.mock("@/services/data/DataProcessor");
vi.mock("@/plugins/init", () => ({})); // Mock side-effect import

// Component Mocks
vi.mock("@/components/layout/PluginSelector", () => ({
  PluginSelector: ({ plugins }: any) => (
    <div data-testid="plugin-selector">
      {plugins.map((p: any) => p.metadata.name).join(", ")}
    </div>
  ),
}));

vi.mock("@/components/common/FilterPanel", () => ({
  FilterPanel: () => <div data-testid="filter-panel">Filter Panel</div>,
}));

vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: ({ message }: any) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

vi.mock("@/components/common/ErrorDisplay", () => ({
  ErrorDisplay: ({ error }: any) => (
    <div data-testid="error-display">{error}</div>
  ),
}));

vi.mock("@/plugins/treemap-explorer/components/TreemapDetailPanel", () => ({
  default: () => <div data-testid="treemap-detail-panel">DetailPanel</div>,
}));

vi.mock("@/plugins/timeline-heatmap/components/CellDetailPanel", () => ({
  CellDetailPanel: () => (
    <div data-testid="cell-detail-panel">CellDetailPanel</div>
  ),
}));

// Now import the rest
import { describe, it, expect, beforeEach } from "@/test-utils";
import { render, screen, waitFor, fireEvent } from "@/test-utils";
import App from "../App";
import { PluginRegistry } from "@/plugins/core/PluginRegistry";
import { PluginDataLoader } from "@/services/data/PluginDataLoader";
import { DataProcessor } from "@/services/data/DataProcessor";
import { createMockPlugin } from "@/test-utils";
import { useAppStore } from "@/store/appStore";

describe("App Integration", () => {
  const mockPlugin = createMockPlugin({
    id: "test-plugin",
    name: "Test Plugin",
    priority: 1,
  });

  // Add required methods for App.tsx interaction
  mockPlugin.init = vi.fn();
  mockPlugin.render = vi.fn();
  mockPlugin.processData = vi.fn().mockReturnValue({ processed: true });
  mockPlugin.cleanup = vi.fn();
  mockPlugin.defaultConfig = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store state
    useAppStore.setState({
      data: {
        metadata: null,
        tree: null,
        activity: [],
        loading: false,
        error: null,
      },
      ui: {
        activePluginId: null,
        selectedCell: null,
        showFilters: false,
        collapsedDirs: new Set(),
      },
      filters: {
        authors: new Set(),
        directories: new Set(),
        fileTypes: new Set(),
        eventTypes: new Set(),
        timeRange: null,
        timeBin: "week",
        metric: "commits",
      },
      pluginStates: {},
    });

    // Setup PluginRegistry mocks
    vi.mocked(PluginRegistry.getAll).mockReturnValue([mockPlugin]);
    vi.mocked(PluginRegistry.get).mockReturnValue(mockPlugin);
    vi.mocked(PluginRegistry.getDataRequirements).mockReturnValue([]);

    // Setup Data Loader mocks
    vi.mocked(PluginDataLoader.loadForPlugin).mockResolvedValue({
      success: true,
      data: {
        metadata: { repository_name: "Test Repo" },
        file_index: {},
        lifecycle: {},
        authors: [],
        files: [],
        dirs: {},
      },
      errors: [],
      warnings: [],
    });

    // Setup Data Processor mocks
    vi.mocked(DataProcessor.processRawData).mockReturnValue({
      metadata: { repository_name: "Test Repo" } as any,
      tree: { name: "root" } as any,
      activity: [],
    });
  });

  it("should render initial layout", async () => {
    render(<App />);

    // Header should be visible
    expect(
      screen.getByText("Git Repository Visualization"),
    ).toBeInTheDocument();

    // Plugin selector should show the mock plugin
    expect(screen.getByTestId("plugin-selector")).toHaveTextContent(
      "Test Plugin",
    );
  });

  it("should load data for the active plugin", async () => {
    render(<App />);

    // Wait for data loader to be called (this happens quickly with instant mock resolution)
    await waitFor(
      () => {
        expect(PluginDataLoader.loadForPlugin).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Verify loading eventually completes (spinner may not be visible due to fast resolution)
    await waitFor(
      () => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should handle data loading errors", async () => {
    vi.mocked(PluginDataLoader.loadForPlugin).mockResolvedValueOnce({
      success: false,
      data: {} as any,
      errors: ["Network error"],
      warnings: [],
    });

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByTestId("error-display")).toHaveTextContent(
          "Failed to load data: Network error",
        );
      },
      { timeout: 3000 },
    );
  });

  it("should initialize and render the plugin", async () => {
    render(<App />);

    // Wait for all plugin lifecycle methods to be called
    // These happen in sequence: processData -> init -> render
    await waitFor(
      () => {
        expect(mockPlugin.processData).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(mockPlugin.init).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(mockPlugin.render).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("should toggle filter panel", async () => {
    render(<App />);

    // Wait for initial render to complete
    await waitFor(
      () => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const filterButton = screen.getByTitle("Filters");
    fireEvent.click(filterButton);

    expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
  });
});
