// src/test-utils/helpers.ts
/**
 * Test Helpers and Utilities
 *
 * Common test setup functions and utilities
 */

import { vi } from "vitest";

// ============================================================================
// TIME TESTING HELPERS
// ============================================================================

/**
 * Standard test date used across tests for consistency
 * Set to 2026-01-17 for consistent "days ago" calculations
 */
export const TEST_DATE = "2026-01-17";

/**
 * Setup fake timers with a consistent test date
 * Call this in beforeEach to ensure date-based assertions are predictable
 *
 * @example
 * beforeEach(() => {
 *   setupFakeTimers();
 * });
 *
 * afterEach(() => {
 *   cleanupFakeTimers();
 * });
 */
export function setupFakeTimers(date: string = TEST_DATE): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(date));
}

/**
 * Cleanup fake timers
 * Call this in afterEach to restore real timers
 */
export function cleanupFakeTimers(): void {
  vi.useRealTimers();
}

/**
 * All-in-one time test setup
 * Returns cleanup function for easy teardown
 *
 * @example
 * const cleanup = setupTimeTest();
 * // ... your tests
 * cleanup();
 */
export function setupTimeTest(date: string = TEST_DATE): () => void {
  setupFakeTimers(date);
  return cleanupFakeTimers;
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Wait for next tick (useful for async state updates)
 */
export async function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Delay for testing animations or debounced functions
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
