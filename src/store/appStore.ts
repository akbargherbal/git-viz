// src/store/appStore.ts

import { create } from "zustand";
import {
  RepoMetadata,
  OptimizedDirectoryNode,
  ActivityMatrixItem,
  TimeRange,
  TimeBinType,
  MetricType,
} from "@/types/domain";
import { FilterState } from "@/types/visualization";

interface DataState {
  metadata: RepoMetadata | null;
  tree: OptimizedDirectoryNode | null;
  activity: ActivityMatrixItem[];
  loading: boolean;
  error: string | null;
}

interface FilterStateStore extends FilterState {
  timeBin: TimeBinType;
  metric: MetricType;
}

interface UIState {
  activePluginId: string | null;
  selectedCell: any | null;
  showFilters: boolean;
  collapsedDirs: Set<string>;
}

interface AppState {
  // Data
  data: DataState;
  setOptimizedData: (
    metadata: RepoMetadata,
    tree: OptimizedDirectoryNode,
    activity: ActivityMatrixItem[],
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Filters
  filters: FilterStateStore;
  setTimeBin: (timeBin: TimeBinType) => void;
  setMetric: (metric: MetricType) => void;
  setTimeRange: (range: TimeRange | null) => void;
  toggleAuthor: (author: string) => void;
  toggleFileType: (type: string) => void;
  clearFilters: () => void;

  // UI
  ui: UIState;
  setActivePlugin: (pluginId: string) => void;
  setSelectedCell: (cell: any | null) => void;
  setShowFilters: (show: boolean) => void;

  // PHASE 1 ADDITION: Plugin State Management
  /**
   * Per-plugin state storage
   * Key: plugin ID, Value: plugin-specific state object
   */
  pluginStates: Record<string, Record<string, unknown>>;

  /**
   * Update state for a specific plugin
   * Merges the provided updates with existing state
   * 
   * @param pluginId - ID of the plugin to update state for
   * @param updates - Partial state object to merge with current state
   */
  setPluginState: (pluginId: string, updates: Record<string, unknown>) => void;

  /**
   * Get state for a specific plugin
   * Returns empty object if no state exists
   * 
   * @param pluginId - ID of the plugin to get state for
   * @returns Plugin state object
   */
  getPluginState: (pluginId: string) => Record<string, unknown>;

  /**
   * Initialize state for a plugin if it doesn't exist
   * 
   * @param pluginId - ID of the plugin
   * @param initialState - Initial state to set if no state exists
   */
  initPluginState: (pluginId: string, initialState: Record<string, unknown>) => void;

  /**
   * Clear state for a specific plugin
   * 
   * @param pluginId - ID of the plugin to clear state for
   */
  clearPluginState: (pluginId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Data state
  data: {
    metadata: null,
    tree: null,
    activity: [],
    loading: false,
    error: null,
  },

  setOptimizedData: (metadata, tree, activity) =>
    set((state) => ({
      data: {
        ...state.data,
        metadata,
        tree,
        activity,
        loading: false,
        error: null,
      },
    })),

  setLoading: (loading) =>
    set((state) => ({
      data: { ...state.data, loading },
    })),

  setError: (error) =>
    set((state) => ({
      data: { ...state.data, error, loading: false },
    })),

  // Filter state
  filters: {
    authors: new Set(),
    directories: new Set(),
    fileTypes: new Set(),
    eventTypes: new Set(),
    timeRange: null,
    timeBin: "week",
    metric: "commits",
  },

  setTimeBin: (timeBin) =>
    set((state) => ({
      filters: { ...state.filters, timeBin },
    })),

  setMetric: (metric) =>
    set((state) => ({
      filters: { ...state.filters, metric },
    })),

  setTimeRange: (timeRange) =>
    set((state) => ({
      filters: { ...state.filters, timeRange },
    })),

  toggleAuthor: (author) =>
    set((state) => {
      const authors = new Set(state.filters.authors);
      if (authors.has(author)) {
        authors.delete(author);
      } else {
        authors.add(author);
      }
      return { filters: { ...state.filters, authors } };
    }),

  toggleFileType: (type) =>
    set((state) => {
      const fileTypes = new Set(state.filters.fileTypes);
      if (fileTypes.has(type)) {
        fileTypes.delete(type);
      } else {
        fileTypes.add(type);
      }
      return { filters: { ...state.filters, fileTypes } };
    }),

  clearFilters: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        authors: new Set(),
        directories: new Set(),
        fileTypes: new Set(),
        eventTypes: new Set(),
      },
    })),

  // UI state
  ui: {
    activePluginId: null,
    selectedCell: null,
    showFilters: false,
    collapsedDirs: new Set(),
  },

  setActivePlugin: (pluginId) =>
    set((state) => ({
      ui: { ...state.ui, activePluginId: pluginId },
    })),

  setSelectedCell: (cell) =>
    set((state) => ({
      ui: {
        ...state.ui,
        selectedCell: cell,
        // Mutual exclusivity: If opening detail panel (cell != null), close filters
        showFilters: cell ? false : state.ui.showFilters,
      },
    })),

  setShowFilters: (show) =>
    set((state) => ({
      ui: {
        ...state.ui,
        showFilters: show,
        // Mutual exclusivity: If opening filters (show == true), close detail panel
        selectedCell: show ? null : state.ui.selectedCell,
      },
    })),

  // PHASE 1 ADDITION: Plugin state management
  pluginStates: {},

  setPluginState: (pluginId, updates) =>
    set((state) => ({
      pluginStates: {
        ...state.pluginStates,
        [pluginId]: {
          ...(state.pluginStates[pluginId] || {}),
          ...updates,
        },
      },
    })),

  getPluginState: (pluginId) => {
    const state = get();
    return state.pluginStates[pluginId] || {};
  },

  initPluginState: (pluginId, initialState) => {
    const state = get();
    // Only initialize if state doesn't exist
    if (!state.pluginStates[pluginId]) {
      set((state) => ({
        pluginStates: {
          ...state.pluginStates,
          [pluginId]: initialState,
        },
      }));
    }
  },

  clearPluginState: (pluginId) =>
    set((state) => {
      const { [pluginId]: _, ...restStates } = state.pluginStates;
      return { pluginStates: restStates };
    }),
}));