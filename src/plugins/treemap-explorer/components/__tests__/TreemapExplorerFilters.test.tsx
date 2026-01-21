// src/plugins/treemap-explorer/components/__tests__/TreemapExplorerFilters.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TreemapExplorerFilters } from "../TreemapExplorerFilters";
import { TreemapExplorerState } from "../../types";

// Mock the state
const mockState: TreemapExplorerState = {
  lensMode: "debt",
  couplingThreshold: 0.5,
  healthThreshold: 0,
  showArcs: false,
  timeFilters: {
    showCreations: false,
    fadeDormant: true,
  },
  timePosition: 50,
  // Add other required fields from your type definition if needed
} as unknown as TreemapExplorerState;

describe("TreemapExplorerFilters", () => {
  const mockOnStateChange = vi.fn();
  const mockOnClose = vi.fn();

  const renderComponent = (overrides: Partial<TreemapExplorerState> = {}) => {
    return render(
      <TreemapExplorerFilters
        state={{ ...mockState, ...overrides }}
        onStateChange={mockOnStateChange}
        onClose={mockOnClose}
      />,
    );
  };

  it("should render header and close button", () => {
    renderComponent();
    expect(screen.getByText("Filters & Options")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  describe("Debt Lens Mode", () => {
    it("should render risk filters", () => {
      renderComponent({ lensMode: "debt" });
      expect(screen.getByText(/Critical Only/i)).toBeInTheDocument();
    });

    it("should toggle health threshold", () => {
      renderComponent({ lensMode: "debt", healthThreshold: 0 });

      const checkbox = screen.getByRole("checkbox", { name: /Critical Only/i });
      fireEvent.click(checkbox);

      expect(mockOnStateChange).toHaveBeenCalledWith({ healthThreshold: 30 });
    });
  });

  describe("Coupling Lens Mode", () => {
    it("should render coupling sliders and toggles", () => {
      renderComponent({ lensMode: "coupling" });
      expect(
        screen.getByText("Coupling Strength Threshold"),
      ).toBeInTheDocument();
      expect(screen.getByText("Show Coupling Arcs")).toBeInTheDocument();
    });

    it("should update coupling threshold", () => {
      renderComponent({ lensMode: "coupling" });
      const slider = screen.getByRole("slider"); // Input type range

      fireEvent.change(slider, { target: { value: "0.8" } });
      expect(mockOnStateChange).toHaveBeenCalledWith({
        couplingThreshold: 0.8,
      });
    });

    it("should toggle arcs visibility", () => {
      renderComponent({ lensMode: "coupling" });
      const checkbox = screen.getByLabelText(/Show Coupling Arcs/i);

      fireEvent.click(checkbox);
      expect(mockOnStateChange).toHaveBeenCalledWith({ showArcs: true });
    });
  });

  describe("Time Lens Mode", () => {
    it("should render temporal options", () => {
      renderComponent({ lensMode: "time" });
      expect(screen.getByText("Temporal Display Options")).toBeInTheDocument();
      expect(screen.getByText("Highlight New Files")).toBeInTheDocument();
    });

    it("should toggle creation highlighting", () => {
      renderComponent({ lensMode: "time" });
      const checkbox = screen.getByLabelText(/Highlight New Files/i); // You might need to adjust selector based on structure

      fireEvent.click(checkbox);
      expect(mockOnStateChange).toHaveBeenCalledWith({
        timeFilters: expect.objectContaining({ showCreations: true }),
      });
    });
  });
});
