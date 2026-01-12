// src/types/plugin.ts

import { RepoMetadata, OptimizedDirectoryNode, ActivityMatrixItem } from './domain';
import { PluginMetadata, ExportOptions } from './visualization';

/**
 * Plugin system types and interfaces
 */

export interface OptimizedDataset {
  metadata: RepoMetadata;
  tree: OptimizedDirectoryNode;
  activity: ActivityMatrixItem[];
}

export interface VisualizationPlugin<TConfig = any, TData = any> {
  metadata: PluginMetadata;
  
  // Configuration
  defaultConfig: TConfig;
  
  // Lifecycle methods
  init(container: HTMLElement, config: TConfig): void;
  
  // Updated to accept OptimizedDataset
  processData(dataset: OptimizedDataset, config?: TConfig): TData;
  
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

export interface PluginRegistry {
  plugins: Map<string, VisualizationPlugin>;
  register(plugin: VisualizationPlugin): void;
  unregister(id: string): void;
  get(id: string): VisualizationPlugin | undefined;
  getAll(): VisualizationPlugin[];
}