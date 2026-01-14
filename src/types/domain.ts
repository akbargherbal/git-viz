// src/types/domain.ts

/**
 * Core domain types for Git repository data
 */

export interface RepoMetadata {
  repository_name: string;
  generation_date: string;
  date_range: {
    start: string;
    end: string;
  };
  stats: {
    total_commits: number;
    total_files: number;
    total_authors: number;
  };
  authors: Array<{
    name: string;
    email: string;
    commit_count: number;
  }>;
  file_types: Array<{
    extension: string;
    count: number;
  }>;
  // NEW: Pre-aggregated directory statistics
  directory_stats?: Array<{
    path: string;
    total_commits: number;
    activity_score: number;
  }>;
}

export interface OptimizedDirectoryNode {
  id: number;
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: OptimizedDirectoryNode[];
  value?: number;
  size?: number;
}

export interface ActivityMatrixItem {
  d: string;      // Date (YYYY-MM-DD)
  id: number;     // Directory ID
  a: number;      // Added count
  m: number;      // Modified count
  del: number;    // Deleted count
  au: number;     // Unique authors count
  c: number;      // Commits count
  tc: string[];   // Top Contributors
  tf: string[];   // Top Files
}

export type TimeBinType = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type MetricType = 'commits' | 'events' | 'authors' | 'lines';

export interface TimeRange {
  start: Date;
  end: Date;
}