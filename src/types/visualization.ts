// src/types/visualization.ts

import { FileEvent, TimeBinType, MetricType } from './domain';

/**
 * Visualization-specific types
 */

// Timeline Heatmap types
export interface HeatmapCell {
  directory: string;
  timeBin: string;
  value: number;
  events: FileEvent[];
  uniqueAuthors: Set<string>;
  creations: number;
  deletions: number;
  modifications: number;
  date: Date;
}

export interface HeatmapData {
  cells: HeatmapCell[][];
  directories: string[];
  timeBins: string[];
  maxValue: number;
  minDate: Date;
  maxDate: Date;
}

export interface HeatmapConfig {
  timeBin: TimeBinType;
  metric: MetricType;
  maxDirectories: number;
  showFileCreations: boolean;
  showFileDeletions: boolean;
  colorScheme: 'viridis' | 'plasma' | 'warm' | 'cool';
}

// Treemap types
export interface TreemapNode {
  name: string;
  path: string;
  value: number; // size (lines or bytes)
  changeFrequency: number; // commits or modifications
  children?: TreemapNode[];
  level: number;
  isDirectory: boolean;
  lastModified?: Date;
  createdAt?: Date;
  totalEvents?: number;
  uniqueAuthors?: number;
}

export interface TreemapSnapshot {
  timestamp: Date;
  label: string;
  root: TreemapNode;
}

export interface TreemapData {
  snapshots: TreemapSnapshot[];
  currentIndex: number;
}

export interface TreemapConfig {
  snapshots: 'monthly' | 'quarterly' | 'yearly';
  sizeMetric: 'lines' | 'events' | 'files';
  colorMetric: 'changeFrequency' | 'age' | 'authors';
  showLabels: boolean;
  minNodeSize: number;
  animationDuration: number;
}

// Plugin system types
export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  priority: number; // 1 = highest priority
}

export interface FilterState {
  authors: Set<string>;
  directories: Set<string>;
  fileTypes: Set<string>;
  eventTypes: Set<string>;
  timeRange: { start: Date; end: Date } | null;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'json' | 'csv';
  filename?: string;
  includeMetadata?: boolean;
}
