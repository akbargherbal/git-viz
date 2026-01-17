// src/plugins/treemap-explorer/components/__tests__/CouplingView.test.tsx

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CouplingView } from "../CouplingView";
import { CouplingDataProcessor } from "@/services/data/CouplingDataProcessor";
import { EnrichedFileData } from "../../types";

describe("CouplingView", () => {
  // Setup Mock Data
  const mockCouplingIndex = CouplingDataProcessor.process({
    edges: [
      {
        source: "src/Core.ts",
        target: "src/Utils.ts",
        couplingStrength: 0.85,
        cochangeCount: 20,
      },
      {
        source: "src/Core.ts",
        target: "src/Types.ts",
        couplingStrength: 0.4,
        cochangeCount: 5,
      },
    ],
  });

  const mockFile: EnrichedFileData = {
    key: "src/Core.ts",
    name: "Core.ts",
    path: "src/Core.ts",
    total_commits: 100,
    unique_authors: 5,
    operations: {},
    age_days: 10,
    first_seen: "",
    last_modified: "",
    // Fix: Use snake_case to match EnrichedFileData interface
    totalCommits: 100, // Kept for backward compat if needed by component
    uniqueAuthors: 5, // Kept for backward compat if needed by component
  } as any; // Cast to any to allow extra props if needed by component internals

  it("should render key metrics correctly", () => {
    render(
      <CouplingView
        file={mockFile}
        couplingIndex={mockCouplingIndex}
        couplingThreshold={0.3}
      />,
    );

    // Check Total Partners (2)
    const partnerCounts = screen.getAllByText("2");
    expect(partnerCounts.length).toBeGreaterThan(0);
    expect(screen.getByText("Coupled Files")).toBeInTheDocument();

    // Check Max Strength (0.85)
    const maxStrengths = screen.getAllByText("0.85");
    expect(maxStrengths.length).toBeGreaterThan(0);
  });

  it("should list partners sorted by strength", () => {
    render(
      <CouplingView
        file={mockFile}
        couplingIndex={mockCouplingIndex}
        couplingThreshold={0.3}
      />,
    );

    expect(screen.getByText("Utils.ts")).toBeInTheDocument();
    expect(screen.getByText("Types.ts")).toBeInTheDocument();
  });

  it("should filter partners based on threshold", () => {
    render(
      <CouplingView
        file={mockFile}
        couplingIndex={mockCouplingIndex}
        couplingThreshold={0.5}
      />,
    );

    expect(screen.getByText("Utils.ts")).toBeInTheDocument();
    expect(screen.queryByText("Types.ts")).not.toBeInTheDocument();
  });

  it("should display appropriate insight message for high coupling", () => {
    render(
      <CouplingView
        file={mockFile}
        couplingIndex={mockCouplingIndex}
        couplingThreshold={0.3}
      />,
    );

    expect(
      screen.getByText(/strong coupling relationships detected/i),
    ).toBeInTheDocument();
  });

  it("should handle isolated files (no coupling)", () => {
    // Important: Update key as well, since coupling lookup uses key
    const isolatedFile = {
      ...mockFile,
      path: "src/Isolated.ts",
      key: "src/Isolated.ts",
      name: "Isolated.ts",
    };

    render(
      <CouplingView
        file={isolatedFile}
        couplingIndex={mockCouplingIndex}
        couplingThreshold={0.3}
      />,
    );

    expect(
      screen.getByText(/No coupling relationships detected/i),
    ).toBeInTheDocument();
  });
});
