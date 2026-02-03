// src/services/data/__tests__/DataProcessor.test.ts

import { describe, it, expect } from "vitest";
import {
  DataProcessor,
  RawLifecycleData,
  V2AuthorNetwork,
  V2FileIndex,
  V2DirectoryStats,
} from "../DataProcessor";

import { FilterState } from "@/types/visualization";

describe("DataProcessor", () => {
  const mockLifecycle: RawLifecycleData = {
    generated_at: "2023-01-01T00:00:00Z",
    repository_path: "/path/to/repo",
    total_files: 2,
    total_commits: 5,
    total_changes: 10,
    files: {
      "src/main.ts": [
        {
          commit_hash: "abc1",
          timestamp: 1672531200, // 2023-01-01
          datetime: "2023-01-01T00:00:00Z",
          operation: "A",
          author_name: "Alice",
          author_email: "alice@example.com",
          commit_subject: "Init",
        },
        {
          commit_hash: "abc2",
          timestamp: 1672617600, // 2023-01-02
          datetime: "2023-01-02T00:00:00Z",
          operation: "M",
          author_name: "Bob",
          author_email: "bob@example.com",
          commit_subject: "Update",
        },
      ],
      "src/utils/helper.ts": [
        {
          commit_hash: "abc3",
          timestamp: 1672704000, // 2023-01-03
          datetime: "2023-01-03T00:00:00Z",
          operation: "A",
          author_name: "Alice",
          author_email: "alice@example.com",
          commit_subject: "Add helper",
        },
      ],
      README: [
        // No extension
        {
          commit_hash: "abc4",
          timestamp: 1672790400, // 2023-01-04
          datetime: "2023-01-04T00:00:00Z",
          operation: "A",
          author_name: "Bob",
          author_email: "bob@example.com",
          commit_subject: "Add readme",
        },
      ],
    },
  };

  const mockAuthorNetwork: V2AuthorNetwork = {
    nodes: [
      {
        id: "Alice",
        email: "alice@example.com",
        commit_count: 2,
        collaboration_count: 1,
      },
      {
        id: "Bob",
        email: "bob@example.com",
        commit_count: 2,
        collaboration_count: 1,
      },
    ],
  };

  const mockFileIndex: V2FileIndex = {
    files: {
      "src/main.ts": {
        total_commits: 2,
        last_modified: "2023-01-02T00:00:00Z",
        primary_author: {
          email: "alice@example.com",
          commit_count: 1,
          percentage: 50,
        },
        operations: { A: 1, M: 1 },
        age_days: 10,
        commits_per_day: 0.2,
        lifecycle_event_count: 2,
        first_seen: "2023-01-01T00:00:00Z",
        unique_authors: 2,
      },
      "src/utils/helper.ts": {
        total_commits: 1,
        last_modified: "2023-01-03T00:00:00Z",
        primary_author: {
          email: "alice@example.com",
          commit_count: 1,
          percentage: 100,
        },
        operations: { A: 1 },
        age_days: 5,
        commits_per_day: 0.2,
        lifecycle_event_count: 1,
        first_seen: "2023-01-03T00:00:00Z",
        unique_authors: 1,
      },
      README: {
        total_commits: 1,
        last_modified: "2023-01-04T00:00:00Z",
        primary_author: {
          email: "bob@example.com",
          commit_count: 1,
          percentage: 100,
        },
        operations: { A: 1 },
        age_days: 1,
        commits_per_day: 1,
        lifecycle_event_count: 1,
        first_seen: "2023-01-04T00:00:00Z",
        unique_authors: 1,
      },
    },
  };

  const mockDirStats: V2DirectoryStats = {
    directories: {
      src: { path: "src", total_commits: 3, activity_score: 10 },
      "src/utils": { path: "src/utils", total_commits: 1, activity_score: 5 },
      ignored: { path: "ignored", total_commits: 0, activity_score: 0 },
    },
  };



  describe("processRawData", () => {
    it("should process raw data correctly without filters", () => {
      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
      );

      // Verify Tree Structure
      expect(result.tree).toBeDefined();
      expect(result.tree.name).toBe("root");
      expect(result.tree.children).toHaveLength(2); // src, README

      const srcNode = result.tree.children?.find((c) => c.name === "src");
      expect(srcNode).toBeDefined();
      expect(srcNode?.children).toHaveLength(2); // main.ts, utils

      const utilsNode = srcNode?.children?.find((c) => c.name === "utils");
      expect(utilsNode).toBeDefined();
      expect(utilsNode?.children).toHaveLength(1); // helper.ts

      // Verify Metadata
      expect(result.metadata.repository_name).toBe("repo");
      expect(result.metadata.stats.total_commits).toBe(5);
      expect(result.metadata.file_types).toEqual(
        expect.arrayContaining([
          { extension: ".ts", count: 2 },
          { extension: "no-extension", count: 1 },
        ]),
      );

      // Verify Directory Stats Filtering
      expect(result.metadata.directory_stats).toHaveLength(2); // src, src/utils (ignored should be filtered out)
      expect(
        result.metadata.directory_stats?.find((d) => d.path === "ignored"),
      ).toBeUndefined();

      // Verify Activity
      expect(result.activity.length).toBeGreaterThan(0);
      const activityItem = result.activity.find((a) => a.d === "2023-01-01");
      expect(activityItem).toBeDefined();
      expect(activityItem?.a).toBe(1); // 1 Add operation
      expect(activityItem?.au).toBe(1); // 1 Author
    });

    it("should filter by file type", () => {
      const filters: FilterState = {
        fileTypes: new Set([".ts"]),
        directories: new Set(),
        authors: new Set(),
        eventTypes: new Set(),
        timeRange: null,
      };

      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
        filters,
      );

      // README should be excluded from tree
      expect(
        result.tree.children?.find((c) => c.name === "README"),
      ).toBeUndefined();
      expect(result.tree.children?.find((c) => c.name === "src")).toBeDefined();
    });

    it("should filter by directory", () => {
      const filters: FilterState = {
        fileTypes: new Set(),
        directories: new Set(["src/utils"]),
        authors: new Set(),
        eventTypes: new Set(),
        timeRange: null,
      };

      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
        filters,
      );

      // Only src/utils/helper.ts should be visible
      const srcNode = result.tree.children?.find((c) => c.name === "src");
      expect(srcNode).toBeDefined();

      const mainTs = srcNode?.children?.find((c) => c.name === "main.ts");
      expect(mainTs).toBeUndefined();

      const utilsNode = srcNode?.children?.find((c) => c.name === "utils");
      expect(utilsNode).toBeDefined();
      expect(utilsNode?.children).toHaveLength(1);
    });

    it("should filter activity by author", () => {
      const filters: FilterState = {
        fileTypes: new Set(),
        directories: new Set(),
        authors: new Set(["Alice"]),
        eventTypes: new Set(),
        timeRange: null,
      };

      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
        filters,
      );

      const activity = result.activity;
      const aliceDates = activity.map((a) => a.d);
      expect(aliceDates).toContain("2023-01-01");
      expect(aliceDates).toContain("2023-01-03");
      expect(aliceDates).not.toContain("2023-01-02");
      expect(aliceDates).not.toContain("2023-01-04");
    });

    it("should filter activity by event type", () => {
      const filters: FilterState = {
        fileTypes: new Set(),
        directories: new Set(),
        authors: new Set(),
        eventTypes: new Set(["M"]), // Only modifications
        timeRange: null,
      };

      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
        filters,
      );

      const activity = result.activity;
      expect(activity).toHaveLength(1);
      expect(activity[0].d).toBe("2023-01-02");
      expect(activity[0].m).toBe(1);
    });

    it("should filter activity by time range", () => {
      const filters: FilterState = {
        fileTypes: new Set(),
        directories: new Set(),
        authors: new Set(),
        eventTypes: new Set(),
        timeRange: {
          start: new Date("2023-01-02T00:00:00Z"),
          end: new Date("2023-01-03T23:59:59Z"),
        },
      };

      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
        filters,
      );

      const activity = result.activity;
      const dates = activity.map((a) => a.d);
      expect(dates).toContain("2023-01-02");
      expect(dates).toContain("2023-01-03");
      expect(dates).not.toContain("2023-01-01");
      expect(dates).not.toContain("2023-01-04");
    });

    it("should handle file with no extension correctly", () => {
      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
      );

      const noExtType = result.metadata.file_types.find(
        (t) => t.extension === "no-extension",
      );
      expect(noExtType).toBeDefined();
      expect(noExtType?.count).toBe(1);
    });

    it("should handle delete operations in activity aggregation", () => {
      const lifecycleWithDelete: RawLifecycleData = {
        ...mockLifecycle,
        files: {
          "deleted.ts": [
            {
              commit_hash: "abc5",
              timestamp: 1672876800,
              datetime: "2023-01-05T00:00:00Z",
              operation: "D",
              author_name: "Alice",
              author_email: "alice@example.com",
              commit_subject: "Delete file",
            },
          ],
        },
      };

      const result = DataProcessor.processRawData(
        lifecycleWithDelete,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
      );

      const deleteActivity = result.activity.find((a) => a.d === "2023-01-05");
      expect(deleteActivity).toBeDefined();
      expect(deleteActivity?.del).toBe(1);
    });

    it("should handle missing directory ID in activity aggregation", () => {
      const lifecycleRoot: RawLifecycleData = {
        ...mockLifecycle,
        files: {
          "root.ts": [
            {
              commit_hash: "abc6",
              timestamp: 1672531200,
              datetime: "2023-01-01T00:00:00Z",
              operation: "A",
              author_name: "Alice",
              author_email: "alice@example.com",
              commit_subject: "Root file",
            },
          ],
        },
      };

      const result = DataProcessor.processRawData(
        lifecycleRoot,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
      );

      const activity = result.activity.find((a) => a.d === "2023-01-01");
      expect(activity).toBeDefined();
      expect(activity?.id).toBe(0); // Root ID
    });

    it("should correctly aggregate and sort top contributors and files", () => {
      const complexLifecycle: RawLifecycleData = {
        ...mockLifecycle,
        files: {
          "src/shared/a.ts": [
            {
              commit_hash: "h1",
              timestamp: 1673308800,
              datetime: "2023-01-10T00:00:00Z",
              operation: "M",
              author_name: "AuthorA",
              author_email: "a@example.com",
              commit_subject: "fix",
            },
            {
              commit_hash: "h2",
              timestamp: 1673308800,
              datetime: "2023-01-10T00:00:00Z",
              operation: "M",
              author_name: "AuthorA",
              author_email: "a@example.com",
              commit_subject: "fix",
            },
            {
              commit_hash: "h3",
              timestamp: 1673308800,
              datetime: "2023-01-10T00:00:00Z",
              operation: "M",
              author_name: "AuthorC",
              author_email: "c@example.com",
              commit_subject: "fix",
            },
          ],
          "src/shared/b.ts": [
            {
              commit_hash: "h4",
              timestamp: 1673308800,
              datetime: "2023-01-10T00:00:00Z",
              operation: "M",
              author_name: "AuthorB",
              author_email: "b@example.com",
              commit_subject: "fix",
            },
          ],
        },
      };

      const result = DataProcessor.processRawData(
        complexLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
      );

      const activity = result.activity.find((a) => a.d === "2023-01-10");
      expect(activity).toBeDefined();

      // Verify Top Contributors (tc) sorting
      expect(activity?.tc[0]).toBe("AuthorA");
      expect(activity?.tc.length).toBe(3);

      // Verify Top Files (tf) sorting
      expect(activity?.tf[0]).toBe("a.ts");
      expect(activity?.tf[1]).toBe("b.ts");
    });

    it("should handle empty repository path", () => {
      const lifecycleEmptyPath: RawLifecycleData = {
        ...mockLifecycle,
        repository_path: "",
      };
      const result = DataProcessor.processRawData(
        lifecycleEmptyPath,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
      );
      expect(result.metadata.repository_name).toBe("Repository");
    });

    it("should populate file stats in metadata", () => {
      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        mockFileIndex,
        mockDirStats,
      );

      expect(result.metadata.file_stats).toBeDefined();
      expect(result.metadata.file_stats?.["src/main.ts"]).toBeDefined();
      expect(
        result.metadata.file_stats?.["src/main.ts"]?.primary_author,
      ).toEqual({
        email: "alice@example.com",
        percentage: 50,
      });
    });

    it("should handle files without primary author in metadata", () => {
      const fileIndexNoAuthor: V2FileIndex = {
        files: {
          "no-author.ts": {
            total_commits: 1,
            last_modified: "2023-01-01",
            // primary_author undefined
          },
        },
      };

      const result = DataProcessor.processRawData(
        mockLifecycle,
        mockAuthorNetwork,
        fileIndexNoAuthor,
        mockDirStats,
      );

      expect(
        result.metadata.file_stats?.["no-author.ts"]?.primary_author,
      ).toBeUndefined();
    });
  });
});
