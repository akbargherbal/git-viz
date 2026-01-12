// src/types/domain.ts

/**
 * Core domain types for Git repository data
 */

// --- NEW OPTIMIZED TYPES ---

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
}

export interface OptimizedDirectoryNode {
  id: number;
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: OptimizedDirectoryNode[];
  // Computed fields for visualization
  value?: number;
  size?: number;
}

export interface ActivityMatrixItem {
  d: string;      // Date (YYYY-MM-DD)
  id: number;     // Directory ID (matches directory_tree.json)
  a: number;      // Added count
  m: number;      // Modified count
  del: number;    // Deleted count
  au: number;     // Unique authors count
  c: number;      // Commits count
}

// --- LEGACY TYPES (Kept for compatibility during migration) ---

export interface FileEvent {
  file_path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'type_changed';
  commit_hash: string;
  commit_datetime: Date;
  commit_timestamp: number;
  author_name: string;
  author_email: string;
  commit_subject: string;
  old_mode: number;
  new_mode: number;
  old_sha: string;
  new_sha: string;
  old_path?: string;
  new_path?: string;
  similarity?: number;
}

export interface FileSummary {
  file_path: string;
  total_events: number;
  added_count: number;
  modified_count: number;
  deleted_count: number;
  renamed_count: number;
  copied_count: number;
  type_changed_count: number;
  first_seen: string;
  last_seen: string;
  first_commit: string;
  last_commit: string;
}

export interface DirectoryNode {
  name: string;
  path: string;
  level: number;
  isDirectory: boolean;
  children?: DirectoryNode[];
  files?: string[];
  eventCount: number;
  fileCount: number;
  collapsed?: boolean;
}

export interface Author {
  name: string;
  email: string;
  commitCount: number;
  firstCommit: Date;
  lastCommit: Date;
}

export type TimeBinType = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type MetricType = 'commits' | 'events' | 'authors' | 'lines';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface CommitInfo {
  hash: string;
  datetime: Date;
  timestamp: number;
  author_name: string;
  author_email: string;
  subject: string;
}