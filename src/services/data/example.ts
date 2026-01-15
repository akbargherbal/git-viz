// src/services/data/example.ts
// This file demonstrates how to use the new data services
// Can be imported and used during development/testing

import { DatasetRegistry, PluginDataLoader } from "./index";

/**
 * Example 1: Basic dataset registry operations
 */
export function exampleDatasetRegistry() {
  console.log("=== DatasetRegistry Examples ===");

  // List all available datasets
  const allDatasets = DatasetRegistry.listAvailable();
  console.log(`Total datasets: ${allDatasets.length}`);
  console.log("Available:", allDatasets);

  // Get specific dataset info
  const dailyDef = DatasetRegistry.getDefinition("temporal_daily");
  console.log("Temporal Daily:", dailyDef);

  // List by type
  const timeSeries = DatasetRegistry.listByType("time_series");
  console.log("Time series datasets:", timeSeries);

  // Validate datasets
  const validation = DatasetRegistry.validateDatasets([
    "temporal_daily",
    "file_index",
    "nonexistent_dataset",
  ]);
  console.log("Validation result:", validation);
}

/**
 * Example 2: Loading a single dataset
 */
export async function exampleLoadSingleDataset() {
  console.log("=== Load Single Dataset ===");

  try {
    const data = await PluginDataLoader.loadDataset("temporal_daily");
    console.log("Loaded temporal_daily");
    console.log("Total days:", data.days?.length || 0);

    // Check cache
    const stats = PluginDataLoader.getCacheStats();
    console.log("Cache stats:", stats);
  } catch (error) {
    console.error("Failed to load dataset:", error);
  }
}

/**
 * Example 3: Loading multiple datasets with requirements
 */
export async function exampleLoadForPlugin() {
  console.log("=== Load For Plugin ===");

  const result = await PluginDataLoader.loadForPlugin([
    {
      dataset: "temporal_daily",
      required: true,
    },
    {
      dataset: "file_index",
      required: true,
      alias: "files",
    },
    {
      dataset: "author_network",
      required: false,
      transform: (raw) => {
        // Example transform: limit to top 10 authors
        return {
          ...raw,
          nodes: raw.nodes?.slice(0, 10) || [],
        };
      },
    },
  ]);

  console.log("Load result:");
  console.log("- Success:", result.success);
  console.log("- Errors:", result.errors);
  console.log("- Warnings:", result.warnings);
  console.log("- Data keys:", Object.keys(result.data));

  if (result.success) {
    console.log(
      "Temporal daily days:",
      result.data.temporal_daily?.days?.length,
    );
    console.log("Files count:", result.data.files?.files?.length);
    console.log("Author nodes:", result.data.author_network?.nodes?.length);
  }
}

/**
 * Example 4: Preloading for performance
 */
export async function examplePreloading() {
  console.log("=== Preloading Example ===");

  console.log("Initial cache:", PluginDataLoader.getCacheStats());

  // Preload common datasets
  await PluginDataLoader.preloadDatasets([
    "temporal_daily",
    "file_index",
    "directory_stats",
  ]);

  console.log("After preload:", PluginDataLoader.getCacheStats());
  console.log("Estimated cache size:", PluginDataLoader.estimateCacheSize());
}

/**
 * Example 5: Cache management
 */
export async function exampleCacheManagement() {
  console.log("=== Cache Management ===");

  // Load some datasets
  await PluginDataLoader.loadDataset("temporal_daily");
  await PluginDataLoader.loadDataset("file_index");

  console.log("Before clear:", PluginDataLoader.getCacheStats());

  // Clear specific dataset
  PluginDataLoader.clearDatasets(["temporal_daily"]);
  console.log("After partial clear:", PluginDataLoader.getCacheStats());

  // Clear all
  PluginDataLoader.clearCache();
  console.log("After full clear:", PluginDataLoader.getCacheStats());
}

/**
 * Example 6: Typical plugin usage pattern
 */
export async function exampleTypicalPluginPattern() {
  console.log("=== Typical Plugin Pattern ===");

  // This is how a plugin would typically use the data loader
  const pluginDataRequirements = [
    {
      dataset: "temporal_daily",
      required: true,
      transform: (raw: any) => {
        // Transform to plugin-specific format
        return {
          days: raw.days || [],
          schema: raw.schema_version,
        };
      },
    },
    {
      dataset: "directory_stats",
      required: true,
      alias: "directories",
    },
  ];

  const result = await PluginDataLoader.loadForPlugin(pluginDataRequirements);

  if (!result.success) {
    console.error("Plugin data loading failed:", result.errors);
    return null;
  }

  // Plugin would now use result.data for rendering
  console.log("Plugin has access to:");
  console.log("- temporal_daily (transformed)");
  console.log("- directories (aliased from directory_stats)");

  return result.data;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    exampleDatasetRegistry();
    await exampleLoadSingleDataset();
    await exampleLoadForPlugin();
    await examplePreloading();
    await exampleCacheManagement();
    await exampleTypicalPluginPattern();
  } catch (error) {
    console.error("Example execution failed:", error);
  }
}

// Uncomment to run examples during development:
// runAllExamples();
