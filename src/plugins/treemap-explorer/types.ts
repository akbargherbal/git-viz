// src/plugins/treemap-explorer/types.ts

/**
 * Core file data structure with basic metadata
 */
export interface FileData {
  key: string;
  name: string;
  path: string;
  first_seen?: string;
  last_modified?: string;
  total_commits: number; // snake_case to match raw data
  unique_authors: number;
  operations?: {
    M?: number;
    A?: number;
    D?: number;
    R?: number;
  };
  age_days?: number;
  commits_per_day?: number;
  lifecycle_event_count?: number;
  primary_author?: {
    email: string;
    commit_count: number;
    percentage: number;
  };
}

/**
 * Enriched file data with health scoring
 */
export interface EnrichedFileData extends FileData {
  healthScore?: {
    score: number;
    category: "critical" | "medium" | "healthy";
    churnRate: number;
    busFactor: "high-risk" | "medium-risk" | "low-risk";
    factors: {
      churn: { value: number; score: number; weight: number };
      authors: { value: number; score: number; weight: number };
      age: { value: number; score: number; weight: number };
    };
  };
  // Coupling specific fields
  couplingMetrics?: {
    maxStrength: number;
    avgStrength: number;
    totalPartners: number;
    strongCouplings: number;
  };
  maxCoupling?: number; // Legacy field support
  coupledFiles?: Array<{
    file: string;
    strength: number;
    cochangeCount: number;
  }>;
}

/**
 * Extended file data with temporal context
 */
export interface TemporalFileData extends EnrichedFileData {
  // Temporal-specific fields
  createdDate: string;
  lastModifiedDate: string;
  dormantDays: number;
  activityTimeline?: Array<{ date: string; commits: number }>;
  isDormant: boolean;
  isVisible: boolean;
  createdPosition?: number; // Position in timeline (0-100) when file was created

  // Keep base fields for backward compatibility
  ageDays: number;
  totalCommits: number; // camelCase alias often used in components
  uniqueAuthors: number;
  operations: {
    M?: number;
    A?: number;
    D?: number;
    R?: number;
  };
}

/**
 * Temporal daily aggregation data structure
 */
export interface TemporalDailyData {
  schema_version?: string;
  aggregation_level?: string;
  total_days?: number;
  // Support both Array and Record formats to handle dataset variations
  days:
    | Array<{
        key: string;
        date: string;
        commits: number;
        files_changed: number;
        unique_authors: number;
        operations: {
          M?: number;
          A?: number;
          D?: number;
          R?: number;
        };
      }>
    | Record<
        string,
        {
          key: string;
          date: string;
          commits: number;
          files_changed: number;
          unique_authors: number;
          operations: {
            M?: number;
            A?: number;
            D?: number;
            R?: number;
          };
        }
      >;
}

/**
 * Treemap hierarchy node data
 * NOTE: In D3 hierarchy, the node.data property holds the user data.
 * We define this to help with typing, but in practice we cast to EnrichedFileData.
 */
export interface TreemapHierarchyDatum {
  data: EnrichedFileData | TemporalFileData;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  value?: number;
}

/**
 * Plugin state interface
 */
export interface TreemapExplorerState extends Record<string, unknown> {
  lensMode: "debt" | "coupling" | "time";
  sizeMetric: "commits" | "authors" | "events";
  selectedFile: string | null;

  // Debt lens filters
  healthThreshold?: number;

  // Coupling lens filters
  couplingThreshold?: number;
  showArcs?: boolean;

  // Time lens filters and controls
  timePosition?: number;
  playing?: boolean;
  timeFilters?: {
    showCreations: boolean;
    fadeDormant: boolean;
  };
}
