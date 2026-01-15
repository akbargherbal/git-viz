// src/services/data/PluginDataLoader.ts

import { DatasetRegistry } from "./DatasetRegistry";

/**
 * Plugin data requirement specification
 */
export interface PluginDataRequirement {
  dataset: string;
  required: boolean;
  transform?: (raw: any) => any;
  alias?: string; // Optional alias for the dataset in the returned object
}

/**
 * Result of loading plugin data
 */
export interface PluginDataLoadResult {
  success: boolean;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

/**
 * Cache-aware data loader for plugins
 * Handles loading datasets based on plugin declarations
 */
export class PluginDataLoaderClass {
  private cache: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  /**
   * Load datasets required by a plugin
   */
  async loadForPlugin(
    requirements: PluginDataRequirement[],
  ): Promise<PluginDataLoadResult> {
    const result: PluginDataLoadResult = {
      success: true,
      data: {},
      errors: [],
      warnings: [],
    };

    // Validate all required datasets exist in registry
    const validation = DatasetRegistry.validateDatasets(
      requirements.map((req) => req.dataset),
    );

    if (!validation.valid) {
      result.errors.push(
        `Missing datasets in registry: ${validation.missing.join(", ")}`,
      );
    }

    // Load each dataset
    for (const requirement of requirements) {
      try {
        const datasetId = requirement.dataset;
        const alias = requirement.alias || datasetId;

        // Check if dataset exists in registry
        if (!DatasetRegistry.has(datasetId)) {
          const message = `Dataset "${datasetId}" not found in registry`;
          if (requirement.required) {
            result.errors.push(message);
            result.success = false;
          } else {
            result.warnings.push(message);
          }
          continue;
        }

        // Load the dataset (with caching)
        const rawData = await this.loadDataset(datasetId);

        // Apply transform if provided
        const processedData = requirement.transform
          ? requirement.transform(rawData)
          : rawData;

        result.data[alias] = processedData;
      } catch (error) {
        const message = `Failed to load dataset "${requirement.dataset}": ${
          error instanceof Error ? error.message : String(error)
        }`;

        if (requirement.required) {
          result.errors.push(message);
          result.success = false;
        } else {
          result.warnings.push(message);
        }
      }
    }

    return result;
  }

  /**
   * Load a single dataset with caching
   */
  async loadDataset(datasetId: string): Promise<any> {
    // Return cached data if available
    if (this.cache.has(datasetId)) {
      console.log(`[PluginDataLoader] Cache hit for: ${datasetId}`);
      return this.cache.get(datasetId);
    }

    // If already loading, return the existing promise
    if (this.loadingPromises.has(datasetId)) {
      console.log(
        `[PluginDataLoader] Waiting for in-flight load: ${datasetId}`,
      );
      return this.loadingPromises.get(datasetId);
    }

    // Start loading
    console.log(`[PluginDataLoader] Loading dataset: ${datasetId}`);
    const loadPromise = this.fetchDataset(datasetId);

    // Store the promise
    this.loadingPromises.set(datasetId, loadPromise);

    try {
      const data = await loadPromise;
      // Cache the result
      this.cache.set(datasetId, data);
      return data;
    } catch (error) {
      console.error(`[PluginDataLoader] Failed to load ${datasetId}:`, error);
      throw error;
    } finally {
      // Clean up loading promise
      this.loadingPromises.delete(datasetId);
    }
  }

  /**
   * Fetch dataset from the file system
   */
  private async fetchDataset(datasetId: string): Promise<any> {
    const path = DatasetRegistry.getPath(datasetId);
    if (!path) {
      throw new Error(`Dataset "${datasetId}" not found in registry`);
    }

    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${datasetId}: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Preload multiple datasets (for performance optimization)
   */
  async preloadDatasets(datasetIds: string[]): Promise<void> {
    console.log(
      `[PluginDataLoader] Preloading ${datasetIds.length} datasets...`,
    );

    const loadPromises = datasetIds.map((id) => {
      // Only load if not already cached
      if (!this.cache.has(id)) {
        return this.loadDataset(id).catch((error) => {
          console.warn(`[PluginDataLoader] Preload failed for ${id}:`, error);
        });
      }
      return Promise.resolve();
    });

    await Promise.all(loadPromises);
    console.log(`[PluginDataLoader] Preload complete`);
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    console.log(
      `[PluginDataLoader] Clearing cache (${this.cache.size} datasets)`,
    );
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Clear cache for specific datasets
   */
  clearDatasets(datasetIds: string[]): void {
    datasetIds.forEach((id) => {
      if (this.cache.has(id)) {
        console.log(`[PluginDataLoader] Clearing cache for: ${id}`);
        this.cache.delete(id);
      }
    });
  }

  /**
   * Check if a dataset is cached
   */
  isCached(datasetId: string): boolean {
    return this.cache.has(datasetId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedCount: number;
    cachedDatasets: string[];
    loadingCount: number;
    loadingDatasets: string[];
  } {
    return {
      cachedCount: this.cache.size,
      cachedDatasets: Array.from(this.cache.keys()).sort(),
      loadingCount: this.loadingPromises.size,
      loadingDatasets: Array.from(this.loadingPromises.keys()).sort(),
    };
  }

  /**
   * Estimate total cache size (approximate)
   */
  estimateCacheSize(): string {
    const datasets = Array.from(this.cache.keys());
    let totalEstimate = 0;

    datasets.forEach((id) => {
      const def = DatasetRegistry.getDefinition(id);
      if (def?.size_estimate) {
        // Parse size estimates like "1.77 MB" or "10.39 KB"
        const match = def.size_estimate.match(/(\d+\.?\d*)\s*(MB|KB|GB)/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();

          if (unit === "KB") {
            totalEstimate += value;
          } else if (unit === "MB") {
            totalEstimate += value * 1024;
          } else if (unit === "GB") {
            totalEstimate += value * 1024 * 1024;
          }
        }
      }
    });

    if (totalEstimate < 1024) {
      return `~${totalEstimate.toFixed(2)} KB`;
    } else if (totalEstimate < 1024 * 1024) {
      return `~${(totalEstimate / 1024).toFixed(2)} MB`;
    } else {
      return `~${(totalEstimate / (1024 * 1024)).toFixed(2)} GB`;
    }
  }

  /**
   * Load multiple datasets in parallel
   */
  async loadMultiple(datasetIds: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    const loadPromises = datasetIds.map(async (id) => {
      try {
        results[id] = await this.loadDataset(id);
      } catch (error) {
        console.error(`Failed to load ${id}:`, error);
        throw error;
      }
    });

    await Promise.all(loadPromises);
    return results;
  }

  /**
   * Warm up cache with commonly used datasets
   * Call this on app initialization for better UX
   */
  async warmupCache(
    commonDatasets: string[] = [
      "file_lifecycle",
      "directory_stats",
      "file_index",
      "temporal_daily",
    ],
  ): Promise<void> {
    console.log("[PluginDataLoader] Warming up cache...");
    await this.preloadDatasets(commonDatasets);
  }
}

// Export singleton instance
export const PluginDataLoader = new PluginDataLoaderClass();
