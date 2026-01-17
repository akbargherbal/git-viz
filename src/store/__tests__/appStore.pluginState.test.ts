// src/store/__tests__/appStore.pluginState.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../appStore";

describe("appStore - Plugin State Management (Phase 1)", () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useAppStore.getState();
    store.pluginStates = {};
  });

  describe("setPluginState", () => {
    it("should initialize plugin state if it does not exist", () => {
      const { setPluginState } = useAppStore.getState();

      setPluginState("test-plugin", { metric: "commits", timeBin: "day" });

      const updatedStates = useAppStore.getState().pluginStates;
      expect(updatedStates["test-plugin"]).toEqual({
        metric: "commits",
        timeBin: "day",
      });
    });

    it("should merge updates with existing plugin state", () => {
      const { setPluginState } = useAppStore.getState();

      // Initialize state
      setPluginState("test-plugin", { metric: "commits", timeBin: "day" });

      // Update state
      setPluginState("test-plugin", { metric: "events" });

      const updatedStates = useAppStore.getState().pluginStates;
      expect(updatedStates["test-plugin"]).toEqual({
        metric: "events",
        timeBin: "day", // Previous value preserved
      });
    });

    it("should handle multiple plugins independently", () => {
      const { setPluginState } = useAppStore.getState();

      setPluginState("plugin-1", { value: "a" });
      setPluginState("plugin-2", { value: "b" });

      const states = useAppStore.getState().pluginStates;
      expect(states["plugin-1"]).toEqual({ value: "a" });
      expect(states["plugin-2"]).toEqual({ value: "b" });
    });

    it("should handle complex state objects", () => {
      const { setPluginState } = useAppStore.getState();

      const complexState = {
        metric: "commits",
        selectedAuthors: ["Alice", "Bob"],
        selectedExtensions: [".ts", ".tsx"],
        filters: {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        },
      };

      setPluginState("test-plugin", complexState);

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual(complexState);
    });
  });

  describe("getPluginState", () => {
    it("should return plugin state if it exists", () => {
      const { setPluginState, getPluginState } = useAppStore.getState();

      setPluginState("test-plugin", { metric: "commits" });

      const state = getPluginState("test-plugin");
      expect(state).toEqual({ metric: "commits" });
    });

    it("should return empty object if plugin state does not exist", () => {
      const { getPluginState } = useAppStore.getState();

      const state = getPluginState("non-existent-plugin");
      expect(state).toEqual({});
    });

    it("should not create state when retrieving non-existent state", () => {
      const { getPluginState } = useAppStore.getState();

      getPluginState("non-existent-plugin");

      const states = useAppStore.getState().pluginStates;
      expect(states["non-existent-plugin"]).toBeUndefined();
    });
  });

  describe("initPluginState", () => {
    it("should initialize plugin state if it does not exist", () => {
      const { initPluginState } = useAppStore.getState();

      initPluginState("test-plugin", { metric: "commits", timeBin: "day" });

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual({
        metric: "commits",
        timeBin: "day",
      });
    });

    it("should NOT overwrite existing plugin state", () => {
      const { initPluginState, setPluginState } = useAppStore.getState();

      // Set initial state
      setPluginState("test-plugin", { metric: "events", timeBin: "week" });

      // Try to initialize (should be ignored)
      initPluginState("test-plugin", { metric: "commits", timeBin: "day" });

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual({
        metric: "events",
        timeBin: "week", // Original state preserved
      });
    });

    it("should handle empty initial state", () => {
      const { initPluginState } = useAppStore.getState();

      initPluginState("test-plugin", {});

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual({});
    });
  });

  describe("clearPluginState", () => {
    it("should remove plugin state", () => {
      const { setPluginState, clearPluginState } = useAppStore.getState();

      setPluginState("test-plugin", { metric: "commits" });
      clearPluginState("test-plugin");

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toBeUndefined();
    });

    it("should not affect other plugin states", () => {
      const { setPluginState, clearPluginState } = useAppStore.getState();

      setPluginState("plugin-1", { value: "a" });
      setPluginState("plugin-2", { value: "b" });

      clearPluginState("plugin-1");

      const states = useAppStore.getState().pluginStates;
      expect(states["plugin-1"]).toBeUndefined();
      expect(states["plugin-2"]).toEqual({ value: "b" });
    });

    it("should handle clearing non-existent plugin state gracefully", () => {
      const { clearPluginState } = useAppStore.getState();

      // Should not throw
      expect(() => clearPluginState("non-existent-plugin")).not.toThrow();
    });
  });

  describe("State persistence across operations", () => {
    it("should maintain state through multiple updates", () => {
      const { setPluginState } = useAppStore.getState();

      setPluginState("test-plugin", { count: 0 });
      setPluginState("test-plugin", { count: 1 });
      setPluginState("test-plugin", { count: 2 });

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual({ count: 2 });
    });

    it("should preserve state when switching between plugins", () => {
      const { setPluginState, getPluginState } = useAppStore.getState();

      // Set state for plugin 1
      setPluginState("plugin-1", { value: "first" });

      // Set state for plugin 2
      setPluginState("plugin-2", { value: "second" });

      // Get state for plugin 1 (should still exist)
      const state1 = getPluginState("plugin-1");
      expect(state1).toEqual({ value: "first" });

      // Get state for plugin 2
      const state2 = getPluginState("plugin-2");
      expect(state2).toEqual({ value: "second" });
    });
  });

  describe("Edge cases and type safety", () => {
    it("should handle undefined values in updates", () => {
      const { setPluginState } = useAppStore.getState();

      setPluginState("test-plugin", { value: undefined });

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual({ value: undefined });
    });

    it("should handle null values in updates", () => {
      const { setPluginState } = useAppStore.getState();

      setPluginState("test-plugin", { value: null });

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual({ value: null });
    });

    it("should handle arrays in state", () => {
      const { setPluginState } = useAppStore.getState();

      const arrayState = {
        selectedItems: ["item1", "item2", "item3"],
        numbers: [1, 2, 3],
      };

      setPluginState("test-plugin", arrayState);

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual(arrayState);
    });

    it("should handle nested objects in state", () => {
      const { setPluginState } = useAppStore.getState();

      const nestedState = {
        config: {
          display: {
            mode: "dark",
            fontSize: 14,
          },
          filters: {
            enabled: true,
            items: ["a", "b"],
          },
        },
      };

      setPluginState("test-plugin", nestedState);

      const states = useAppStore.getState().pluginStates;
      expect(states["test-plugin"]).toEqual(nestedState);
    });
  });
});
