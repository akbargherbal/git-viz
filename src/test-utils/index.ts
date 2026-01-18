// src/test-utils/index.ts
/**
 * Test Utilities - Central Export
 *
 * Import all test utilities from a single location:
 * import { createActiveFile, setupFakeTimers, render, describe, it, expect } from '@/test-utils';
 */

// Re-export vitest globals for convenience
export {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";


// Mock data factories
export {
  // Temporal file factories
  createTemporalFile,
  createActiveFile,
  createDormantFile,
  createMinimalFile,
  createNewFile,

  // Enriched file factories
  createEnrichedFile,
  createOldEnrichedFile,
  createRecentEnrichedFile,
  createActiveEnrichedFile,

  // Temporal data factories
  createTemporalData,

  // Coupling data factories
  createCouplingData,

  // Plugin factories
  createMockPlugin,
  createLegacyPlugin,
  createInvalidPlugin,
  createPluginWithOptionalMissing,

  // Batch factories
  createEnrichedFileList,
} from "./factories";


// Time testing helpers
export {
  TEST_DATE,
  setupFakeTimers,
  cleanupFakeTimers,
  setupTimeTest,
  waitForNextTick,
  delay,
} from "./helpers";

// Custom render and RTL re-exports
export { renderWithProviders, render } from "./render";
export * from "@testing-library/react";
