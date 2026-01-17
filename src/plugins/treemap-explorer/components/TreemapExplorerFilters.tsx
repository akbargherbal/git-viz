// src/plugins/treemap-explorer/components/TreemapExplorerFilters.tsx

import React from 'react';
import { TreemapExplorerState } from '../types';

interface TreemapExplorerFiltersProps {
  state: TreemapExplorerState;
  onStateChange: (updates: Partial<TreemapExplorerState>) => void;
  onClose: () => void;
}

/**
 * Filter panel content for Treemap Explorer
 * Shows lens-specific filters in the right sidebar
 */
export const TreemapExplorerFilters: React.FC<TreemapExplorerFiltersProps> = ({
  state,
  onStateChange,
  onClose
}) => {
  // ... existing implementation ...
  const { lensMode, couplingThreshold } = state;
  
  // Get time filters with defaults - spread to ensure all properties exist
  const timeFilters = {
    showCreations: false,
    fadeDormant: true,
    ...state.timeFilters
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <h2 className="font-bold text-sm">Filters & Options</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded transition-colors">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Debt Lens Filters */}
        {lensMode === 'debt' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3 block">
                Risk Filters
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={state.healthThreshold === 30}
                    onChange={(e) => {
                      onStateChange({ healthThreshold: e.target.checked ? 30 : 0 });
                    }}
                    className="rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-red-500"
                  />
                  <span>Critical Only (Health ≤ 30)</span>
                </label>
                
                <div className="text-[10px] text-zinc-500 mt-2 bg-zinc-900/50 rounded p-2 border border-zinc-800">
                  Filter to show only files with critical health scores
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coupling Lens Filters */}
        {lensMode === 'coupling' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3 block">
                Coupling Strength Threshold
              </label>
              <div className="space-y-3">
                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={couplingThreshold}
                  onChange={(e) => onStateChange({ couplingThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                />
                
                {/* Value display */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-zinc-500">Weak (0.0)</span>
                  <span className="text-purple-400 font-bold text-sm">
                    {couplingThreshold?.toFixed(1)}
                  </span>
                  <span className="text-zinc-500">Strong (1.0)</span>
                </div>
                
                {/* Helper text */}
                <div className="text-xs text-zinc-500 bg-zinc-900/50 rounded p-2 border border-zinc-800">
                  Filters coupling arcs and partner visibility. Higher values show only stronger relationships.
                </div>
              </div>
            </div>

            {/* Arc visibility toggle */}
            <div>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={state.showArcs}
                  onChange={(e) => onStateChange({ showArcs: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                />
                <span>Show Coupling Arcs</span>
              </label>
              <div className="text-[10px] text-zinc-500 mt-1 ml-6">
                Display visual connections between coupled files
              </div>
            </div>
          </div>
        )}

        {/* Time Lens Filters */}
        {lensMode === 'time' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3 block">
                Temporal Display Options
              </label>
              
              <div className="space-y-3">
                {/* Highlight New Files */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={timeFilters.showCreations}
                      onChange={(e) => {
                        onStateChange({ 
                          timeFilters: { 
                            ...timeFilters, 
                            showCreations: e.target.checked 
                          }
                        });
                      }}
                      className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-green-600 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-zinc-300 group-hover:text-white transition-colors font-medium">
                        Highlight New Files
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        Show recently created files in bright green when scrubbing through early timeline (0-30%)
                      </p>
                    </div>
                  </label>
                </div>
                
                {/* Fade Dormant Files */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={timeFilters.fadeDormant}
                      onChange={(e) => {
                        onStateChange({ 
                          timeFilters: { 
                            ...timeFilters, 
                            fadeDormant: e.target.checked 
                          }
                        });
                      }}
                      className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-zinc-300 group-hover:text-white transition-colors font-medium">
                        Fade Dormant Files
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        Dim files with no activity in the last 180+ days to focus on active development
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Timeline Info */}
            <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Use the timeline scrubber at the bottom to travel through repository history. 
                  Colors change to show file lifecycle at different points in time.
                </p>
              </div>
            </div>
            
            {/* Color Legend */}
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-2 block">
                Color Guide
              </label>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                  <span className="text-zinc-400">New Files (Early Timeline)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#06b6d4' }}></div>
                  <span className="text-zinc-400">Very Recent Activity</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span className="text-zinc-400">Active Files</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3f3f46' }}></div>
                  <span className="text-zinc-400">Dormant (180+ days)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1a1a1d' }}></div>
                  <span className="text-zinc-400">Very Dormant (1+ year)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Directory Filter Section (applies to all lenses) */}
        <div className="pt-4 mt-4 border-t border-zinc-800">
          <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3 block">
            Quick Stats
          </label>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2 bg-zinc-800/50 border border-zinc-700 rounded text-xs">
              <span className="text-zinc-400">Current Lens</span>
              <span className="text-zinc-200 font-medium capitalize">{lensMode}</span>
            </div>
            
            {lensMode === 'coupling' && (
              <div className="flex items-center justify-between p-2 bg-zinc-800/50 border border-zinc-700 rounded text-xs">
                <span className="text-zinc-400">Threshold</span>
                <span className="text-purple-400 font-mono font-bold">{couplingThreshold?.toFixed(1)}</span>
              </div>
            )}
            
            {lensMode === 'time' && (
              <div className="flex items-center justify-between p-2 bg-zinc-800/50 border border-zinc-700 rounded text-xs">
                <span className="text-zinc-400">Timeline Position</span>
                <span className="text-blue-400 font-mono font-bold">{state.timePosition?.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
