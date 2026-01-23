import { render, screen, fireEvent } from "@/test-utils/render";
import { TreemapExplorerControls } from "../TreemapExplorerControls";
import { createMockTreemapState } from "@/test-utils/factories";
import { vi } from "vitest";

describe("TreemapExplorerControls", () => {
  const mockUpdateState = vi.fn();
  const defaultState = createMockTreemapState({
    lensMode: "debt",
    sizeMetric: "commits",
  });
  const mockData = {}; // Mock data object

  beforeEach(() => {
    mockUpdateState.mockClear();
  });

  it("renders lens selector and metric controls", () => {
    render(
      <TreemapExplorerControls
        state={defaultState}
        updateState={mockUpdateState}
        data={mockData}
      />,
    );

    // Check Lens Selector presence (by role or text)
    expect(
      screen.getByRole("group", { name: /lens mode selector/i }),
    ).toBeInTheDocument();

    // Check Metric buttons
    expect(screen.getByText("Commits")).toBeInTheDocument();
    expect(screen.getByText("Authors")).toBeInTheDocument();
  });

  it("updates lens mode when changed", () => {
    render(
      <TreemapExplorerControls
        state={defaultState}
        updateState={mockUpdateState}
        data={mockData}
      />,
    );

    fireEvent.click(screen.getByTestId("lens-coupling"));
    expect(mockUpdateState).toHaveBeenCalledWith({ lensMode: "coupling" });
  });

  it("updates size metric when changed", () => {
    render(
      <TreemapExplorerControls
        state={defaultState}
        updateState={mockUpdateState}
        data={mockData}
      />,
    );

    fireEvent.click(screen.getByTestId("metric-authors"));
    expect(mockUpdateState).toHaveBeenCalledWith({ sizeMetric: "authors" });

  });

  it("highlights the active size metric", () => {
    const state = createMockTreemapState({ sizeMetric: "authors" });
    render(
      <TreemapExplorerControls
        state={state}
        updateState={mockUpdateState}
        data={mockData}
      />,
    );

    const authorsBtn = screen.getByTestId("metric-authors");
    const commitsBtn = screen.getByTestId("metric-commits");

    expect(authorsBtn).toHaveClass("bg-zinc-700");
    expect(commitsBtn).not.toHaveClass("bg-zinc-700");
  });
});
