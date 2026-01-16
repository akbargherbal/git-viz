// src/plugins/init.ts
/// <reference types="vite/client" />

/**
 * Plugin Initialization Module
 * 
 * CRITICAL: This file registers plugins ONCE at application startup,
 * outside of React component lifecycle to avoid re-registration issues.
 * 
 * Changes from embedded registration:
 * - Plugins registered at module initialization (not in useEffect)
 * - No React StrictMode double-registration
 * - Hot Module Replacement (HMR) compatible
 * - Clear console logging for debugging
 */

import { PluginRegistry } from "@/plugins/core/PluginRegistry";
import { TimelineHeatmapPlugin } from "@/plugins/timeline-heatmap/TimelineHeatmapPlugin";
import { TreemapPlugin } from "@/plugins/treemap-animation/TreemapPlugin";

console.log("🔌 Initializing plugins...");

// Register plugins
const timelinePlugin = new TimelineHeatmapPlugin();
const treemapPlugin = new TreemapPlugin();

PluginRegistry.register(timelinePlugin);
PluginRegistry.register(treemapPlugin);

console.log("✅ Plugins registered:", PluginRegistry.getAll().map(p => p.metadata.name).join(", "));

// HMR support: Clear and re-register on hot reload
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("🔄 Hot reload detected - clearing plugin registry");
    PluginRegistry.clear();
    
    // Re-register plugins
    const newTimelinePlugin = new TimelineHeatmapPlugin();
    const newTreemapPlugin = new TreemapPlugin();
    
    PluginRegistry.register(newTimelinePlugin);
    PluginRegistry.register(newTreemapPlugin);
    
    console.log("✅ Plugins re-registered after HMR");
  });
}

// Export for type safety if needed
export { timelinePlugin, treemapPlugin };