// src/store/appStore.ts

import { create } from 'zustand';
import { FileEvent, FileSummary, TimeRange, TimeBinType, MetricType } from '@/types/domain';
import { FilterState } from '@/types/visualization';

/**
 * Global application state store
 */

interface DataState {
  events: FileEvent[];
  summary: FileSummary[];
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

interface TimelineState {
  isPlaying: boolean;
  currentTime: Date | null;
  playbackSpeed: number;
}

interface AppState {
  // Data
  data: DataState;
  setData: (events: FileEvent[], summary: FileSummary[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Filters
  filters: FilterStateStore;
  setTimeBin: (timeBin: TimeBinType) => void;
  setMetric: (metric: MetricType) => void;
  setTimeRange: (range: TimeRange | null) => void;
  toggleAuthor: (author: string) => void;
  toggleDirectory: (dir: string) => void;
  toggleFileType: (type: string) => void;
  toggleEventType: (type: string) => void;
  clearFilters: () => void;
  
  // UI
  ui: UIState;
  setActivePlugin: (pluginId: string) => void;
  setSelectedCell: (cell: any | null) => void;
  setShowFilters: (show: boolean) => void;
  toggleDirectory: (dir: string) => void;
  
  // Timeline
  timeline: TimelineState;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: Date | null) => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Data state
  data: {
    events: [],
    summary: [],
    loading: false,
    error: null,
  },
  
  setData: (events, summary) =>
    set((state) => ({
      data: { ...state.data, events, summary, loading: false, error: null },
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
  
  toggleDirectory: (dir) =>
    set((state) => {
      const directories = new Set(state.filters.directories);
      if (directories.has(dir)) {
        directories.delete(dir);
      } else {
        directories.add(dir);
      }
      return { filters: { ...state.filters, directories } };
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
  
  toggleEventType: (type) =>
    set((state) => {
      const eventTypes = new Set(state.filters.eventTypes);
      if (eventTypes.has(type)) {
        eventTypes.delete(type);
      } else {
        eventTypes.add(type);
      }
      return { filters: { ...state.filters, eventTypes } };
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
  
  // Timeline state
  timeline: {
    isPlaying: false,
    currentTime: null,
    playbackSpeed: 1,
  },
  
  setPlaying: (playing) =>
    set((state) => ({
      timeline: { ...state.timeline, isPlaying: playing },
    })),
  
  setCurrentTime: (time) =>
    set((state) => ({
      timeline: { ...state.timeline, currentTime: time },
    })),
  
  setPlaybackSpeed: (speed) =>
    set((state) => ({
      timeline: { ...state.timeline, playbackSpeed: speed },
    })),
}));
