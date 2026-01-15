// src/App.tsx

import React, { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { PluginRegistry } from "@/plugins/core/PluginRegistry";
import { TimelineHeatmapPlugin } from "@/plugins/timeline-heatmap/TimelineHeatmapPlugin";
import { TreemapPlugin } from "@/plugins/treemap-animation/TreemapPlugin";
import { PluginDataLoader } from "@/services/data/PluginDataLoader";
import { DataProcessor } from "@/services/data/DataProcessor";
import { useAppStore } from "@/store/appStore";
import { PluginSelector } from "@/components/layout/PluginSelector";
import { FilterPanel } from "@/components/common/FilterPanel";
import { TimeBinSelector } from "@/components/common/TimeBinSelector";
import { MetricSelector } from "@/components/common/MetricSelector";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorDisplay } from "@/components/common/ErrorDisplay";
import { ScrollIndicatorOverlay } from "@/components/common/ScrollIndicatorOverlay";
import { CellDetailPanel } from "@/plugins/timeline-heatmap/components/CellDetailPanel";
import { useScrollIndicators } from "@/hooks/useScrollIndicators";
import { LoadProgress } from "@/services/data/types";
import type { VisualizationPlugin } from "@/types/plugin";

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLElement>(null);
  const [plugins, setPlugins] = useState<VisualizationPlugin[]>([]);
  const [activePlugin, setActivePluginInstance] =
    useState<VisualizationPlugin | null>(null);

  // Store raw data loaded from PluginDataLoader
  const [rawData, setRawData] = useState<Record<string, any> | null>(null);

  const [loadingProgress, setLoadingProgress] = useState<LoadProgress>({
    loaded: 0,
    total: 0,
    phase: "metadata",
  });

  const {
    data,
    setOptimizedData,
    setLoading,
    setError,
    ui,
    setActivePlugin,
    setShowFilters,
    setSelectedCell,
    filters,
  } = useAppStore();

  // Check for active filters
  const hasActiveFilters =
    filters.authors.size > 0 ||
    filters.directories.size > 0 ||
    filters.fileTypes.size > 0 ||
    filters.eventTypes.size > 0 ||
    filters.timeRange !== null;

  // Initialize scroll hooks
  const mainScroll = useScrollIndicators(containerRef, {
    containerRef: mainContainerRef,
  });

  const headerScroll = useScrollIndicators(headerScrollRef, {
    enableDrag: true,
    enableWheel: true,
    threshold: 80,
    containerRef: headerContainerRef,
  });

  // Initialize plugins
  useEffect(() => {
    const heatmapPlugin = new TimelineHeatmapPlugin();
    const treemapPlugin = new TreemapPlugin();

    PluginRegistry.register(heatmapPlugin);
    PluginRegistry.register(treemapPlugin);

    const allPlugins = PluginRegistry.getAll();
    setPlugins(allPlugins);

    if (allPlugins.length > 0) {
      setActivePlugin(allPlugins[0].metadata.id);
    }

    return () => {
      PluginRegistry.clear();
    };
  }, []);

  // Load data based on Active Plugin
  useEffect(() => {
    const loadPluginData = async () => {
      if (!ui.activePluginId) return;
      
      const plugin = PluginRegistry.get(ui.activePluginId);
      if (!plugin) return;

      setLoading(true);
      setError(null);
      setRawData(null); // Clear previous data

      try {
        setLoadingProgress({ loaded: 0, total: 1, phase: "metadata" });
        
        // 1. Get requirements
        const requirements = PluginRegistry.getDataRequirements(ui.activePluginId);
        
        // 2. Load data using the new PluginDataLoader
        const result = await PluginDataLoader.loadForPlugin(requirements);
        
        if (!result.success) {
          throw new Error(`Failed to load data: ${result.errors.join(", ")}`);
        }

        setLoadingProgress({ loaded: 1, total: 1, phase: "complete" });
        setRawData(result.data);

      } catch (err) {
        console.error("Error loading plugin data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadPluginData();
  }, [ui.activePluginId]);

  // Process Data (Apply Filters & Transform)
  useEffect(() => {
    if (!rawData) return;

    try {
      // If we have the core datasets required for the global store/heatmap, process them
      // This logic bridges the raw data to the OptimizedDataset expected by the store
      if (rawData.lifecycle && rawData.authors && rawData.files && rawData.dirs) {
        const optimized = DataProcessor.processRawData(
          rawData.lifecycle,
          rawData.authors,
          rawData.files,
          rawData.dirs,
          filters // Apply current filters
        );
        
        setOptimizedData(optimized.metadata, optimized.tree, optimized.activity);
      }
    } catch (error) {
      console.error("Error processing data:", error);
      setError(error instanceof Error ? error.message : "Failed to process data");
    }
  }, [rawData, filters]);

  // Update active plugin instance
  useEffect(() => {
    if (ui.activePluginId) {
      const plugin = PluginRegistry.get(ui.activePluginId);
      if (plugin) {
        setActivePluginInstance(plugin);
        setSelectedCell(null);
      }
    }
  }, [ui.activePluginId]);

  // Render Visualization
  useEffect(() => {
    if (
      !activePlugin ||
      !data.tree ||
      !data.activity ||
      !data.metadata ||
      !containerRef.current
    )
      return;

    try {
      const config = {
        ...activePlugin.defaultConfig,
        timeBin: filters.timeBin,
        metric: filters.metric,
        onCellClick: (cell: any) => setSelectedCell(cell),
      };

      // We pass the OptimizedDataset from the store to the plugin
      // This hits the "fallback" path in TimelineHeatmapPlugin.processData
      // which is efficient because we processed it once in the effect above.
      const processed = activePlugin.processData(
        {
          metadata: data.metadata,
          tree: data.tree,
          activity: data.activity,
        },
        config,
      );

      activePlugin.init(containerRef.current, config);
      activePlugin.render(processed, config);

      // Force check after render to ensure indicators are correct
      mainScroll.checkScrollability();
    } catch (error) {
      console.error("Error processing/rendering:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to render visualization",
      );
    }

    return () => {
      if (activePlugin) {
        activePlugin.destroy();
      }
    };
  }, [
    activePlugin,
    data.tree,
    data.activity,
    filters.timeBin,
    filters.metric,
    containerRef.current,
  ]);

  if (data.loading) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md w-full px-6">
          <LoadingSpinner message={`Loading ${loadingProgress.phase}...`} />
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div className="bg-purple-600 h-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="h-screen bg-zinc-950 text-white">
        <ErrorDisplay error={data.error} onDismiss={() => setError(null)} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header
        ref={headerContainerRef}
        className="bg-zinc-900 border-b border-zinc-800 h-14 min-h-14 max-h-14 flex-none z-50 relative select-none"
      >
        {/* Gradient fade hints */}
        {headerScroll.canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none z-10" />
        )}
        {headerScroll.canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={headerScrollRef}
          className="h-full w-full overflow-x-auto overflow-y-hidden px-4 sleek-scrollbar"
        >
          <div className="flex items-center justify-between gap-4 h-full min-w-max">
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex flex-col">
                <h1 className="text-base font-bold leading-tight">
                  Git Repository Visualization
                </h1>
                <p className="text-[10px] text-zinc-500 font-mono leading-tight">
                  {data.metadata?.repository_name || "Loading..."}
                </p>
              </div>
              <div className="h-8 w-px bg-zinc-800"></div>
              <PluginSelector plugins={plugins} />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <TimeBinSelector />
              <MetricSelector />
              <div className="h-8 w-px bg-zinc-800"></div>

              <button
                onClick={() => setShowFilters(!ui.showFilters)}
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  ui.showFilters
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                    : hasActiveFilters
                      ? "bg-zinc-800 text-purple-400 ring-1 ring-purple-500/50 hover:bg-zinc-700 hover:text-purple-300"
                      : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
                title={hasActiveFilters ? "Filters Active" : "Filters"}
              >
                <Filter size={18} />
                {hasActiveFilters && !ui.showFilters && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main
          ref={mainContainerRef}
          className="flex-1 flex flex-col overflow-hidden relative"
        >
          <ScrollIndicatorOverlay
            state={mainScroll}
            onScroll={mainScroll.scroll}
          />
          <div ref={containerRef} className="flex-1 overflow-auto"></div>
        </main>

        {/* Filter Panel - Moved to Right */}
        <aside
          className={`w-80 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-none panel-transition ${
            !ui.showFilters ? "panel-hidden" : ""
          }`}
        >
          <FilterPanel
            metadata={data.metadata}
            onClose={() => setShowFilters(false)}
          />
        </aside>

        {/* Detail Panel */}
        <aside
          className={`bg-zinc-900 border-l border-zinc-800 flex-none panel-transition relative ${
            !ui.selectedCell ? "panel-hidden" : ""
          }`}
        >
          {ui.selectedCell && (
            <CellDetailPanel
              cell={ui.selectedCell}
              onClose={() => setSelectedCell(null)}
            />
          )}
        </aside>
      </div>
    </div>
  );
};

export default App;
