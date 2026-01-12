// src/App.tsx

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PluginRegistry } from '@/plugins/core/PluginRegistry';
import { VisualizationPlugin } from '@/types/plugin';
import { dataLoader } from '@/services/data/DataLoader';
import { dataProcessor } from '@/services/processing/DataProcessor';
import { useAppStore } from '@/store/appStore';
import { TimelineHeatmapPlugin } from '@/plugins/timeline-heatmap/TimelineHeatmapPlugin';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import PluginSelector from '@/components/layout/PluginSelector';
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
  
  const [loadingProgress, setLoadingProgress] = useState<LoadProgress>({
    loaded: 0,
    total: 0,
    phase: 'events',
  });
  
  const { 
    data, setData, setLoading, setError, 
    ui, setActivePlugin, setShowFilters, setSelectedCell,
    filters
  } = useAppStore();
  
  // Initialize plugins
  useEffect(() => {
    const heatmapPlugin = new TimelineHeatmapPlugin();
    
    PluginRegistry.register(heatmapPlugin);
    
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

  // Process and Render
  useEffect(() => {
    if (!activePlugin || filteredEvents.length === 0 || !containerRef.current) return;
    
    try {
      const config = {
        ...activePlugin.defaultConfig,
        timeBin: filters.timeBin,
        metric: filters.metric,
        onCellClick: (cell: any) => setSelectedCell(cell)
      };

      // ✅ Pass config to processData
      const processed = activePlugin.processData({
        events: filteredEvents,
        summary: data.summary,
      }, config);
      
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
          <div className="space-y-2">
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400 font-mono">{phaseLabel}</span>
              <span className="text-zinc-500 font-mono">
                {loadingProgress.loaded.toLocaleString()} / {loadingProgress.total.toLocaleString()}
              </span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{percent}%</span>
            </div>
          </div>
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
      {/* 1. Compact Header (flex-none) */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex-none z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-base font-bold leading-tight">Git Repository Visualization</h1>
              <p className="text-[10px] text-zinc-500 font-mono leading-tight">
                {filteredEvents.length.toLocaleString()} events · {data.summary.length.toLocaleString()} files
              </p>
            </div>
            <div className="h-8 w-px bg-zinc-800"></div>
            <PluginSelector plugins={plugins} />
          </div>
          
          <div className="flex items-center gap-2">
            <TimeBinSelector />
            <MetricSelector />
            <div className="h-8 w-px bg-zinc-800"></div>
            
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
      
      {/* 2. Main Content Area (flex-1) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2a. Filter Panel (flex-none, toggleable) */}
        <aside className={`w-80 bg-zinc-900 border-r border-zinc-800 overflow-y-auto flex-none panel-transition ${!ui.showFilters ? 'panel-hidden' : ''}`}>
          <FilterPanel events={data.events} onClose={() => setShowFilters(false)} />
        </aside>
        
        {/* 2b. Center Column (flex-1) */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Visualization Grid (flex-1, scrollable) */}
          <div ref={containerRef} className="flex-1 overflow-auto"></div>

        </main>

        {/* 2c. Detail Panel (flex-none, toggleable) */}
        <aside className={`w-96 bg-zinc-900 border-l border-zinc-800 flex-none panel-transition relative ${!ui.selectedCell ? 'panel-hidden' : ''}`}>
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