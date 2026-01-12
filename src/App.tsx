// src/App.tsx

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PluginRegistry } from '@/plugins/core/PluginRegistry';
import { VisualizationPlugin } from '@/types/plugin';
import { dataLoader } from '@/services/data/DataLoader';
import { dataProcessor } from '@/services/processing/DataProcessor';
import { useAppStore } from '@/store/appStore';
import { TimelineHeatmapPlugin } from '@/plugins/timeline-heatmap/TimelineHeatmapPlugin';
import { TreemapPlugin } from '@/plugins/treemap-animation/TreemapPlugin';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import PluginSelector from '@/components/layout/PluginSelector';
import TimelineControls from '@/components/common/TimelineControls';
import FilterPanel from '@/components/common/FilterPanel';
import MetricSelector from '@/components/common/MetricSelector';
import TimeBinSelector from '@/components/common/TimeBinSelector';
import CellDetailPanel from '@/plugins/timeline-heatmap/components/CellDetailPanel';
import { Download, Filter } from 'lucide-react';
import type { LoadProgress } from '@/services/data/DataLoader';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [plugins, setPlugins] = useState<VisualizationPlugin[]>([]);
  const [activePlugin, setActivePluginInstance] = useState<VisualizationPlugin | null>(null);
  
  // NEW: Progress state
  const [loadingProgress, setLoadingProgress] = useState<LoadProgress>({
    loaded: 0,
    total: 0,
    phase: 'events',
  });
  
  const { 
    data, setData, setLoading, setError, 
    ui, setActivePlugin, setShowFilters, setSelectedCell,
    filters,
    timeline
  } = useAppStore();
  
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
  
  // Load data with progress tracking
  useEffect(() => {
    const loadData = async () => {
      const startTime = performance.now();
      
      try {
        setLoading(true);
        setLoadingProgress({ loaded: 0, total: 0, phase: 'events' });
        
        const eventsUrl = './DATASETS_excalidraw/file_lifecycle_events.csv';
        const summaryUrl = './DATASETS_excalidraw/file_lifecycle_summary.csv';
        
        // Load with progress updates
        const dataset = await dataLoader.loadDatasetWithProgress(
          eventsUrl,
          summaryUrl,
          (progress) => {
            setLoadingProgress(progress);
          }
        );
        
        const loadTime = performance.now() - startTime;
        console.log(`🎉 Complete data pipeline finished in ${(loadTime / 1000).toFixed(2)}s`);
        
        setData(dataset.events, dataset.summary);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      }
    };
    
    loadData();
  }, []);
  
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

  // Filter Data
  const filteredEvents = useMemo(() => {
    if (data.events.length === 0) return [];

    let result = data.events;

    // Apply filters
    if (filters.authors.size > 0) {
      result = dataProcessor.filterEventsByAuthors(result, filters.authors);
    }

    if (filters.directories.size > 0) {
      result = result.filter(e => {
        const dir = e.file_path.split('/')[0];
        return filters.directories.has(dir);
      });
    }

    if (filters.fileTypes.size > 0) {
      result = result.filter(e => {
        const ext = e.file_path.split('.').pop() || 'unknown';
        return filters.fileTypes.has(ext);
      });
    }

    if (filters.eventTypes.size > 0) {
      result = result.filter(e => filters.eventTypes.has(e.status));
    }

    return result;
  }, [data.events, filters.authors, filters.directories, filters.fileTypes, filters.eventTypes]);

  // Get Date Range
  const dateRange = useMemo(() => {
    if (data.events.length === 0) return { min: new Date(), max: new Date() };
    
    // Optimized min/max calculation to avoid spread operator on large arrays
    let min = data.events[0].commit_datetime.getTime();
    let max = min;
    
    for (let i = 1; i < data.events.length; i++) {
      const time = data.events[i].commit_datetime.getTime();
      if (time < min) min = time;
      if (time > max) max = time;
    }
    
    return {
      min: new Date(min),
      max: new Date(max)
    };
  }, [data.events]);
  
  // Process and Render
  useEffect(() => {
    if (!activePlugin || filteredEvents.length === 0 || !containerRef.current) return;
    
    try {
      // Merge default config with store state
      const config = {
        ...activePlugin.defaultConfig,
        timeBin: filters.timeBin,
        metric: filters.metric,
        onCellClick: (cell: any) => setSelectedCell(cell)
      };

      const processed = activePlugin.processData({
        events: filteredEvents,
        summary: data.summary,
      });
      
      activePlugin.init(containerRef.current, config);
      activePlugin.render(processed, config);
      
    } catch (error) {
      console.error('Error processing/rendering:', error);
      setError(error instanceof Error ? error.message : 'Failed to render visualization');
    }
    
    return () => {
      if (activePlugin) {
        activePlugin.destroy();
      }
    };
  }, [activePlugin, filteredEvents, filters.timeBin, filters.metric, containerRef.current]);
  
  // Update time indicator when timeline.currentTime changes
  useEffect(() => {
    if (!activePlugin) return;
    
    if (activePlugin.metadata.id === 'timeline-heatmap' && 
        typeof (activePlugin as any).updateCurrentTimeIndicator === 'function') {
      (activePlugin as any).updateCurrentTimeIndicator(timeline.currentTime);
    }
  }, [timeline.currentTime, activePlugin]);
  
  const handleExport = async () => {
    if (!activePlugin) return;
    try {
      const blob = await activePlugin.exportImage({ format: 'svg' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activePlugin.metadata.id}-${new Date().toISOString()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. See console for details.');
    }
  };
  
  // Enhanced loading screen with progress
  if (data.loading) {
    const percent = loadingProgress.total > 0 
      ? Math.floor((loadingProgress.loaded / loadingProgress.total) * 100)
      : 0;
    
    const phaseLabel = loadingProgress.phase === 'events' 
      ? 'Loading events...'
      : loadingProgress.phase === 'summary'
      ? 'Loading summary...'
      : 'Processing data...';
    
    return (
      <div className="h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md w-full px-6">
          <LoadingSpinner message="Loading repository data..." />
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            
            {/* Progress Text */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400 font-mono">{phaseLabel}</span>
              <span className="text-zinc-500 font-mono">
                {loadingProgress.loaded.toLocaleString()} / {loadingProgress.total.toLocaleString()}
              </span>
            </div>
            
            {/* Percentage */}
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{percent}%</span>
            </div>
          </div>
          
          {/* Tip */}
          <p className="text-xs text-zinc-600 italic">
            Streaming data with Web Workers for optimal performance...
          </p>
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
      <header className="bg-zinc-900 border-b border-zinc-800 p-3 flex-none z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold leading-tight">Git Repository Visualization</h1>
              <p className="text-xs text-zinc-500 font-mono">
                {filteredEvents.length.toLocaleString()} events · {data.summary.length.toLocaleString()} files
              </p>
            </div>
            <div className="h-8 w-px bg-zinc-800 mx-2"></div>
            <PluginSelector plugins={plugins} />
          </div>
          
          <div className="flex items-center gap-3">
            <TimeBinSelector />
            <MetricSelector />
            <div className="h-8 w-px bg-zinc-800 mx-2"></div>
            
            <button
              onClick={() => setShowFilters(!ui.showFilters)}
              className={`p-2 rounded-lg transition-colors ${ui.showFilters ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              title="Toggle Filters"
            >
              <Filter size={18} />
            </button>
            
            <button
              onClick={handleExport}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Export as SVG"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Panel */}
        {ui.showFilters && (
          <aside className="w-80 bg-zinc-900 border-r border-zinc-800 overflow-y-auto flex-none">
            <FilterPanel events={data.events} onClose={() => setShowFilters(false)} />
          </aside>
        )}
        
        {/* Visualization area */}
        <main className="flex-1 overflow-hidden relative">
          <div ref={containerRef} className="w-full h-full"></div>
        </main>
        
        {/* Cell detail panel */}
        {ui.selectedCell && (
          <aside className="w-96 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-none">
            <CellDetailPanel 
              cell={ui.selectedCell} 
              onClose={() => setSelectedCell(null)}
            />
          </aside>
        )}
      </div>
      
      {/* Timeline Controls Footer */}
      {activePlugin?.metadata.id === 'timeline-heatmap' && (
        <footer className="bg-zinc-900 border-t border-zinc-800 p-4 flex-none">
          <TimelineControls minDate={dateRange.min} maxDate={dateRange.max} />
        </footer>
      )}
    </div>
  );
};

export default App;