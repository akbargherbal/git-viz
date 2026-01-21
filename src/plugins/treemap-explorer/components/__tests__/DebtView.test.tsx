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
        category: "critical" as const, // Explicit cast
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
        category: "healthy" as const, // Explicit cast
        score: 90,
      },
    };
    render(<DebtView file={healthyFile} />);
    expect(screen.getByText("healthy")).toHaveClass("text-green-500");
  });

  it("should render bus factor badge", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("medium risk")).toBeInTheDocument();
  });

  it("should render operations breakdown", () => {
    render(<DebtView file={mockFile} />);
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should handle missing operations", () => {
    const fileNoOps = { ...mockFile, operations: undefined };
    render(<DebtView file={fileNoOps} />);
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
  });
});
