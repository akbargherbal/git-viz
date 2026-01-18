// src/plugins/treemap-explorer/components/__tests__/TimeView.test.tsx
// MIGRATED TO USE TEST-UTILS

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { TimeView } from "../TimeView";
import {
  createActiveFile,
  createDormantFile,
  createMinimalFile,
  createNewFile,
  setupFakeTimers,
  cleanupFakeTimers,
  render,
} from "@/test-utils";

describe("TimeView", () => {
  // Setup consistent test date
  beforeEach(() => {
    setupFakeTimers(); // Uses TEST_DATE = "2026-01-17" by default
  });

  afterEach(() => {
    cleanupFakeTimers();
  });

  describe("Active File Display", () => {
    it("should render active status for recently modified files", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      const activeElements = screen.getAllByText(/Active/i);
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it("should display creation date", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/Created/i)).toBeInTheDocument();
      expect(screen.getByText(/Sep.*2025/i)).toBeInTheDocument();
    });

    it("should display last modified date", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/Last Modified/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*2026/i)).toBeInTheDocument();
    });

    it("should show age in days", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/138 days/i)).toBeInTheDocument();
    });

    it("should show dormant days even for active files", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/Dormant Period/i)).toBeInTheDocument();
    });

    it("should display active file insight message", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/actively maintained/i)).toBeInTheDocument();
    });
  });

  describe("Dormant File Display", () => {
    it("should render dormant status for old files", () => {
      const file = createDormantFile();
      render(<TimeView file={file} />);

      const dormantElements = screen.getAllByText(/Dormant/i);
      expect(dormantElements.length).toBeGreaterThan(0);
    });

    it("should show high dormant days count", () => {
      const file = createDormantFile();
      render(<TimeView file={file} />);

      // Text appears in both metric card and insight message
      const elements = screen.getAllByText(/881 days/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should display dormant file insight message", () => {
      const file = createDormantFile();
      render(<TimeView file={file} />);

      expect(screen.getAllByText(/dormant/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/has been/i)).toBeInTheDocument();
    });

    it("should use different styling for dormant status", () => {
      const file = createDormantFile();
      const { container } = render(<TimeView file={file} />);

      const statusBadge = container.querySelector(".bg-zinc-950\\/50");
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe("Activity Timeline", () => {
    it("should display activity timeline for files with timeline data", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/Activity Timeline/i)).toBeInTheDocument();
    });

    it("should not show timeline for files without activity data", () => {
      const file = createDormantFile();
      render(<TimeView file={file} />);

      expect(screen.queryByText(/Activity Timeline/i)).not.toBeInTheDocument();
    });
  });

  describe("Metric Cards", () => {
    it("should display all four key metrics", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/Created/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Modified/i)).toBeInTheDocument();
      expect(screen.getByText(/Age/i)).toBeInTheDocument();
      expect(screen.getByText(/Dormant/i)).toBeInTheDocument();
    });

    it("should format dates correctly", () => {
      const file = createActiveFile();
      render(<TimeView file={file} />);

      expect(screen.getByText(/Sep.*2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*2026/i)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle file with minimal temporal data", () => {
      const file = createMinimalFile();
      render(<TimeView file={file} />);

      const activeElements = screen.getAllByText(/Active/i);
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it("should handle very recently created files (age 0-1 days)", () => {
      const file = createNewFile();
      render(<TimeView file={file} />);

      expect(screen.getAllByText(/1 days/i).length).toBeGreaterThan(0);
    });

    it("should handle files with very long dormancy (>1 year)", () => {
      const file = createDormantFile({ dormantDays: 730 });
      render(<TimeView file={file} />);

      expect(screen.getByText(/Dormant Period/i)).toBeInTheDocument();
    });
  });

  describe("Lifecycle Status Badge Styling", () => {
    it("should apply blue styling to active files", () => {
      const file = createActiveFile();
      const { container } = render(<TimeView file={file} />);

      const statusCard = container.querySelector(".bg-blue-950\\/50");
      expect(statusCard).toBeInTheDocument();
    });

    it("should apply muted styling to dormant files", () => {
      const file = createDormantFile();
      const { container } = render(<TimeView file={file} />);

      const statusCard = container.querySelector(".bg-zinc-950\\/50");
      expect(statusCard).toBeInTheDocument();
    });
  });
});
