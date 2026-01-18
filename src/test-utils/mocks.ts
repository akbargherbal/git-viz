// src/test-utils/mocks.ts
import { vi } from "vitest";

/**
 * Mock DOM container for plugin tests
 * Used by: TreemapExplorer, TimelineHeatmap integration tests
 */
export const createMockContainer = (width = 800, height = 600): HTMLElement => {
  const container = document.createElement("div");
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);
  return container;
};

/**
 * Cleanup function for DOM containers
 */
export const destroyMockContainer = (container: HTMLElement): void => {
  if (container.parentNode) {
    document.body.removeChild(container);
  }
};

/**
 * Mock fetch responses for data loading
 */
export const createMockFetch = (data: any) => {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    }),
  ) as any;
};

/**
 * Utility to wait for async operations
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));
