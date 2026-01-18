// src/setupTests.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// ============================================================================
// GLOBAL TEST SETUP
// ============================================================================

// ============================================================================
// WEB APIs MOCKING
// ============================================================================

/**
 * Mock localStorage and sessionStorage
 * Required for tests that interact with browser storage
 */
class LocalStorageMock implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock();
global.sessionStorage = new LocalStorageMock();

/**
 * Mock IntersectionObserver
 * Required for components using lazy loading or scroll detection
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

/**
 * Mock ResizeObserver
 * Required for components that respond to size changes
 */
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

/**
 * Mock window.matchMedia
 * Required for responsive components and theme detection
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================================
// CANVAS MOCKING
// ============================================================================

/**
 * Mock Canvas and CanvasRenderingContext2D
 * Required for D3 visualizations and canvas-based components
 */
HTMLCanvasElement.prototype.getContext = vi
  .fn()
  .mockImplementation((contextId) => {
    if (contextId === "2d") {
      return {
        // Drawing rectangles
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),

        // Drawing text
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),

        // Line styles
        lineWidth: 1,
        lineCap: "butt",
        lineJoin: "miter",
        miterLimit: 10,
        setLineDash: vi.fn(),
        getLineDash: vi.fn(() => []),

        // Fill and stroke styles
        fillStyle: "#000000",
        strokeStyle: "#000000",

        // Transformations
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),

        // Compositing
        globalAlpha: 1.0,
        globalCompositeOperation: "source-over",

        // Drawing paths
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        rect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clip: vi.fn(),
        isPointInPath: vi.fn(() => false),
        isPointInStroke: vi.fn(() => false),

        // Canvas state
        save: vi.fn(),
        restore: vi.fn(),
        canvas: document.createElement("canvas"),

        // Additional properties
        shadowBlur: 0,
        shadowColor: "rgba(0, 0, 0, 0)",
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        font: "10px sans-serif",
        textAlign: "start",
        textBaseline: "alphabetic",
        direction: "ltr",
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  });

// ============================================================================
// CONSOLE SUPPRESSION (OPTIONAL)
// ============================================================================

/**
 * Suppress console errors/warnings in tests
 * Uncomment if you want cleaner test output
 */
// const originalError = console.error;
// const originalWarn = console.warn;

// beforeAll(() => {
//   console.error = vi.fn();
//   console.warn = vi.fn();
// });

// afterAll(() => {
//   console.error = originalError;
//   console.warn = originalWarn;
// });

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all mocks after each test
 * Ensures test isolation
 */
afterEach(() => {
  vi.clearAllMocks();
});
