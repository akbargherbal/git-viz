import { describe, it, expect, vi } from "vitest";
import { TemporalDataProcessor } from "../TemporalDataProcessor";
import { EnrichedFileData } from "@/plugins/treemap-explorer/types";

describe("TemporalDataProcessor - Activity Timeline", () => {
  const mockFile: EnrichedFileData = {
    key: "src/test.ts",
    name: "test.ts",
    path: "src/test.ts",
    total_commits: 10,
    unique_authors: 2,
    first_seen: "2023-01-01T00:00:00Z",
    last_modified: "2023-06-01T00:00:00Z",
  };

  const mockLifecycle = {
    files: {
      "src/test.ts": [
        { datetime: "2023-01-01T00:00:00Z", type: "commit" },
        { datetime: "2023-03-01T00:00:00Z", type: "commit" },
        { datetime: "2023-06-01T00:00:00Z", type: "commit" },
      ],
    },
  };

  // Current behavior: Timeline starts at file creation
  it("should build timeline starting from file creation (current behavior)", () => {
    const timeline = (TemporalDataProcessor as any).buildActivityTimeline(
      mockFile,
      mockLifecycle,
      4 // 4 buckets
    );

    expect(timeline).toBeDefined();
    expect(timeline.length).toBe(4);
    // First bucket should start around Jan 1st
    expect(timeline[0].date).toContain("2023-01");
  });
});