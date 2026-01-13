// src/types/visualization.ts

/**
 * Visualization-specific types
 */

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