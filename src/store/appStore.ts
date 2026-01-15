// src/store/appStore.ts

import { create } from 'zustand';
import { 
  RepoMetadata, 
  OptimizedDirectoryNode, 
  ActivityMatrixItem,
  TimeRange, 
  TimeBinType, 
  MetricType 
} from '@/types/domain';
import { FilterState } from '@/types/visualization';

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
    activity: ActivityMatrixItem[]
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
}

export const useAppStore = create<AppState>((set) => ({
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
      data: { ...state.data, metadata, tree, activity, loading: false, error: null },
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
    timeBin: 'week',
    metric: 'commits',
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
      ui: { ...state.ui, selectedCell: cell },
    })),
  
  setShowFilters: (show) =>
    set((state) => ({
      ui: { ...state.ui, showFilters: show },
    })),
}));