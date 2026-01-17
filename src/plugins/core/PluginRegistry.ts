// src/plugins/core/PluginRegistry.ts

import {
  VisualizationPlugin,
  PluginDataRequirement,
  PluginDataValidation,
} from "@/types/plugin";
import { DatasetRegistry } from "@/services/data/DatasetRegistry";

/**
 * Plugin registry for managing visualization plugins
 * Enhanced with data requirement tracking and validation
 */

class PluginRegistryClass {
  private plugins = new Map<string, VisualizationPlugin>();

  register(plugin: VisualizationPlugin): void {
    if (this.plugins.has(plugin.metadata.id)) {
      console.warn(
        `Plugin ${plugin.metadata.id} is already registered. Overwriting...`,
      );
    }
    this.plugins.set(plugin.metadata.id, plugin);
    console.log(
      `Registered plugin: ${plugin.metadata.name} (${plugin.metadata.id})`,
    );

    // Log data requirements if present
    const dataReqs = plugin.metadata.dataRequirements;
    if (dataReqs && dataReqs.length > 0) {
      console.log(
        `  - Data Requirements: ${dataReqs
          .map(
            (req) =>
              `${req.dataset}${req.required ? " (required)" : " (optional)"}`,
          )
          .join(", ")}`,
      );
    }
  }

  unregister(id: string): void {
    if (!this.plugins.has(id)) {
      console.warn(`Plugin ${id} is not registered`);
      return;
    }

    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.destroy();
    }

    this.plugins.delete(id);
    console.log(`Unregistered plugin: ${id}`);
  }

  get(id: string): VisualizationPlugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): VisualizationPlugin[] {
    return Array.from(this.plugins.values()).sort(
      (a, b) => a.metadata.priority - b.metadata.priority,
    );
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }

  clear(): void {
    this.plugins.forEach((plugin) => plugin.destroy());
    this.plugins.clear();
  }

  /**
   * Get data requirements for a specific plugin
   */
  getDataRequirements(pluginId: string): PluginDataRequirement[] {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found`);
      return [];
    }
    return plugin.metadata.dataRequirements || [];
  }

  /**
   * Validate that all required datasets for a plugin are available
   */
  async validateDataAvailability(
    pluginId: string,
  ): Promise<PluginDataValidation> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      return {
        valid: false,
        missing: [],
        available: [],
        errors: [`Plugin ${pluginId} not found in registry`],
        warnings: [],
      };
    }

    const requirements = plugin.metadata.dataRequirements || [];

    // If no requirements, plugin is valid
    if (requirements.length === 0) {
      return {
        valid: true,
        missing: [],
        available: [],
        errors: [],
        warnings: ["Plugin has no data requirements declared"],
      };
    }

    // Check each dataset against the DatasetRegistry
    const missing: string[] = [];
    const available: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const req of requirements) {
      const exists = DatasetRegistry.has(req.dataset);

      if (exists) {
        available.push(req.dataset);
      } else {
        missing.push(req.dataset);

        const message = `Dataset "${req.dataset}" not found in registry`;
        if (req.required) {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }

    // Plugin is valid if all required datasets are available
    const requiredDatasets = requirements
      .filter((req) => req.required)
      .map((req) => req.dataset);

    const allRequiredAvailable = requiredDatasets.every((dataset) =>
      DatasetRegistry.has(dataset),
    );

    return {
      valid: allRequiredAvailable,
      missing,
      available,
      errors,
      warnings,
    };
  }

  /**
   * Get all plugins that require a specific dataset
   */
  getPluginsByDataset(datasetId: string): VisualizationPlugin[] {
    return Array.from(this.plugins.values()).filter((plugin) => {
      const requirements = plugin.metadata.dataRequirements || [];
      return requirements.some((req) => req.dataset === datasetId);
    });
  }

  /**
   * Get summary of all data requirements across all plugins
   */
  getDataRequirementsSummary(): {
    totalPlugins: number;
    pluginsWithRequirements: number;
    uniqueDatasets: Set<string>;
    requiredDatasets: Set<string>;
    optionalDatasets: Set<string>;
  } {
    const allPlugins = this.getAll();
    const uniqueDatasets = new Set<string>();
    const requiredDatasets = new Set<string>();
    const optionalDatasets = new Set<string>();

    let pluginsWithRequirements = 0;

    for (const plugin of allPlugins) {
      const requirements = plugin.metadata.dataRequirements || [];

      if (requirements.length > 0) {
        pluginsWithRequirements++;
      }

      for (const req of requirements) {
        uniqueDatasets.add(req.dataset);

        if (req.required) {
          requiredDatasets.add(req.dataset);
        } else {
          optionalDatasets.add(req.dataset);
        }
      }
    }

    return {
      totalPlugins: allPlugins.length,
      pluginsWithRequirements,
      uniqueDatasets,
      requiredDatasets,
      optionalDatasets,
    };
  }

  /**
   * Validate all registered plugins
   * Useful for startup diagnostics
   */
  async validateAllPlugins(): Promise<Record<string, PluginDataValidation>> {
    const results: Record<string, PluginDataValidation> = {};

    for (const [pluginId] of this.plugins) {
      results[pluginId] = await this.validateDataAvailability(pluginId);
    }

    return results;
  }
}

export const PluginRegistry = new PluginRegistryClass();
