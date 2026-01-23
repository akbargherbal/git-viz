import { render, screen, fireEvent } from "@/test-utils/render";
import { LensModeSelector } from "../LensModeSelector";
import { vi } from "vitest";

describe("LensModeSelector", () => {
  const defaultProps = {
    currentLens: "debt" as const,
    onLensChange: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onLensChange.mockClear();
  });

  it("renders all lens options", () => {
    render(<LensModeSelector {...defaultProps} />);
    expect(screen.getByText("DEBT")).toBeInTheDocument();
    expect(screen.getByText("COUP")).toBeInTheDocument();
    expect(screen.getByText("TIME")).toBeInTheDocument();
  });

  it("highlights the active lens correctly", () => {
    const { rerender } = render(
      <LensModeSelector {...defaultProps} currentLens="debt" />,
    );

    const debtBtn = screen.getByTestId("lens-debt");
    expect(debtBtn).toHaveAttribute("aria-pressed", "true");
    expect(debtBtn).toHaveClass("bg-purple-600");
    expect(screen.getByTestId("lens-coupling")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    rerender(<LensModeSelector {...defaultProps} currentLens="coupling" />);
    expect(screen.getByTestId("lens-coupling")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("lens-debt")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onLensChange with correct id when clicked", () => {
    render(<LensModeSelector {...defaultProps} />);

    fireEvent.click(screen.getByTestId("lens-time"));
    expect(defaultProps.onLensChange).toHaveBeenCalledWith("time");

    fireEvent.click(screen.getByTestId("lens-coupling"));
    expect(defaultProps.onLensChange).toHaveBeenCalledWith("coupling");
  });

  it("displays descriptions in titles", () => {
    render(<LensModeSelector {...defaultProps} />);
    expect(screen.getByTestId("lens-debt")).toHaveAttribute(
      "title",
      expect.stringContaining("health scores"),
    );
  });
});
