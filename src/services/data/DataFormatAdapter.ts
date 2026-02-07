/**
 * DataFormatAdapter.ts
 *
 * Centralized adapter for normalizing data formats between different versions
 * and ensuring plugins receive data in their expected format.
 *
 * Session 5: Data Format Adapter
 * Addresses: Bug #3 - Cascade failure on missing temporal_daily
 */

/**
 * Format version identifiers
 */
export enum DataFormat {
  V2_1_FRONTEND = "v2.1_frontend",
  V2_0_LEGACY = "v2.0_legacy",
}

/**
 * Result of format adaptation with metadata
 */
export interface AdaptedDataset {
  data: Record<string, any>;
  format: DataFormat;
  adaptations: string[]; // List of transformations applied
  warnings: string[]; // Non-fatal issues encountered
}

/**
 * Adapter for normalizing data formats
 */
export class DataFormatAdapter {
  /**
   * Adapt a raw dataset to the target format
   */
  static adapt(
    rawDataset: Record<string, any>,
    targetFormat: DataFormat,
  ): AdaptedDataset {
    const adaptations: string[] = [];
    const warnings: string[] = [];
    const data: Record<string, any> = { ...rawDataset };

    // Detect source format
    const sourceFormat = this.detectFormat(rawDataset);
    console.log(
      `[DataFormatAdapter] Adapting from ${sourceFormat} to ${targetFormat}`,
    );

    // Apply transformations based on source and target
    if (targetFormat === DataFormat.V2_1_FRONTEND) {
      this.ensureV2_1Format(data, adaptations, warnings);
    }

    return {
      data,
      format: targetFormat,
      adaptations,
      warnings,
    };
  }

  /**
   * Detect the format of a raw dataset
   */
  private static detectFormat(dataset: Record<string, any>): DataFormat {
    // V2.1 has project_hierarchy and file_metrics_index
    if (dataset.project_hierarchy && dataset.file_metrics_index) {
      return DataFormat.V2_1_FRONTEND;
    }

    // V2.0 has different structure
    return DataFormat.V2_0_LEGACY;
  }

  /**
   * Ensure dataset conforms to V2.1 frontend format
   */
  private static ensureV2_1Format(
    data: Record<string, any>,
    adaptations: string[],
    warnings: string[],
  ): void {
    // Required datasets for V2.1
    const requiredDatasets = [
      "project_hierarchy",
      "file_metrics_index",
      "file_index",
    ];

    // Check for missing required datasets
    for (const dataset of requiredDatasets) {
      if (!data[dataset]) {
        warnings.push(`Missing required dataset: ${dataset}`);
      }
    }

    // Ensure temporal_daily exists (even if empty)
    if (!data.temporal_daily) {
      console.warn(
        "[DataFormatAdapter] temporal_daily missing - creating empty structure",
      );
      data.temporal_daily = {
        days: [],
        date_range: {
          min: null,
          max: null,
        },
      };
      adaptations.push("created_empty_temporal_daily");
      warnings.push(
        "temporal_daily dataset missing - time lens features will be limited",
      );
    }

    // Normalize temporal_daily.days to array format
    if (data.temporal_daily && typeof data.temporal_daily.days === "object") {
      if (!Array.isArray(data.temporal_daily.days)) {
        console.log(
          "[DataFormatAdapter] Converting temporal_daily.days from object to array",
        );
        data.temporal_daily.days = Object.values(data.temporal_daily.days);
        adaptations.push("normalized_temporal_daily_to_array");
      }
    }

    // Ensure file_lifecycle exists (even if empty)
    if (!data.file_lifecycle) {
      console.warn(
        "[DataFormatAdapter] file_lifecycle missing - creating empty structure",
      );
      data.file_lifecycle = {
        files: {},
      };
      adaptations.push("created_empty_file_lifecycle");
      warnings.push(
        "file_lifecycle dataset missing - timeline features will be limited",
      );
    }

    // Ensure cochange_network exists (optional but helpful)
    if (!data.cochange_network) {
      data.cochange_network = {
        nodes: [],
        links: [],
      };
      adaptations.push("created_empty_cochange_network");
    }
  }

  /**
   * Validate that a dataset meets plugin requirements
   */
  static validateForPlugin(
    dataset: Record<string, any>,
    pluginId: string,
    requirements: Array<{ dataset: string; required: boolean }>,
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const req of requirements) {
      const exists = !!dataset[req.dataset];

      if (!exists) {
        if (req.required) {
          errors.push(`[${pluginId}] Missing required dataset: ${req.dataset}`);
        } else {
          warnings.push(
            `[${pluginId}] Missing optional dataset: ${req.dataset} - some features may be unavailable`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create a safe, empty dataset structure for a given format
   */
  static createEmptyDataset(format: DataFormat): Record<string, any> {
    if (format === DataFormat.V2_1_FRONTEND) {
      return {
        project_hierarchy: {
          name: "root",
          path: "/",
          type: "directory" as const,
          children: [],
        },
        file_metrics_index: {},
        file_index: [],
        temporal_daily: {
          days: [],
          date_range: { min: null, max: null },
        },
        file_lifecycle: {
          files: {},
        },
        cochange_network: {
          nodes: [],
          links: [],
        },
      };
    }

    return {};
  }

  /**
   * Log adaptation results
   */
  static logAdaptation(result: AdaptedDataset): void {
    if (result.adaptations.length > 0) {
      console.log(
        `[DataFormatAdapter] Applied ${result.adaptations.length} adaptations:`,
        result.adaptations,
      );
    }

    if (result.warnings.length > 0) {
      console.warn(
        `[DataFormatAdapter] ${result.warnings.length} warnings:`,
        result.warnings,
      );
    }
  }
}
