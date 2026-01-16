// src/plugins/treemap-explorer/components/TreemapExplorerFilters.tsx

import React from 'react';
import { TreemapExplorerState } from '../TreemapExplorerPlugin';

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
  const { lensMode, couplingThreshold } = state;

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
                    {couplingThreshold.toFixed(1)}
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
                Display Options
              </label>
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 bg-zinc-900/50 rounded p-2 border border-zinc-800">
                  Time lens filters will be available in Phase 3
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
                <span className="text-purple-400 font-mono font-bold">{couplingThreshold.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};