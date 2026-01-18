// src/test-utils/render.tsx
/**
 * Custom Render Utilities
 *
 * Wraps React Testing Library's render with common providers
 */

import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

/**
 * Custom render function that wraps components with necessary providers
 *
 * @example
 * import { renderWithProviders } from '@/test-utils';
 *
 * renderWithProviders(<MyComponent />);
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  // Currently no providers needed, but structure is ready for:
  // - Zustand store provider
  // - Theme provider
  // - Router provider
  // - Query client provider

  return render(ui, options);
}

// Re-export everything from RTL for convenience
export * from "@testing-library/react";
export { renderWithProviders as render };
