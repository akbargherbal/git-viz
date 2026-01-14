// src/App.tsx

import React, { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { PluginRegistry } from "@/plugins/core/PluginRegistry";
import { TimelineHeatmapPlugin } from "@/plugins/timeline-heatmap/TimelineHeatmapPlugin";
import { TreemapPlugin } from "@/plugins/treemap-animation/TreemapPlugin";
import { DataLoader } from "@/services/data/DataLoader";
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
import { LoadProgress } from "@/services/data/DataLoader";
import type { VisualizationPlugin } from "@/types/plugin";

const dataLoader = DataLoader.getInstance();

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLElement>(null);
  const [plugins, setPlugins] = useState<VisualizationPlugin[]>([]);
  const [activePlugin, setActivePluginInstance] =
    useState<VisualizationPlugin | null>(null);

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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dataset = await dataLoader.loadOptimizedDataset(
          "/DATASETS_excalidraw",
          (progress) => setLoadingProgress(progress)
        );
        setOptimizedData(dataset.metadata, dataset.tree, dataset.activity);
      } catch (error) {
        console.error("Error loading data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load data"
        );
      }
    };
    loadData();
  }, []);

  // Apply Filters
  useEffect(() => {
    if (!data.metadata) return; // Don't run if data isn't loaded

    try {
      // Reprocess dataset with current filters
      const filteredDataset = dataLoader.filterDataset(filters);
      setOptimizedData(
        filteredDataset.metadata,
        filteredDataset.tree,
        filteredDataset.activity
      );
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  }, [
    filters.authors,
    filters.fileTypes,
    filters.directories,
    filters.eventTypes,
    filters.timeRange,
  ]);

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

  // Process and Render
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

      const processed = activePlugin.processData(
        {
          metadata: data.metadata,
          tree: data.tree,
          activity: data.activity,
        },
        config
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
          : "Failed to render visualization"
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
                className={`p-2 rounded-lg transition-colors ${
                  ui.showFilters
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside
          className={`w-80 bg-zinc-900 border-r border-zinc-800 overflow-y-auto flex-none panel-transition ${
            !ui.showFilters ? "panel-hidden" : ""
          }`}
        >
          <FilterPanel
            metadata={data.metadata}
            onClose={() => setShowFilters(false)}
          />
        </aside>

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

        <aside
          className={`w-96 bg-zinc-900 border-l border-zinc-800 flex-none panel-transition relative ${
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