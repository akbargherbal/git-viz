// src/services/data/DatasetRegistry.ts

/**
 * Dataset definition with metadata
 */
export interface DatasetDefinition {
  path: string;
  type: "time_series" | "hierarchy" | "network" | "metadata" | "snapshot";
  description: string;
  schema_version?: string;
  size_estimate?: string; // Human-readable size estimate
}

/**
 * Central registry for all V2 datasets
 * Provides dataset discovery and path resolution
 */
export class DatasetRegistryClass {
  private static datasets: Record<string, DatasetDefinition> = {
    // Temporal/Time-Series Datasets
    temporal_daily: {
      path: "/DATASETS_excalidraw/aggregations/temporal_daily.json",
      type: "time_series",
      description: "Daily commit activity aggregation",
      schema_version: "2.0",
      size_estimate: "245 KB",
    },
    temporal_monthly: {
      path: "/DATASETS_excalidraw/aggregations/temporal_monthly.json",
      type: "time_series",
      description: "Monthly commit activity aggregation",
      schema_version: "2.0",
      size_estimate: "~20 KB",
    },

    // Core Lifecycle Data
    file_lifecycle: {
      path: "/DATASETS_excalidraw/file_lifecycle.json",
      type: "metadata",
      description: "Complete file lifecycle event stream",
      schema_version: "2.0",
      size_estimate: "9.56 MB",
    },

    // Directory and File Metadata
    directory_stats: {
      path: "/DATASETS_excalidraw/aggregations/directory_stats.json",
      type: "hierarchy",
      description: "Pre-aggregated directory-level statistics",
      schema_version: "2.0",
      size_estimate: "851 KB",
    },
    file_index: {
      path: "/DATASETS_excalidraw/metadata/file_index.json",
      type: "metadata",
      description: "File-level metadata with primary authors and statistics",
      schema_version: "2.0",
      size_estimate: "1.29 MB",
    },

    // Network Datasets
    author_network: {
      path: "/DATASETS_excalidraw/networks/author_network.json",
      type: "network",
      description: "Author collaboration network",
      schema_version: "2.0",
      size_estimate: "1.77 MB",
    },
    cochange_network: {
      path: "/DATASETS_excalidraw/networks/cochange_network.json",
      type: "network",
      description: "File co-change network (files that change together)",
      schema_version: "2.0",
      size_estimate: "21.43 MB",
    },

    // Milestone Snapshots
    release_snapshots: {
      path: "/DATASETS_excalidraw/milestones/release_snapshots.json",
      type: "snapshot",
      description: "Repository state at each release/tag",
      schema_version: "2.0",
      size_estimate: "10.39 KB",
    },
  };

  /**
   * Get the file system path for a dataset
   */
  static getPath(datasetId: string): string | null {
    const dataset = this.datasets[datasetId];
    return dataset ? dataset.path : null;
  }

  /**
   * Get full dataset definition including metadata
   */
  static getDefinition(datasetId: string): DatasetDefinition | null {
    return this.datasets[datasetId] || null;
  }

  /**
   * List all available dataset IDs
   */
  static listAvailable(): string[] {
    return Object.keys(this.datasets).sort();
  }

  /**
   * List datasets by type
   */
  static listByType(type: DatasetDefinition["type"]): string[] {
    return Object.entries(this.datasets)
      .filter(([_, def]) => def.type === type)
      .map(([id]) => id)
      .sort();
  }

  /**
   * Check if a dataset exists in the registry
   */
  static has(datasetId: string): boolean {
    return datasetId in this.datasets;
  }

  /**
   * Get all dataset definitions
   */
  static getAll(): Record<string, DatasetDefinition> {
    return { ...this.datasets };
  }

  /**
   * Validate that multiple datasets exist
   */
  static validateDatasets(datasetIds: string[]): {
    valid: boolean;
    missing: string[];
    available: string[];
  } {
    const missing = datasetIds.filter((id) => !this.has(id));
    const available = datasetIds.filter((id) => this.has(id));

    return {
      valid: missing.length === 0,
      missing,
      available,
    };
  }

  /**
   * Get dataset type for a given dataset ID
   */
  static getType(datasetId: string): DatasetDefinition["type"] | null {
    const def = this.getDefinition(datasetId);
    return def ? def.type : null;
  }
}

export const DatasetRegistry = DatasetRegistryClass;
