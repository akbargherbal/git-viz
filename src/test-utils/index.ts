// src/test-utils/index.ts
/**
 * Test Utilities - Central Export
 *
 * Import all test utilities from a single location:
 * import { createActiveFile, setupFakeTimers, render } from '@/test-utils';
 */

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
