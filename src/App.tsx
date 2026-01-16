// src/App.tsx
// Phase 3: Cleaned up - Plugin controls ownership, no universal control state
// Updated to support TreemapExplorer detail panel

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Filter } from "lucide-react";
import { PluginRegistry } from "@/plugins/core/PluginRegistry";
import { PluginDataLoader } from "@/services/data/PluginDataLoader";
import { DataProcessor } from "@/services/data/DataProcessor";
import { useAppStore } from "@/store/appStore";
import { PluginSelector } from "@/components/layout/PluginSelector";
import { FilterPanel } from "@/components/common/FilterPanel";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorDisplay } from "@/components/common/ErrorDisplay";
import { ScrollIndicatorOverlay } from "@/components/common/ScrollIndicatorOverlay";
import { CellDetailPanel } from "@/plugins/timeline-heatmap/components/CellDetailPanel";
import { TreemapDetailPanel } from "@/plugins/treemap-explorer/components/TreemapDetailPanel";
import { useScrollIndicators } from "@/hooks/useScrollIndicators";
import { LoadProgress } from "@/services/data/types";
import type { VisualizationPlugin } from "@/types/plugin";
import { supportsControlOwnership } from "@/types/plugin";
import "@/plugins/init"; // Initialize plugins

const App: React.FC = () => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLElement>(null);

  // Local state - only for plugin management
  const [plugins, setPlugins] = useState<VisualizationPlugin[]>([]);
  const [activePlugin, setActivePluginInstance] = useState<VisualizationPlugin | null>(null);
  const [rawData, setRawData] = useState<Record<string, any> | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadProgress>({
    loaded: 0,
    total: 0,
    phase: "metadata",
  });

  // Zustand store - handles data, filters, UI, and plugin states
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
    pluginStates,
    setPluginState,
    initPluginState,
  } = useAppStore();

  // Get current plugin state
  const currentPluginState = useMemo(() => {
    if (!ui.activePluginId) return {};
    return pluginStates[ui.activePluginId] || {};
  }, [ui.activePluginId, pluginStates]);

  // Active filter detection
  const hasActiveFilters = useMemo(() => {
    // Check global filters
    const globalActive = 
      filters.authors.size > 0 ||
      filters.directories.size > 0 ||
      filters.fileTypes.size > 0 ||
      filters.eventTypes.size > 0 ||
      filters.timeRange !== null;

    // Check plugin-specific filters if supported
    if (activePlugin?.checkActiveFilters) {
      return globalActive || activePlugin.checkActiveFilters(currentPluginState);
    }

    return globalActive;
  }, [filters, activePlugin, currentPluginState]);

  // Scroll indicators
  const mainScroll = useScrollIndicators(containerRef, {
    containerRef: mainContainerRef,
  });

  const headerScroll = useScrollIndicators(headerScrollRef, {
    enableDrag: true,
    enableWheel: true,
    threshold: 80,
    containerRef: headerContainerRef,
  });

  // Initialize plugins (once)
  useEffect(() => {
    const allPlugins = PluginRegistry.getAll();
    setPlugins(allPlugins);

    if (allPlugins.length > 0) {
      setActivePlugin(allPlugins[0].metadata.id);
    }
  }, [setActivePlugin]);

  // Initialize plugin state when plugin changes
  useEffect(() => {
    if (!ui.activePluginId || !activePlugin) return;

    if (supportsControlOwnership(activePlugin) && activePlugin.getInitialState) {
      const initialState = activePlugin.getInitialState();
      initPluginState(ui.activePluginId, initialState);
    }
  }, [ui.activePluginId, activePlugin, initPluginState]);

  // Load data for active plugin
  useEffect(() => {
    const loadPluginData = async () => {
      if (!ui.activePluginId) return;

      const plugin = PluginRegistry.get(ui.activePluginId);
      if (!plugin) return;

      setLoading(true);
      setError(null);
      setRawData(null);

      try {
        setLoadingProgress({ loaded: 0, total: 1, phase: "metadata" });

        const requirements = PluginRegistry.getDataRequirements(ui.activePluginId);
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
  }, [ui.activePluginId, setLoading, setError]);

  // Process data with filters (Global fallback)
  useEffect(() => {
    if (!rawData) return;

    try {
      if (rawData.lifecycle && rawData.authors && rawData.files && rawData.dirs) {
        const optimized = DataProcessor.processRawData(
          rawData.lifecycle,
          rawData.authors,
          rawData.files,
          rawData.dirs,
          filters
        );

        setOptimizedData(optimized.metadata, optimized.tree, optimized.activity);
      }
    } catch (error) {
      console.error("Error processing data:", error);
      setError(error instanceof Error ? error.message : "Failed to process data");
    }
  }, [rawData, filters, setOptimizedData, setError]);

  // Update active plugin instance
  useEffect(() => {
    if (ui.activePluginId) {
      const plugin = PluginRegistry.get(ui.activePluginId);
      if (plugin) {
        setActivePluginInstance(plugin);
        setSelectedCell(null);
      }
    }
  }, [ui.activePluginId, setSelectedCell]);

  // Render visualization
  useEffect(() => {
    if (
      !activePlugin ||
      !containerRef.current
    ) return;

    // For TreemapExplorer, we need file_index data
    if (activePlugin.metadata.id === 'treemap-explorer') {
      if (!rawData?.file_index) return;
    } else {
      // For other plugins, check traditional data
      if (!data.tree || !data.activity || !data.metadata) return;
    }

    try {
      // ARCHITECTURE FIX:
      // 1. Spread currentPluginState into config to override defaults with plugin-controlled values
      // 2. Pass rawData (if available) to allow plugin to perform its own filtering
      const config = {
        ...activePlugin.defaultConfig,
        // Legacy fallback
        timeBin: filters.timeBin,
        metric: filters.metric,
        // Plugin state overrides
        ...currentPluginState,
        onCellClick: (cell: any) => setSelectedCell(cell),
      };

      // Prefer rawData so plugin can filter from scratch, fallback to globally processed data
      const dataInput = rawData && Object.keys(rawData).length > 0
        ? rawData
        : {
            metadata: data.metadata,
            tree: data.tree,
            activity: data.activity,
          };

      const processed = activePlugin.processData(dataInput, config);

      activePlugin.init(containerRef.current, config);
      activePlugin.render(processed, config);

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
    data.metadata,
    rawData,
    currentPluginState,
    filters.timeBin,
    filters.metric,
    setSelectedCell,
    setError,
    mainScroll,
  ]);

  // Check if plugin uses new control pattern
  const usesPluginControls = useMemo(() => {
    return activePlugin && supportsControlOwnership(activePlugin);
  }, [activePlugin]);

  // Plugin state update callback
  const updatePluginState = (updates: Record<string, unknown>) => {
    if (ui.activePluginId) {
      setPluginState(ui.activePluginId, updates);
    }
  };

  // Render plugin-owned controls
  const renderPluginControls = () => {
    if (!activePlugin || !usesPluginControls) return null;

    return activePlugin.renderControls?.({
      state: currentPluginState,
      updateState: updatePluginState,
      data: {
        metadata: data.metadata,
        tree: data.tree,
        activity: data.activity,
      },
      config: activePlugin.defaultConfig,
    });
  };

  // Render appropriate detail panel based on active plugin
  const renderDetailPanel = () => {
    if (!ui.selectedCell) return null;

    if (activePlugin?.metadata.id === 'treemap-explorer') {
      const lensMode = (currentPluginState as any).lensMode || 'debt';
      return (
        <TreemapDetailPanel
          file={ui.selectedCell}
          lensMode={lensMode}
          onClose={() => setSelectedCell(null)}
        />
      );
    } else if (activePlugin?.metadata.id === 'timeline-heatmap') {
      return (
        <CellDetailPanel
          cell={ui.selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      );
    }

    return null;
  };

  // Loading state
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

  // Error state
  if (data.error) {
    return (
      <div className="h-screen bg-zinc-950 text-white">
        <ErrorDisplay error={data.error} onDismiss={() => setError(null)} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Header - Universal controls only */}
      <header
        ref={headerContainerRef}
        className="bg-zinc-900 border-b border-zinc-800 h-14 min-h-14 max-h-14 flex-none z-50 relative select-none"
      >
        {/* Scroll fade hints */}
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
            {/* Left: App title and plugin selector */}
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

            {/* Right: Plugin-owned controls + filter button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Phase 3: Plugin controls only (no fallback to universal controls) */}
              {usesPluginControls && (
                <div className="flex items-center gap-2">
                  {renderPluginControls()}
                </div>
              )}

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

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Visualization area */}
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

        {/* Filter Panel */}
        <aside
          className={`w-80 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-none panel-transition ${
            !ui.showFilters ? "panel-hidden" : ""
          }`}
        >
          {/* Render plugin-specific filters if available, otherwise fallback to global */}
          {activePlugin?.renderFilters ? (
            activePlugin.renderFilters({
              state: currentPluginState,
              updateState: updatePluginState,
              data: {
                metadata: data.metadata,
                tree: data.tree,
                activity: data.activity,
              },
              config: activePlugin.defaultConfig,
              onClose: () => setShowFilters(false)
            })
          ) : (
            <FilterPanel
              metadata={data.metadata}
              onClose={() => setShowFilters(false)}
            />
          )}
        </aside>

        {/* Detail Panel */}
        <aside
          className={`bg-zinc-900 border-l border-zinc-800 flex-none panel-transition relative ${
            !ui.selectedCell ? "panel-hidden" : ""
          }`}
        >
          {renderDetailPanel()}
        </aside>
      </div>
    </div>
  );
};

export default App;