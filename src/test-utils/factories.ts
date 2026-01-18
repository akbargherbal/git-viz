// src/test-utils/factories.ts
/**
 * Mock Data Factories for Testing
 * 
 * Provides factory functions to generate test data with sensible defaults.
 * Use presets for common scenarios or override specific fields as needed.
 */

import { TemporalFileData } from "@/services/data/TemporalDataProcessor";
import { EnrichedFileData } from "@/plugins/treemap-explorer/types";

// ============================================================================
// TEMPORAL FILE DATA FACTORIES
// ============================================================================

/**
 * Base factory for TemporalFileData with all required fields
 */
export function createTemporalFile(
  overrides: Partial<TemporalFileData> = {}
): TemporalFileData {
  return {
    key: "src/components/Example.tsx",
    name: "Example.tsx",
    path: "src/components/Example.tsx",
    total_commits: 45,
    unique_authors: 5,
    totalCommits: 45,
    uniqueAuthors: 5,
    operations: { M: 35, A: 10, D: 0 },
    age_days: 120,
    first_seen: "2025-09-01",
    last_modified: "2026-01-10",
    // Temporal fields
    createdDate: "2025-09-01",
    lastModifiedDate: "2026-01-10",
    dormantDays: 7,
    isDormant: false,
    createdPosition: 65,
    isVisible: true,
    ageDays: 138,
    activityTimeline: [
      { date: "2025-09-01", commits: 10 },
      { date: "2025-11-01", commits: 20 },
      { date: "2026-01-10", commits: 15 },
    ],
    ...overrides,
  };
}

/**
 * Preset: Active file (recently modified, actively maintained)
 */
export function createActiveFile(
  overrides: Partial<TemporalFileData> = {}
): TemporalFileData {
  return createTemporalFile({
    key: "src/components/Button.tsx",
    name: "Button.tsx",
    path: "src/components/Button.tsx",
    total_commits: 45,
    totalCommits: 45,
    unique_authors: 5,
    uniqueAuthors: 5,
    operations: { M: 35, A: 10, D: 0 },
    age_days: 120,
    ageDays: 138,
    first_seen: "2025-09-01",
    last_modified: "2026-01-10",
    createdDate: "2025-09-01",
    lastModifiedDate: "2026-01-10",
    dormantDays: 7,
    isDormant: false,
    createdPosition: 65,
    isVisible: true,
    activityTimeline: [
      { date: "2025-09-01", commits: 10 },
      { date: "2025-11-01", commits: 20 },
      { date: "2026-01-10", commits: 15 },
    ],
    ...overrides,
  });
}

/**
 * Preset: Dormant file (>180 days since last modification)
 */
export function createDormantFile(
  overrides: Partial<TemporalFileData> = {}
): TemporalFileData {
  return createTemporalFile({
    key: "src/legacy/OldUtils.ts",
    name: "OldUtils.ts",
    path: "src/legacy/OldUtils.ts",
    total_commits: 120,
    totalCommits: 120,
    unique_authors: 8,
    uniqueAuthors: 8,
    operations: { M: 100, A: 20, D: 0 },
    age_days: 600,
    ageDays: 1098,
    first_seen: "2023-01-15",
    last_modified: "2023-08-20",
    createdDate: "2023-01-15",
    lastModifiedDate: "2023-08-20",
    dormantDays: 881,
    isDormant: true,
    createdPosition: 15,
    isVisible: true,
    activityTimeline: [],
    ...overrides,
  });
}

/**
 * Preset: Minimal file (edge case with minimal data)
 */
export function createMinimalFile(
  overrides: Partial<TemporalFileData> = {}
): TemporalFileData {
  return createTemporalFile({
    key: "src/minimal.ts",
    name: "minimal.ts",
    path: "src/minimal.ts",
    activityTimeline: undefined,
    dormantDays: 0,
    ...overrides,
  });
}

/**
 * Preset: Newly created file (1 day old)
 */
export function createNewFile(
  overrides: Partial<TemporalFileData> = {}
): TemporalFileData {
  return createTemporalFile({
    key: "src/new.ts",
    name: "new.ts",
    path: "src/new.ts",
    age_days: 1,
    ageDays: 1,
    dormantDays: 1,
    createdDate: "2026-01-16",
    lastModifiedDate: "2026-01-16",
    first_seen: "2026-01-16",
    last_modified: "2026-01-16",
    ...overrides,
  });
}

// ============================================================================
// ENRICHED FILE DATA FACTORIES
// ============================================================================

/**
 * Base factory for EnrichedFileData (before temporal enrichment)
 */
export function createEnrichedFile(
  overrides: Partial<EnrichedFileData> = {}
): EnrichedFileData {
  return {
    key: "src/components/Example.tsx",
    name: "Example.tsx",
    path: "src/components/Example.tsx",
    total_commits: 50,
    unique_authors: 5,
    operations: { M: 40, A: 10, D: 0 },
    age_days: 200,
    first_seen: "2024-06-01",
    last_modified: "2026-01-10",
    ...overrides,
  };
}

/**
 * Preset: Old enriched file (for temporal processing)
 */
export function createOldEnrichedFile(
  overrides: Partial<EnrichedFileData> = {}
): EnrichedFileData {
  return createEnrichedFile({
    key: "src/old.ts",
    name: "old.ts",
    path: "src/old.ts",
    total_commits: 50,
    unique_authors: 5,
    operations: { M: 40, A: 10, D: 0 },
    age_days: 500,
    first_seen: "2023-01-01",
    last_modified: "2023-06-01",
    ...overrides,
  });
}

/**
 * Preset: Recently created enriched file
 */
export function createRecentEnrichedFile(
  overrides: Partial<EnrichedFileData> = {}
): EnrichedFileData {
  return createEnrichedFile({
    key: "src/new.ts",
    name: "new.ts",
    path: "src/new.ts",
    total_commits: 10,
    unique_authors: 2,
    operations: { M: 5, A: 5, D: 0 },
    age_days: 30,
    first_seen: "2025-12-01",
    last_modified: "2026-01-10",
    ...overrides,
  });
}

/**
 * Preset: Active enriched file (frequently modified)
 */
export function createActiveEnrichedFile(
  overrides: Partial<EnrichedFileData> = {}
): EnrichedFileData {
  return createEnrichedFile({
    key: "src/active.ts",
    name: "active.ts",
    path: "src/active.ts",
    total_commits: 100,
    unique_authors: 10,
    operations: { M: 80, A: 20, D: 0 },
    age_days: 200,
    first_seen: "2024-06-01",
    last_modified: "2026-01-10",
    ...overrides,
  });
}

// ============================================================================
// TEMPORAL DATA FACTORIES
// ============================================================================

/**
 * Creates mock temporal dataset structure
 */
export function createTemporalData(overrides: any = {}) {
  return {
    date_range: {
      min: "2023-01-01",
      max: "2025-01-15",
      total_days: 1384,
    },
    days: [
      {
        key: "2023-01-01",
        date: "2023-01-01",
        commits: 5,
        files_changed: 2,
        unique_authors: 1,
        operations: { M: 3, A: 2, D: 0 },
      },
      {
        key: "2024-12-01",
        date: "2024-12-01",
        commits: 10,
        files_changed: 5,
        unique_authors: 3,
        operations: { M: 7, A: 2, D: 1 },
      },
      {
        key: "2025-01-15",
        date: "2025-01-15",
        commits: 8,
        files_changed: 3,
        unique_authors: 2,
        operations: { M: 6, A: 1, D: 1 },
      },
    ],
    ...overrides,
  };
}

// ============================================================================
// BATCH FACTORIES
// ============================================================================

/**
 * Create multiple enriched files for bulk testing
 */
export function createEnrichedFileList(count: number = 3): EnrichedFileData[] {
  return [
    createOldEnrichedFile(),
    createRecentEnrichedFile(),
    createActiveEnrichedFile(),
    ...Array.from({ length: Math.max(0, count - 3) }, (_, i) =>
      createEnrichedFile({
        key: `src/file${i + 4}.ts`,
        name: `file${i + 4}.ts`,
        path: `src/file${i + 4}.ts`,
      })
    ),
  ];
}
