// src/services/data/types.ts

/**
 * Progress tracking for data loading operations
 */
export interface LoadProgress {
  loaded: number;
  total: number;
  phase: "metadata" | "tree" | "activity" | "complete";
}
