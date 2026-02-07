// src/plugins/treemap-explorer/components/TimelineScrubber.tsx
// OPTION 1 IMPLEMENTATION: Works with reserved layout space strategy

import React from "react";
import { Play, Pause } from "lucide-react";

interface TimelineScrubberProps {
  minDate: string;
  maxDate: string;
  currentPosition: number;
  totalCommits?: number;
  visible: boolean;
  playing: boolean;
  onPositionChange: (position: number) => void;
  onPlayToggle?: () => void;
}

/**
 * Timeline scrubber control for the Time Lens
 *
 * LAYOUT STRATEGY: This component is positioned at absolute bottom-0 with h-20 (80px).
 * The TreemapExplorerPlugin reserves this space by subtracting TIMELINE_SCRUBBER_HEIGHT
 * from the available height when in time lens mode. This prevents the scrubber from
 * obscuring bottom treemap cells.
 *
 * When switching between lenses, the treemap smoothly resizes thanks to CSS transitions
 * on the parent container, making the layout shift feel intentional.
 */
export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  minDate,
  maxDate,
  currentPosition,
  totalCommits = 5137,
  visible,
  playing,
  onPositionChange,
  onPlayToggle,
}) => {
  // Calculate current commit number based on position
  const currentCommit = Math.floor((currentPosition / 100) * totalCommits);

  // FIX: Helper to parse YYYY-MM-DD as local date to avoid timezone shifts
  const parseDate = (dateStr: string) => {
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate current date based on position
  const getCurrentDate = () => {
    const startDate = parseDate(minDate);
    const endDate = parseDate(maxDate);
    const totalDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const currentDays = (currentPosition / 100) * totalDays;
    const currentDate = new Date(
      startDate.getTime() + currentDays * 1000 * 60 * 60 * 24,
    );
    return currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={`absolute bottom-0 left-0 flex h-20 w-full items-center gap-4 bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-transparent px-8 transition-opacity duration-300 ${visible ? "opacity-100" : "pointer-events-none opacity-0"} `}
      style={{ zIndex: 10 }}
    >
      {/* Play/Pause Button */}
      {onPlayToggle && (
        <button
          onClick={onPlayToggle}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-500"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>
      )}

      {/* Start Date */}
      <span className="w-24 flex-shrink-0 text-left font-mono text-xs text-zinc-500">
        {formatDate(minDate)}
      </span>

      {/* Unified Slider + Progress Timeline */}
      <div className="relative flex-1">
        {/* Progress bar background - positioned under the slider */}
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <div className="relative h-2 w-full overflow-hidden rounded-lg bg-zinc-700">
            <div
              className="absolute left-0 top-0 h-full bg-purple-500/30 transition-all duration-100"
              style={{ width: `${currentPosition}%` }}
            />
          </div>
        </div>

        {/* Slider - overlaid on top with transparent track */}
        <input
          type="range"
          data-testid="timeline-scrubber"
          min="0"
          max="100"
          step="0.1"
          value={currentPosition}
          onChange={(e) => onPositionChange(parseFloat(e.target.value))}
          className="relative h-2 w-full cursor-pointer appearance-none rounded-lg bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-track]:h-2 [&::-webkit-slider-track]:bg-transparent"
          aria-label="Timeline position"
        />
      </div>

      {/* End Date */}
      <span className="w-24 flex-shrink-0 text-right font-mono text-xs text-zinc-500">
        {formatDate(maxDate)}
      </span>

      {/* Current Position Info */}
      <div className="flex min-w-[120px] flex-shrink-0 flex-col items-end gap-0.5">
        <span className="font-mono text-xs text-zinc-400">
          {getCurrentDate()}
        </span>
        <span className="font-mono text-[10px] text-zinc-600">
          Commit {currentCommit.toLocaleString()}/
          {totalCommits.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default TimelineScrubber;
