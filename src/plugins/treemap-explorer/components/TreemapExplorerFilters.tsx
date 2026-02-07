// src/plugins/treemap-explorer/components/TreemapExplorerFilters.tsx

import React from "react";
import { TreemapExplorerState } from "../types";

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
  onClose,
}) => {
  const {
    lensMode = "debt",
    couplingThreshold = 0.03,
    showArcs = false,
  } = state;

  // Get time filters with defaults - spread to ensure all properties exist
  const timeFilters = {
    showCreations: false,
    fadeDormant: true,
    ...state.timeFilters,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <h2 className="text-sm font-bold">Filters & Options</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 transition-colors hover:bg-zinc-800"
        >
          <svg
            className="h-4 w-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Debt Lens Filters */}
        {lensMode === "debt" && (
          <div className="space-y-4">
            <div>
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Risk Filters
              </label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300 transition-colors hover:text-white">
                  <input
                    type="checkbox"
                    checked={state.healthThreshold === 30}
                    onChange={(e) => {
                      onStateChange({
                        healthThreshold: e.target.checked ? 30 : 100,
                      });
                    }}
                    className="rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-red-500"
                  />
                  <span>Critical Only (Health ≤ 30)</span>
                </label>

                <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2 text-[10px] text-zinc-500">
                  Filter to show only files with critical health scores
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coupling Lens Filters */}
        {lensMode === "coupling" && (
          <div className="space-y-4">
            <div>
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
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
                  onChange={(e) =>
                    onStateChange({
                      couplingThreshold: parseFloat(e.target.value),
                    })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-purple-500"
                />

                {/* Value display */}
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-500">Weak (0.0)</span>
                  <span className="text-sm font-bold text-purple-400">
                    {couplingThreshold?.toFixed(1)}
                  </span>
                  <span className="text-zinc-500">Strong (1.0)</span>
                </div>

                {/* Helper text */}
                <div className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-xs text-zinc-500">
                  Filters coupling arcs and partner visibility. Higher values
                  show only stronger relationships.
                </div>
              </div>
            </div>

            {/* Arc visibility toggle */}
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300 transition-colors hover:text-white">
                <input
                  type="checkbox"
                  checked={showArcs}
                  onChange={(e) =>
                    onStateChange({ showArcs: e.target.checked })
                  }
                  className="rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                />
                <span>Show Coupling Arcs</span>
              </label>
              <div className="ml-6 mt-1 text-[10px] text-zinc-500">
                Display visual connections between coupled files
              </div>
            </div>
          </div>
        )}

        {/* Time Lens Filters */}
        {lensMode === "time" && (
          <div className="space-y-4">
            <div>
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Temporal Display Options
              </label>

              <div className="space-y-3">
                {/* Highlight New Files */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <label className="group flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={timeFilters.showCreations}
                      onChange={(e) => {
                        onStateChange({
                          timeFilters: {
                            ...timeFilters,
                            showCreations: e.target.checked,
                          },
                        });
                      }}
                      className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-green-600 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-zinc-300 transition-colors group-hover:text-white">
                        Highlight New Files
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                        Show recently created files in bright green when
                        scrubbing through early timeline (0-30%)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Fade Dormant Files */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <label className="group flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={timeFilters.fadeDormant}
                      onChange={(e) => {
                        onStateChange({
                          timeFilters: {
                            ...timeFilters,
                            fadeDormant: e.target.checked,
                          },
                        });
                      }}
                      className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-zinc-300 transition-colors group-hover:text-white">
                        Fade Dormant Files
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                        Dim files with no activity in the last 180+ days to
                        focus on active development
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Timeline Info */}
            <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-[10px] leading-relaxed text-zinc-400">
                  Use the timeline scrubber at the bottom to travel through
                  repository history. Colors change to show file lifecycle at
                  different points in time.
                </p>
              </div>
            </div>

            {/* Color Legend */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Color Guide
              </label>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: "#22c55e" }}
                  ></div>
                  <span className="text-zinc-400">
                    New Files (Early Timeline)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: "#06b6d4" }}
                  ></div>
                  <span className="text-zinc-400">Very Recent Activity</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: "#3b82f6" }}
                  ></div>
                  <span className="text-zinc-400">Active Files</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: "#3f3f46" }}
                  ></div>
                  <span className="text-zinc-400">Dormant (180+ days)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: "#1a1a1d" }}
                  ></div>
                  <span className="text-zinc-400">Very Dormant (1+ year)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Directory Filter Section (applies to all lenses) */}
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Quick Stats
          </label>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-800/50 p-2 text-xs">
              <span className="text-zinc-400">Current Lens</span>
              <span className="font-medium capitalize text-zinc-200">
                {lensMode}
              </span>
            </div>

            {lensMode === "coupling" && (
              <div className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-800/50 p-2 text-xs">
                <span className="text-zinc-400">Threshold</span>
                <span className="font-mono font-bold text-purple-400">
                  {couplingThreshold?.toFixed(1)}
                </span>
              </div>
            )}

            {lensMode === "time" && (
              <div className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-800/50 p-2 text-xs">
                <span className="text-zinc-400">Timeline Position</span>
                <span className="font-mono font-bold text-blue-400">
                  {state.timePosition?.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
