// src/plugins/core/PluginRegistry.ts

import { VisualizationPlugin } from '@/types/plugin';

/**
 * Plugin registry for managing visualization plugins
 */

class PluginRegistryClass {
  private plugins = new Map<string, VisualizationPlugin>();
  
  register(plugin: VisualizationPlugin): void {
    if (this.plugins.has(plugin.metadata.id)) {
      console.warn(`Plugin ${plugin.metadata.id} is already registered. Overwriting...`);
    }
    this.plugins.set(plugin.metadata.id, plugin);
    console.log(`Registered plugin: ${plugin.metadata.name} (${plugin.metadata.id})`);
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
    return Array.from(this.plugins.values())
      .sort((a, b) => a.metadata.priority - b.metadata.priority);
  }
  
  has(id: string): boolean {
    return this.plugins.has(id);
  }
  
  clear(): void {
    this.plugins.forEach(plugin => plugin.destroy());
    this.plugins.clear();
  }
}

export const PluginRegistry = new PluginRegistryClass();
