// src/types/plugin.ts

import {
  RepoMetadata,
  OptimizedDirectoryNode,
  ActivityMatrixItem,
} from "./domain";
import { PluginMetadata, ExportOptions } from "./visualization";

/**
 * Plugin system types and interfaces
 */

export interface OptimizedDataset {
  metadata: RepoMetadata;
  tree: OptimizedDirectoryNode;
  activity: ActivityMatrixItem[];
}

/**
 * Plugin data requirement specification
 * Declares which datasets a plugin needs and how to process them
 */
export interface PluginDataRequirement {
  /** Dataset ID from DatasetRegistry */
  dataset: string;
  
  /** Whether this dataset is required for plugin to function */
  required: boolean;
  
  /** Optional transform function to process raw dataset */
  transform?: (raw: any) => any;
  
  /** Optional alias for the dataset in the plugin data object */
  alias?: string;
}

/**
 * Result of plugin data validation
 */
export interface PluginDataValidation {
  valid: boolean;
  missing: string[];
  available: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Enhanced plugin metadata with data requirements
 */
export interface EnhancedPluginMetadata extends PluginMetadata {
  /** Declarative data requirements for this plugin */
  dataRequirements?: PluginDataRequirement[];
}

/**
 * Props passed to plugin components
 */
export interface PluginProps<TConfig = any, TData = any> {
  /** Plugin configuration */
  config: TConfig;
  
  /** Processed data for the plugin */
  data?: TData;
  
  /** Callback when configuration changes */
  onConfigChange?: (config: TConfig) => void;
  
  /** Container element reference */
  containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Main visualization plugin interface
 * Supports both legacy direct data access and new declarative data loading
 */
export interface VisualizationPlugin<TConfig = any, TData = any> {
  metadata: EnhancedPluginMetadata;

  // Configuration
  defaultConfig: TConfig;

  // Lifecycle methods
  init(container: HTMLElement, config: TConfig): void;

  // Data processing - accepts any input (usually OptimizedDataset or Record<string, any>)
  processData(dataset: any, config?: TConfig): TData;

  render(data: TData, config: TConfig): void;
  update(data: TData, config: TConfig): void;
  destroy(): void;

  // Export
  exportImage(options: ExportOptions): Promise<Blob>;
  exportData(options: ExportOptions): any;

  // Configuration panel (React component)
  ConfigPanel?: React.ComponentType<{
    config: TConfig;
    onChange: (config: TConfig) => void;
  }>;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  plugins: Map<string, VisualizationPlugin>;
  register(plugin: VisualizationPlugin): void;
  unregister(id: string): void;
  get(id: string): VisualizationPlugin | undefined;
  getAll(): VisualizationPlugin[];
}
