// src/plugins/treemap-explorer/components/TimelineScrubber.tsx

import React from 'react';
import { Play, Pause } from 'lucide-react';

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
 * Appears on hover over treemap area, allows scrubbing through repository history
 */
export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  minDate,
  maxDate,
  currentPosition,
  totalCommits = 5137,
  visible,
  playing,
  onPositionChange,
  onPlayToggle
}) => {
  // Calculate current commit number based on position
  const currentCommit = Math.floor((currentPosition / 100) * totalCommits);
  
  // FIX: Helper to parse YYYY-MM-DD as local date to avoid timezone shifts
  const parseDate = (dateStr: string) => {
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Calculate current date based on position
  const getCurrentDate = () => {
    const startDate = parseDate(minDate);
    const endDate = parseDate(maxDate);
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const currentDays = (currentPosition / 100) * totalDays;
    const currentDate = new Date(startDate.getTime() + currentDays * 1000 * 60 * 60 * 24);
    return currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div 
      className={`
        absolute bottom-0 left-0 w-full h-20 
        flex items-center px-8 gap-4
        bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-transparent
        transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      style={{ zIndex: 10 }}
    >
      {/* Play/Pause Button */}
      {onPlayToggle && (
        <button
          onClick={onPlayToggle}
          className="
            flex-shrink-0 w-8 h-8 rounded-full
            bg-purple-600 hover:bg-purple-500
            flex items-center justify-center
            transition-colors
            text-white
          "
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>
      )}
      
      {/* Start Date */}
      <span className="flex-shrink-0 text-xs text-zinc-500 font-mono w-24 text-left">
        {formatDate(minDate)}
      </span>
      
      {/* Slider */}
      <div className="flex-1 flex flex-col gap-1">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={currentPosition}
          onChange={(e) => onPositionChange(parseFloat(e.target.value))}
          className="
            w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer
            accent-purple-500
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-purple-500
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-purple-500
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-lg
          "
          aria-label="Timeline position"
        />
        
        {/* Progress bar background */}
        <div className="relative w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-purple-500/30 transition-all duration-100"
            style={{ width: `${currentPosition}%` }}
          />
        </div>
      </div>
      
      {/* End Date */}
      <span className="flex-shrink-0 text-xs text-zinc-500 font-mono w-24 text-right">
        {formatDate(maxDate)}
      </span>
      
      {/* Current Position Info */}
      <div className="flex-shrink-0 flex flex-col items-end gap-0.5 min-w-[120px]">
        <span className="text-xs text-zinc-400 font-mono">
          {getCurrentDate()}
        </span>
        <span className="text-[10px] text-zinc-600 font-mono">
          Commit {currentCommit.toLocaleString()}/{totalCommits.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default TimelineScrubber;