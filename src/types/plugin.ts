// src/types/plugin.ts

import {
  RepoMetadata,
  OptimizedDirectoryNode,
  ActivityMatrixItem,
} from "./domain";
import { PluginMetadata, ExportOptions } from "./visualization";

// Re-export ExportOptions for consumers
export type { ExportOptions };

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
 * PHASE 1 ADDITION: Props passed to plugin control rendering
 * Enables plugins to own their control UI and state management
 */
export interface PluginControlProps<TState = Record<string, unknown>> {
  /** Current plugin state (managed by store) */
  state: TState;

  /** Update function for plugin state (merges updates) */
  updateState: (updates: Partial<TState>) => void;

  /** Processed data available to the plugin */
  data: any;

  /** Plugin configuration */
  config?: any;
}

/**
 * PHASE 1 ADDITION: Layout configuration for plugin controls
 * Allows plugins to specify where their controls should be positioned
 */
export interface PluginLayoutConfig {
  /** Position of plugin controls in the UI */
  controlsPosition: "header" | "sidebar" | "bottom";
}

/**
 * Main visualization plugin interface
 * Supports both legacy direct data access and new declarative data loading
 *
 * PHASE 1 EXTENSION: Added optional methods for self-contained control management
 * PHASE 2 EXTENSION: Added cleanup() and processDataCancellable() for lifecycle management
 */
export interface VisualizationPlugin<
  TConfig = any,
  TData = any,
  TState = Record<string, unknown>,
> {
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

  // PHASE 1 ADDITIONS: Optional methods for plugin control ownership

  /**
   * Render custom controls for this plugin
   * If not provided, app will render universal controls (backward compatible)
   *
   * @param props - Control rendering props including state and update callback
   * @returns React element to render in the control area
   */
  renderControls?: (props: PluginControlProps<TState>) => React.ReactNode;

  /**
   * Render custom filter panel for this plugin
   * If provided, replaces the default filter panel in the sidebar
   *
   * @param props - Control rendering props plus onClose callback
   */
  renderFilters?: (
    props: PluginControlProps<TState> & { onClose: () => void },
  ) => React.ReactNode;

  /**
   * Check if the plugin has active filters
   * Used to style the filter toggle button
   */
  checkActiveFilters?: (state: TState) => boolean;

  /**
   * Get initial state for this plugin
   * Called when plugin is first activated or when state is missing
   *
   * @returns Initial state object for the plugin
   */
  getInitialState?: () => TState;

  /**
   * Layout configuration for this plugin
   * Specifies where controls should be positioned in the UI
   * If not provided, defaults to 'header' layout
   */
  layoutConfig?: PluginLayoutConfig;

  // PHASE 2 ADDITIONS: Lifecycle management for cancellation

  /**
   * PHASE 2: Cleanup method called when plugin is being unmounted
   * Use this to abort in-flight operations, clear timers, remove event listeners
   * Optional for backward compatibility
   */
  cleanup?(): void;

  /**
   * PHASE 2: Cancellable version of processData that supports AbortSignal
   * Falls back to regular processData if not implemented
   * Optional for backward compatibility
   *
   * @param dataset - Data to process
   * @param signal - AbortSignal to check for cancellation
   * @param config - Optional configuration
   * @returns Processed data
   */
  processDataCancellable?(
    dataset: any,
    signal: AbortSignal,
    config?: TConfig,
  ): Promise<TData>;
}

/**
 * Type guard to check if the plugin supports the new control ownership pattern
 */
export function supportsControlOwnership(
  plugin: VisualizationPlugin<any, any, any>,
): plugin is VisualizationPlugin<any, any, any> &
  Required<Pick<VisualizationPlugin, "renderControls">> {
  return typeof plugin.renderControls === "function";
}

/**
 * Helper to get plugin layout configuration with sensible defaults
 */
export function getPluginLayout(
  plugin: VisualizationPlugin<any, any, any>,
): PluginLayoutConfig {
  return plugin.layoutConfig || { controlsPosition: "header" };
}
