// src/types/domain.ts

/**
 * Core domain types for Git repository data
 */

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
