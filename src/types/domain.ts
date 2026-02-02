// src/types/domain.ts

/**
 * Core domain types for Git repository data
 */

export interface FileStat {
  path: string;
  total_commits: number;
  primary_author?: {
    email: string;
    percentage: number;
  };
  last_modified?: string;
}

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
  // Pre-aggregated directory statistics
  directory_stats?: Array<{
    path: string;
    total_commits: number;
    activity_score: number;
  }>;
  // NEW: File-level statistics from V2 index
  file_stats?: Record<string, FileStat>;
}

export interface OptimizedDirectoryNode {
  id: number;
  name: string;
  path: string;
  type: "directory" | "file";
  children?: OptimizedDirectoryNode[];
  value?: number;
  size?: number;
}

export interface ActivityMatrixItem {
  d: string; // Date (YYYY-MM-DD)
  id: number; // Directory ID
  a: number; // Added count
  m: number; // Modified count
  del: number; // Deleted count
  au: number; // Unique authors count
  c: number; // Commits count
  tc: string[]; // Top Contributors
  tf: string[]; // Top Files
}

export type TimeBinType = "week" | "month" | "quarter" | "year";
export type MetricType = "commits" | "events" | "authors" | "lines";

export interface TimeRange {
  start: Date;
  end: Date;
}

// ============================================================================
// V2 DATASET TYPES (Frontend-Ready)
// ============================================================================

export interface FileMetrics {
  identifiers: {
    author_ids: string[];
    primary_author_id: string;
    primary_author_percentage: number;
  };
  volume: {
    lines_added: number;
    lines_deleted: number;
    net_change: number;
    total_commits: number;
  };
  coupling: {
    max_strength: number;
    top_partners: Array<{
      path: string;
      strength: number;
      cochange_count: number;
    }>;
  };
  health?: {
    score: number;
    category: "healthy" | "medium" | "critical";
    churn_rate: number;
    bus_factor: "low-risk" | "medium-risk" | "high-risk";
    factors: {
      churn: { score: number; weight: number };
      authors: { score: number; weight: number };
      age: { score: number; weight: number };
    };
  };
  lifecycle?: {
    created_at: string;
    last_modified_at: string;
    age_days: number;
    is_dormant: boolean;
  };
}

export interface ProjectHierarchyNode {
  name: string;
  path: string;
  type: "directory" | "file";
  stats?: {
    total_commits: number;
    health_score_avg?: number;
  };

  attributes?: {
    health_score: number;
    health_category: "healthy" | "medium" | "critical";
    bus_factor_status: "low-risk" | "medium-risk" | "high-risk";
    churn_rate: number;
    primary_author_id: string;
    last_modified_age_days: number;
    created_at_iso: string;
  };

  children?: ProjectHierarchyNode[];
}

export interface TemporalActivityMap {
  meta: {
    granularity: string;
    start_date: string;
    end_date: string;
    data_schema: string[];
  };
  data: Record<string, Record<string, number[]>>;
}
