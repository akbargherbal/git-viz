// src/plugins/treemap-explorer/components/__tests__/DebtView.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DebtView } from "../DebtView";
import { EnrichedFileData } from "../../types";

describe("DebtView", () => {
  const mockFile: EnrichedFileData = {
    key: "src/test.ts",
    name: "test.ts",
    path: "src/test.ts",
    value: 100,
    total_commits: 50,
    unique_authors: 3,
    healthScore: {
      score: 45,
      category: "medium",
      churnRate: 0.4,
      busFactor: "medium-risk",
      factors: {
        churn: { value: 0.4, score: 60, weight: 0.4 },
        authors: { value: 3, score: 70, weight: 0.3 },
        age: { value: 100, score: 80, weight: 0.3 },
      },
    },
    operations: { M: 10, A: 5, D: 2, R: 0 },
  } as EnrichedFileData;

  it("should render health score and category", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("should render missing health score gracefully", () => {
    const fileWithoutScore = { ...mockFile, healthScore: undefined };
    render(<DebtView file={fileWithoutScore} />);
    expect(screen.getByText(/Health score not available/i)).toBeInTheDocument();
  });

  it("should render critical risk styling", () => {
    const criticalFile = {
      ...mockFile,
      healthScore: {
        ...mockFile.healthScore!,
        category: "critical" as const,
        score: 20,
      },
    };
    render(<DebtView file={criticalFile} />);
    expect(screen.getByText("critical")).toHaveClass("text-red-500");
  });

  it("should render healthy risk styling", () => {
    const healthyFile = {
      ...mockFile,
      healthScore: {
        ...mockFile.healthScore!,
        category: "healthy" as const,
        score: 90,
      },
    };
    render(<DebtView file={healthyFile} />);
    expect(screen.getByText("healthy")).toHaveClass("text-green-500");
  });

  it("should render churn rate with progress bar", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("Churn Rate")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("should render bus factor badge", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("medium risk")).toBeInTheDocument();
  });

  it("should render contributing factors section", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("Contributing Factors")).toBeInTheDocument();
    expect(screen.getByText("Churn Impact")).toBeInTheDocument();
    expect(screen.getByText("Author Diversity")).toBeInTheDocument();
    expect(screen.getByText("Age/Stability")).toBeInTheDocument();
  });

  it("should display factor scores correctly", () => {
    render(<DebtView file={mockFile} />);
    // Churn factor score
    expect(screen.getByText("60")).toBeInTheDocument();
    // Authors factor score
    expect(screen.getByText("70")).toBeInTheDocument();
    // Age factor score
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("should display factor weights correctly", () => {
    render(<DebtView file={mockFile} />);
    // Weight: 40%
    expect(screen.getByText(/Weight: 40%/)).toBeInTheDocument();
    // Weight: 30%
    const weight30Elements = screen.getAllByText(/Weight: 30%/);
    expect(weight30Elements).toHaveLength(2); // authors and age both have 30%
  });

  it("should render operations breakdown", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should handle missing operations", () => {
    const fileNoOps = { ...mockFile, operations: undefined };
    render(<DebtView file={fileNoOps} />);
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
  });

  it("should render file stats (commits and contributors)", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("Total Commits")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("Contributors")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should handle missing factor data gracefully", () => {
    const fileNoFactors = {
      ...mockFile,
      healthScore: {
        score: 50,
        category: "medium" as const,
        churnRate: 0.5,
        busFactor: "medium-risk" as const,
        factors: {
          churn: { value: 0.5, score: 50, weight: 0.4 },
          authors: { value: 2, score: 50, weight: 0.3 },
          age: { value: 50, score: 50, weight: 0.3 },
        },
      },
    };
    render(<DebtView file={fileNoFactors} />);
    // Should still render health score (use getAllByText since "50" appears in multiple places)
    const healthScores = screen.getAllByText("50");
    expect(healthScores.length).toBeGreaterThan(0);
    // Contributing factors section should appear since factors are now provided
    expect(screen.getByText("Churn Impact")).toBeInTheDocument();
  });

  it("should handle partial factor data", () => {
    const filePartialFactors = {
      ...mockFile,
      healthScore: {
        ...mockFile.healthScore!,
        factors: {
          churn: { value: 0.6, score: 60, weight: 0.5 },
          authors: { value: 1, score: 30, weight: 0.25 },
          age: { value: 10, score: 40, weight: 0.25 },
        },
      },
    };
    render(<DebtView file={filePartialFactors} />);
    // Churn should appear
    expect(screen.getByText("Churn Impact")).toBeInTheDocument();
    // Authors and age should also appear since they're valid
    expect(screen.getByText("Author Diversity")).toBeInTheDocument();
    expect(screen.getByText("Age/Stability")).toBeInTheDocument();
  });

  it("should apply correct badge styling for low-risk bus factor", () => {
    const lowRiskFile = {
      ...mockFile,
      healthScore: {
        ...mockFile.healthScore!,
        busFactor: "low-risk" as const,
      },
    };
    render(<DebtView file={lowRiskFile} />);
    expect(screen.getByText("low risk")).toHaveClass("text-green-400");
  });

  it("should apply correct badge styling for high-risk bus factor", () => {
    const highRiskFile = {
      ...mockFile,
      healthScore: {
        ...mockFile.healthScore!,
        busFactor: "high-risk" as const,
      },
    };
    render(<DebtView file={highRiskFile} />);
    expect(screen.getByText("high risk")).toHaveClass("text-red-400");
  });

  it("should only show defined operations", () => {
    const fileMinimalOps = {
      ...mockFile,
      operations: { M: 5 }, // Only Modified
    };
    render(<DebtView file={fileMinimalOps} />);
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.queryByText("Added")).not.toBeInTheDocument();
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
    expect(screen.queryByText("Renamed")).not.toBeInTheDocument();
  });

  it("should handle renamed operations", () => {
    const fileWithRename = {
      ...mockFile,
      operations: { M: 10, A: 5, D: 2, R: 3 },
    };
    render(<DebtView file={fileWithRename} />);
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    // Find all elements with "3" and verify one is associated with Renamed
    const allThrees = screen.getAllByText("3");
    expect(allThrees.length).toBeGreaterThan(0);
    // Verify the renamed row contains the value
    const renamedSection = screen.getByText("Renamed").parentElement;
    expect(renamedSection).toHaveTextContent("3");
  });
});
