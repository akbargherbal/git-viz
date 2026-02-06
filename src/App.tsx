// src/App.tsx

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Filter } from "lucide-react";
import { PluginRegistry } from "@/plugins/core/PluginRegistry";
import { PluginDataLoader } from "@/services/data/PluginDataLoader";
import { DataProcessor } from "@/services/data/DataProcessor";
import { useAppStore } from "@/store/appStore";
import { PluginSelector } from "@/components/layout/PluginSelector";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorDisplay } from "@/components/common/ErrorDisplay";
import { ScrollIndicatorOverlay } from "@/components/common/ScrollIndicatorOverlay";
import { CellDetailPanel } from "@/plugins/timeline-heatmap/components/CellDetailPanel";
import TreemapDetailPanel from "@/plugins/treemap-explorer/components/TreemapDetailPanel";
import { useScrollIndicators } from "@/hooks/useScrollIndicators";
import { LoadProgress } from "@/services/data/types";
import "@/plugins/init"; // Initialize plugins

import { supportsControlOwnership } from "@/types/plugin";
import type { VisualizationPlugin } from "@/types/plugin";

const App: React.FC = () => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousPluginRef = useRef<VisualizationPlugin | null>(null);

  // Local state - only for plugin management
  const [plugins, setPlugins] = useState<VisualizationPlugin[]>([]);
  const [activePlugin, setActivePluginInstance] =
    useState<VisualizationPlugin | null>(null);
  const [rawData, setRawData] = useState<Record<string, any> | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadProgress>({
    loaded: 0,
    total: 0,
    phase: "metadata",
  });

  // Plugin Initialization State Machine
  const [pluginInitState, setPluginInitState] = useState<{
    pluginId: string | null;
    phase: "loading" | "processing" | "ready" | "error";
    startTime: number;
  }>({
    pluginId: null,
    phase: "loading",
    startTime: Date.now(),
  });

  // ISSUE #06 FIX: Tag processed data with pluginId to prevent race conditions
  const [processedPluginData, setProcessedPluginData] = useState<{
    pluginId: string;
    data: any;
  } | null>(null);

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
  const EMPTY_STATE = {};
  const currentPluginState = useMemo(() => {
    if (!ui.activePluginId) return EMPTY_STATE;
    return pluginStates[ui.activePluginId] || EMPTY_STATE;
  }, [ui.activePluginId, pluginStates]);

  /**
   * Memoized selector for state fields that affect data processing
   */
  const processingRelevantState = useMemo(() => {
    if (!activePlugin || !activePlugin.processingStateKeys) {
      return currentPluginState;
    }

    if (activePlugin.processingStateKeys.length === 0) {
      return null;
    }

    const relevantState: Record<string, unknown> = {};
    const state = currentPluginState as Record<string, unknown>;
    activePlugin.processingStateKeys.forEach((key) => {
      relevantState[key as string] = state[key as string];
    });

    return relevantState;
  }, [activePlugin, currentPluginState]);

  // Active filter detection
  const hasActiveFilters = useMemo(() => {
    const globalActive =
      filters.authors.size > 0 ||
      filters.directories.size > 0 ||
      filters.fileTypes.size > 0 ||
      filters.eventTypes.size > 0 ||
      filters.timeRange !== null;

    if (activePlugin?.checkActiveFilters) {
      return (
        globalActive || activePlugin.checkActiveFilters(currentPluginState)
      );
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

    if (
      supportsControlOwnership(activePlugin) &&
      activePlugin.getInitialState
    ) {
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

      // Signal loading phase
      setPluginInitState({
        pluginId: ui.activePluginId,
        phase: "loading",
        startTime: Date.now(),
      });

      setLoading(true);
      setError(null);
      setRawData(null);
      setProcessedPluginData(null); // Reset processed data

      try {
        setLoadingProgress({ loaded: 0, total: 1, phase: "metadata" });

        const requirements = PluginRegistry.getDataRequirements(
          ui.activePluginId,
        );
        const result = await PluginDataLoader.loadForPlugin(requirements);

        if (!result.success) {
          throw new Error(`Failed to load data: ${result.errors.join(", ")}`);
        }

        setLoadingProgress({ loaded: 1, total: 1, phase: "complete" });
        setRawData(result.data);
        // Data loaded successfully, ready for processing
        // Don't set to 'processing' here - let next effect do it
      } catch (err) {
        console.error("Error loading plugin data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");

        // Signal error state
        setPluginInitState((prev) => ({
          ...prev,
          phase: "error",
        }));
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
      if (rawData.project_hierarchy && rawData.file_metrics_index) {
        const optimized = DataProcessor.processFrontendData(
          rawData.project_hierarchy,
          rawData.file_metrics_index,
        );
        setOptimizedData(
          optimized.metadata,
          optimized.tree,
          optimized.activity,
        );
        return;
      }

      if (
        rawData.lifecycle &&
        rawData.authors &&
        rawData.files &&
        rawData.dirs
      ) {
        const optimized = DataProcessor.processRawData(
          rawData.lifecycle,
          rawData.authors,
          rawData.files,
          rawData.dirs,
          filters,
        );

        setOptimizedData(
          optimized.metadata,
          optimized.tree,
          optimized.activity,
        );
      }
    } catch (error) {
      console.error("Error processing data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to process data",
      );
    }
  }, [rawData, filters, setOptimizedData, setError]);

  // Update active plugin instance
  useEffect(() => {
    if (ui.activePluginId) {
      const plugin = PluginRegistry.get(ui.activePluginId);
      if (plugin) {
        setProcessedPluginData(null); // Clear stale data immediately
        setActivePluginInstance(plugin);
        setSelectedCell(null);
      }
    }
  }, [ui.activePluginId, setSelectedCell]);

  const pluginDataInput = useMemo(() => {
    if (!activePlugin || !rawData) return null;

    if (activePlugin.metadata.id === "treemap-explorer") {
      if (rawData.project_hierarchy && rawData.file_metrics_index)
        return rawData;
      if (!rawData.file_index) return null;
      return rawData;
    }

    if (!data.tree || !data.activity || !data.metadata) return null;

    return rawData && Object.keys(rawData).length > 0
      ? rawData
      : {
          metadata: data.metadata,
          tree: data.tree,
          activity: data.activity,
        };
  }, [
    activePlugin?.metadata.id,
    rawData,
    data.tree,
    data.activity,
    data.metadata,
  ]);

  // Effect 1: Process Data (Expensive, Cancellable)
  useEffect(() => {
    if (
      previousPluginRef.current &&
      previousPluginRef.current !== activePlugin
    ) {
      previousPluginRef.current.cleanup?.();
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!activePlugin || !pluginDataInput) return;

    // Signal processing phase start
    setPluginInitState((prev) => ({
      pluginId: activePlugin.metadata.id,
      phase: "processing",
      startTime:
        prev.pluginId === activePlugin.metadata.id
          ? prev.startTime
          : Date.now(),
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let isMounted = true;

    const processData = async () => {
      try {
        const config = {
          ...activePlugin.defaultConfig,
          ...currentPluginState,
        };

        let processed;
        if (activePlugin.processDataCancellable) {
          processed = await activePlugin.processDataCancellable(
            pluginDataInput,
            controller.signal,
            config,
          );
        } else {
          processed = activePlugin.processData(pluginDataInput, config);
        }

        if (!controller.signal.aborted && isMounted) {
          // ISSUE #06 FIX: Tag the data with the plugin ID
          setProcessedPluginData({
            pluginId: activePlugin.metadata.id,
            data: processed,
          });

          // Signal ready phase - data is processed and ready to render
          setPluginInitState({
            pluginId: activePlugin.metadata.id,
            phase: "ready",
            startTime: Date.now(),
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("[App] Processing aborted (expected)");
        } else if (isMounted && !controller.signal.aborted) {
          console.error("Error processing data:", error);
          setError(
            error instanceof Error ? error.message : "Failed to process data",
          );

          // Signal error state
          setPluginInitState((prev) => ({
            ...prev,
            phase: "error",
          }));
        }
      }
    };

    processData();
    previousPluginRef.current = activePlugin;

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activePlugin, pluginDataInput, processingRelevantState, setError]);

  // Effect 2: Render Visualization (Fast, Sync)
  useEffect(() => {
    if (!activePlugin || !containerRef.current || !processedPluginData) return;

    // Wait for 'ready' phase before rendering
    if (
      pluginInitState.phase !== "ready" ||
      pluginInitState.pluginId !== activePlugin.metadata.id
    ) {
      console.log("[App] Waiting for plugin to be ready", {
        currentPhase: pluginInitState.phase,
        pluginMatch: pluginInitState.pluginId === activePlugin.metadata.id,
      });
      return;
    }

    // ISSUE #06 FIX: Ensure data belongs to the active plugin before rendering
    if (processedPluginData.pluginId !== activePlugin.metadata.id) {
      console.warn(
        "[App] Data mismatch - this shouldn't happen with new state machine",
      );
      return;
    }

    try {
      const config = {
        ...activePlugin.defaultConfig,
        timeBin: filters.timeBin,
        metric: filters.metric,
        ...currentPluginState,
        onCellClick: (cell: any) => {
          setSelectedCell(cell);
        },
      };

      console.log(
        `[App] Rendering ${activePlugin.metadata.id} in phase: ${pluginInitState.phase}`,
      );
      activePlugin.init(containerRef.current, config);
      activePlugin.render(processedPluginData.data, config);
      mainScroll.checkScrollability();
    } catch (error) {
      console.error("Error rendering visualization:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to render visualization",
      );
    }
  }, [
    activePlugin,
    processedPluginData,
    pluginInitState,
    currentPluginState,
    filters.timeBin,
    filters.metric,
    setSelectedCell,
    setError,
  ]);

  const usesPluginControls = useMemo(() => {
    return activePlugin && supportsControlOwnership(activePlugin);
  }, [activePlugin]);

  const updatePluginState = (updates: Record<string, unknown>) => {
    if (ui.activePluginId) {
      setPluginState(ui.activePluginId, updates);
    }
  };

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

  const renderDetailPanel = () => {
    if (!ui.selectedCell) return null;

    if (activePlugin?.metadata.id === "treemap-explorer") {
      const lensMode = (currentPluginState as any).lensMode || "debt";
      const couplingThreshold =
        (currentPluginState as any).couplingThreshold || 0.3;

      const treemapPlugin = activePlugin as any;
      const couplingIndex = treemapPlugin.getCouplingIndex
        ? treemapPlugin.getCouplingIndex()
        : new Map();

      return (
        <TreemapDetailPanel
          file={ui.selectedCell}
          lensMode={lensMode}
          couplingIndex={couplingIndex}
          couplingThreshold={couplingThreshold}
          onClose={() => setSelectedCell(null)}
        />
      );
    } else if (activePlugin?.metadata.id === "timeline-heatmap") {
      return (
        <CellDetailPanel
          cell={ui.selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      );
    }

    return null;
  };

  if (data.loading) {
    return (
      <div
        data-testid="loading-container"
        className="h-screen bg-zinc-950 text-white flex items-center justify-center"
      >
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
      <div
        data-testid="error-container"
        className="h-screen bg-zinc-950 text-white"
      >
        <ErrorDisplay error={data.error} onDismiss={() => setError(null)} />
      </div>
    );
  }

  // Determine if data is ready and matches the active plugin
  const isDataReady =
    processedPluginData?.pluginId === activePlugin?.metadata.id;

  return (
    <div
      className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden"
      data-testid="app-container"
      data-active-plugin={ui.activePluginId || "none"}
      data-plugin-data-ready={isDataReady}
      data-plugin-init-phase={pluginInitState.phase}
      data-plugin-init-id={pluginInitState.pluginId}
    >
      <header
        ref={headerContainerRef}
        data-testid="app-header"
        data-active-plugin={ui.activePluginId || "none"}
        data-uses-plugin-controls={usesPluginControls}
        className="bg-zinc-900 border-b border-zinc-800 h-14 min-h-14 max-h-14 flex-none z-50 relative select-none"
      >
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
              {usesPluginControls && (
                <div className="flex items-center gap-2">
                  {renderPluginControls()}
                </div>
              )}

              <div className="h-8 w-px bg-zinc-800"></div>

              <button
                onClick={() => setShowFilters(!ui.showFilters)}
                data-testid="filters-toggle"
                data-active={ui.showFilters}
                data-has-active-filters={hasActiveFilters}
                data-filter-count={
                  filters.authors.size +
                  filters.fileTypes.size +
                  filters.directories.size +
                  filters.eventTypes.size
                }
                data-disabled={false}
                title={hasActiveFilters ? "Filters Active" : "Filters"}
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  ui.showFilters
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                    : hasActiveFilters
                      ? "bg-zinc-800 text-purple-400 ring-1 ring-purple-500/50 hover:bg-zinc-700 hover:text-purple-300"
                      : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
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
        <main
          ref={mainContainerRef}
          data-testid="visualization-container"
          data-active-plugin={ui.activePluginId || "none"}
          data-rendering={isDataReady}
          className="flex-1 flex flex-col overflow-hidden relative"
        >
          <ScrollIndicatorOverlay
            state={mainScroll}
            onScroll={mainScroll.scroll}
          />
          <div ref={containerRef} className="flex-1 overflow-auto"></div>
        </main>

        <aside
          data-testid="filter-panel-container"
          data-visible={ui.showFilters}
          data-plugin-owned={!!activePlugin?.renderFilters}
          data-active-plugin={ui.activePluginId || "none"}
          className={`w-80 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-none panel-transition ${
            !ui.showFilters ? "panel-hidden" : ""
          }`}
        >
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
              onClose: () => setShowFilters(false),
            })
          ) : (
            <div className="p-6 text-zinc-500 text-center">
              <p className="text-sm">No filters available for this plugin.</p>
            </div>
          )}
        </aside>

        <aside
          data-testid="detail-panel-container"
          data-visible={!!ui.selectedCell}
          data-active-plugin={ui.activePluginId || "none"}
          data-cell-type={ui.selectedCell ? "present" : "none"}
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