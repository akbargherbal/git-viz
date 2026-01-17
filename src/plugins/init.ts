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
import { TreemapExplorerPlugin } from "@/plugins/treemap-explorer/TreemapExplorerPlugin";

console.log("🔌 Initializing plugins...");

// Register plugins
const timelinePlugin = new TimelineHeatmapPlugin();
const treemapExplorerPlugin = new TreemapExplorerPlugin();

PluginRegistry.register(timelinePlugin);
PluginRegistry.register(treemapExplorerPlugin);

console.log(
  "✅ Plugins registered:",
  PluginRegistry.getAll()
    .map((p) => p.metadata.name)
    .join(", "),
);

// HMR support: Clear and re-register on hot reload
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("🔄 Hot reload detected - clearing plugin registry");
    PluginRegistry.clear();

    // Re-register plugins
    const newTimelinePlugin = new TimelineHeatmapPlugin();
    const newTreemapExplorerPlugin = new TreemapExplorerPlugin();

    PluginRegistry.register(newTimelinePlugin);
    PluginRegistry.register(newTreemapExplorerPlugin);

    console.log("✅ Plugins re-registered after HMR");
  });
}

// Export for type safety if needed
export { timelinePlugin, treemapExplorerPlugin };
