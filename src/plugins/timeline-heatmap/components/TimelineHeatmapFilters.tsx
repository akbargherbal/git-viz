// src/plugins/timeline-heatmap/components/TimelineHeatmapFilters.tsx

import React, { useMemo } from "react";

interface DirectoryStat {
  path: string;
  activity_score: number;
  file_count: number;
  total_commits: number;
}

interface TimelineHeatmapFiltersProps {
  // Directory controls
  directories: DirectoryStat[];
  excludedDirectories: string[];
  directoryCount: number;
  onExcludedDirectoriesChange: (excluded: string[]) => void;
  onDirectoryCountChange: (count: number) => void;
  onClose: () => void;
}

export const TimelineHeatmapFilters: React.FC<TimelineHeatmapFiltersProps> = ({
  directories,
  excludedDirectories,
  directoryCount,
  onExcludedDirectoriesChange,
  onDirectoryCountChange,
  onClose,
}) => {
  // Get top N directories for exclusion UI (show more than will be displayed)
  const topDirectories = useMemo(() => {
    return directories
      .sort((a, b) => b.activity_score - a.activity_score)
      .slice(0, Math.min(50, directories.length)); // Show top 50 for exclusion
  }, [directories]);

  const handleDirectoryToggle = (path: string) => {
    const newExcluded = excludedDirectories.includes(path)
      ? excludedDirectories.filter((d) => d !== path)
      : [...excludedDirectories, path];
    onExcludedDirectoriesChange(newExcluded);
  };

  const handleClearExclusions = () => {
    onExcludedDirectoriesChange([]);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <h2 className="text-lg font-semibold">Timeline Heatmap Filters</h2>
        <button
          onClick={onClose}
          className="text-zinc-400 transition-colors hover:text-zinc-100"
          aria-label="Close filters"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

      {/* Scrollable Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Directory Count Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-200">
              Number of Directories
            </label>
            <span className="font-mono text-sm text-zinc-400">
              {directoryCount}
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={directoryCount}
            onChange={(e) => onDirectoryCountChange(Number(e.target.value))}
            className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>5</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Directory Exclusion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-200">
              Directory Exclusions
            </label>
            {excludedDirectories.length > 0 && (
              <button
                onClick={handleClearExclusions}
                className="text-xs text-blue-400 transition-colors hover:text-blue-300"
              >
                Clear All ({excludedDirectories.length})
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Hide specific directories from the heatmap (showing top 50
            candidates)
          </p>

          <div className="max-h-[400px] space-y-1 overflow-y-auto rounded border border-zinc-800 p-2">
            {topDirectories.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                No directories available
              </p>
            ) : (
              topDirectories.map((dir) => {
                const isExcluded = excludedDirectories.includes(dir.path);
                return (
                  <label
                    key={dir.path}
                    className={`flex cursor-pointer items-center gap-2 rounded p-2 transition-colors ${
                      isExcluded
                        ? "bg-zinc-800/50 text-zinc-500 line-through"
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => handleDirectoryToggle(dir.path)}
                      className="rounded border-zinc-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm" title={dir.path}>
                        {dir.path}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {dir.total_commits} commits · {dir.file_count} files
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add custom slider styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};
