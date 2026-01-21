import { render, screen, fireEvent } from "@/test-utils/render";
import TreemapDetailPanel from "../TreemapDetailPanel";
import { createEnrichedFile, createTemporalFile } from "@/test-utils/factories";
import { vi } from "vitest";

// Mock child components to isolate panel logic
vi.mock("../DebtView", () => ({
  DebtView: () => <div data-testid="debt-view">Debt View Content</div>,
}));

vi.mock("../CouplingView", () => ({
  CouplingView: () => (
    <div data-testid="coupling-view">Coupling View Content</div>
  ),
}));

vi.mock("../TimeView", () => ({
  TimeView: () => <div data-testid="time-view">Time View Content</div>,
}));

describe("TreemapDetailPanel", () => {
  const mockFile = createEnrichedFile({ key: "src/utils/helper.ts" });
  const mockOnClose = vi.fn();

  const defaultProps = {
    file: mockFile,
    lensMode: "debt" as const,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it("renders file header information correctly", () => {
    render(<TreemapDetailPanel {...defaultProps} />);
    expect(screen.getByText("helper.ts")).toBeInTheDocument();
    expect(screen.getByText("src/utils/helper.ts")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<TreemapDetailPanel {...defaultProps} />);
    const closeBtn = screen.getByTestId("close-detail-panel");
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  describe("Lens Mode Rendering", () => {
    it("renders DebtView and indicator in debt mode", () => {
      render(<TreemapDetailPanel {...defaultProps} lensMode="debt" />);

      expect(screen.getByTestId("debt-view")).toBeInTheDocument();
      expect(screen.queryByTestId("coupling-view")).not.toBeInTheDocument();
      expect(screen.queryByTestId("time-view")).not.toBeInTheDocument();

      expect(screen.getByText("Technical Debt Lens")).toBeInTheDocument();
    });

    it("renders CouplingView and indicator in coupling mode when data is present", () => {
      const couplingProps = {
        ...defaultProps,
        lensMode: "coupling" as const,
        couplingIndex: {} as any, // Mock object
        couplingThreshold: 10,
      };

      render(<TreemapDetailPanel {...couplingProps} />);

      expect(screen.getByTestId("coupling-view")).toBeInTheDocument();
      expect(screen.getByText("Coupling Lens")).toBeInTheDocument();
    });

    it("does not render CouplingView if couplingIndex is missing", () => {
      render(
        <TreemapDetailPanel
          {...defaultProps}
          lensMode="coupling"
          couplingThreshold={10}
        />,
      );
      expect(screen.queryByTestId("coupling-view")).not.toBeInTheDocument();
    });

    it("does not render CouplingView if couplingThreshold is missing", () => {
      render(
        <TreemapDetailPanel
          {...defaultProps}
          lensMode="coupling"
          couplingIndex={{} as any}
        />,
      );
      expect(screen.queryByTestId("coupling-view")).not.toBeInTheDocument();
    });

    it("renders TimeView and indicator in time mode", () => {
      const temporalFile = createTemporalFile();
      render(
        <TreemapDetailPanel
          {...defaultProps}
          file={temporalFile}
          lensMode="time"
        />,
      );

      expect(screen.getByTestId("time-view")).toBeInTheDocument();
      expect(screen.getByText("Temporal Lens")).toBeInTheDocument();
    });
  });

  it("applies correct indicator colors", () => {
    const { rerender } = render(
      <TreemapDetailPanel {...defaultProps} lensMode="debt" />,
    );
    // Check for red indicator
    expect(screen.getByText("Technical Debt Lens").previousSibling).toHaveClass(
      "bg-red-500",
    );

    rerender(<TreemapDetailPanel {...defaultProps} lensMode="time" />);
    // Check for blue indicator
    expect(screen.getByText("Temporal Lens").previousSibling).toHaveClass(
      "bg-blue-500",
    );
  });
});
