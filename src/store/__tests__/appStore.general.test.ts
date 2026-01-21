// src/store/__tests__/appStore.general.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../appStore";
import { act } from "@testing-library/react";

describe("AppStore - General Logic", () => {
  beforeEach(() => {
    useAppStore.setState({
      filters: {
        authors: new Set(),
        directories: new Set(),
        fileTypes: new Set(),
        eventTypes: new Set(),
        timeRange: null,
        timeBin: "week",
        metric: "commits",
      },
      ui: {
        activePluginId: null,
        selectedCell: null,
        showFilters: false,
        collapsedDirs: new Set(),
      },
    });
  });

  describe("Filter Actions", () => {
    it("should toggle authors correctly", () => {
      const { toggleAuthor } = useAppStore.getState();

      act(() => toggleAuthor("Alice"));
      expect(useAppStore.getState().filters.authors.has("Alice")).toBe(true);

      act(() => toggleAuthor("Alice"));
      expect(useAppStore.getState().filters.authors.has("Alice")).toBe(false);
    });

    it("should toggle file types correctly", () => {
      const { toggleFileType } = useAppStore.getState();

      act(() => toggleFileType("ts"));
      expect(useAppStore.getState().filters.fileTypes.has("ts")).toBe(true);
    });

    it("should clear all filters", () => {
      const store = useAppStore.getState();
      act(() => {
        store.toggleAuthor("Alice");
        store.toggleFileType("ts");
        store.clearFilters();
      });

      const filters = useAppStore.getState().filters;
      expect(filters.authors.size).toBe(0);
      expect(filters.fileTypes.size).toBe(0);
    });
  });

  describe("UI Mutual Exclusivity", () => {
    it("should close filters when a cell is selected", () => {
      const store = useAppStore.getState();

      // Open filters first
      act(() => store.setShowFilters(true));
      expect(useAppStore.getState().ui.showFilters).toBe(true);

      // Select a cell
      act(() => store.setSelectedCell({ id: "cell-1" }));

      const ui = useAppStore.getState().ui;
      expect(ui.selectedCell).not.toBeNull();
      expect(ui.showFilters).toBe(false); // Should be closed automatically
    });

    it("should deselect cell when filters are opened", () => {
      const store = useAppStore.getState();

      // Select cell first
      act(() => store.setSelectedCell({ id: "cell-1" }));

      // Open filters
      act(() => store.setShowFilters(true));

      const ui = useAppStore.getState().ui;
      expect(ui.showFilters).toBe(true);
      expect(ui.selectedCell).toBeNull(); // Should be cleared automatically
    });
  });

  describe("Data Setters", () => {
    it("should update loading and error states", () => {
      const store = useAppStore.getState();

      act(() => store.setLoading(true));
      expect(useAppStore.getState().data.loading).toBe(true);

      act(() => store.setError("Failed"));
      expect(useAppStore.getState().data.error).toBe("Failed");
      expect(useAppStore.getState().data.loading).toBe(false); // Should auto-disable loading
    });
  });
});
