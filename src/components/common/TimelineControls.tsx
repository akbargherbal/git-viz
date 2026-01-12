// src/components/common/TimelineControls.tsx
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineControlsProps {
  minDate: Date;
  maxDate: Date;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({ minDate, maxDate }) => {
  const { timeline, setPlaying, setCurrentTime, setPlaybackSpeed } = useAppStore();
  const animationRef = useRef<number>();
  const isDraggingRef = useRef(false);
  
  // Initialize current time if null
  useEffect(() => {
    if (!timeline.currentTime && minDate) {
      setCurrentTime(minDate);
    }
  }, [minDate, timeline.currentTime, setCurrentTime]);

  // Animation loop for playback
  useEffect(() => {
    if (timeline.isPlaying && !isDraggingRef.current) {
      let lastTimestamp = performance.now();
      
      const animate = (timestamp: number) => {
        const elapsed = timestamp - lastTimestamp;
        
        if (elapsed > 16) { // Cap at ~60fps
          const current = timeline.currentTime ? new Date(timeline.currentTime) : new Date(minDate);
          const totalDuration = maxDate.getTime() - minDate.getTime();
          
          // Advance time based on speed
          // Speed multiplier: 1x = traverse entire timeline in ~30 seconds
          const baseSpeed = totalDuration / 30000; // milliseconds per millisecond
          const step = baseSpeed * elapsed * timeline.playbackSpeed;
          
          const nextTime = new Date(current.getTime() + step);
          
          if (nextTime >= maxDate) {
            setCurrentTime(maxDate);
            setPlaying(false);
          } else {
            setCurrentTime(nextTime);
            lastTimestamp = timestamp;
            animationRef.current = requestAnimationFrame(animate);
          }
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [timeline.isPlaying, timeline.currentTime, timeline.playbackSpeed, minDate, maxDate, setCurrentTime, setPlaying]);

  // Handle scrubbing
  const handleScrubStart = () => {
    isDraggingRef.current = true;
    setPlaying(false); // Pause during manual scrubbing
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const time = minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * (percent / 100);
    setCurrentTime(new Date(time));
  };

  const handleScrubEnd = () => {
    isDraggingRef.current = false;
  };

  // Calculate progress percentage
  const progress = timeline.currentTime 
    ? ((timeline.currentTime.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100 
    : 0;

  // Jump forward/backward by 10% of total range
  const handleSkipBackward = () => {
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const skipAmount = totalDuration * 0.1;
    const current = timeline.currentTime || minDate;
    const newTime = new Date(Math.max(current.getTime() - skipAmount, minDate.getTime()));
    setCurrentTime(newTime);
  };

  const handleSkipForward = () => {
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const skipAmount = totalDuration * 0.1;
    const current = timeline.currentTime || minDate;
    const newTime = new Date(Math.min(current.getTime() + skipAmount, maxDate.getTime()));
    setCurrentTime(newTime);
  };

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 p-4">
      {/* Time Display */}
      <div className="flex justify-between text-xs font-mono text-zinc-500 mb-2">
        <span className="text-zinc-600">{format(minDate, 'MMM dd, yyyy')}</span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Current:</span>
          <span className="text-purple-400 font-bold text-sm">
            {timeline.currentTime ? format(timeline.currentTime, 'MMM dd, yyyy HH:mm') : '-'}
          </span>
        </div>
        <span className="text-zinc-600">{format(maxDate, 'MMM dd, yyyy')}</span>
      </div>

      {/* Progress Bar Container */}
      <div className="relative mb-4">
        {/* Background track */}
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-100 ease-linear relative"
            style={{ width: `${progress}%` }}
          >
            {/* Animated shimmer effect when playing */}
            {timeline.isPlaying && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>

        {/* Scrubber Handle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-purple-500 transition-transform hover:scale-110"
          style={{ 
            left: `calc(${progress}% - 10px)`,
            cursor: 'grab'
          }}
        >
          {/* Pulsing effect when playing */}
          {timeline.isPlaying && (
            <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-75" />
          )}
        </div>

        {/* Invisible input overlay for interaction */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.01"
          value={progress}
          onChange={handleScrub}
          onMouseDown={handleScrubStart}
          onMouseUp={handleScrubEnd}
          onTouchStart={handleScrubStart}
          onTouchEnd={handleScrubEnd}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTime(minDate)}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Reset to Start"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={handleSkipBackward}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Skip Backward 10%"
          >
            <Rewind size={18} />
          </button>
          
          <button
            onClick={() => setPlaying(!timeline.isPlaying)}
            className="p-3 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-all shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-105"
            title={timeline.isPlaying ? 'Pause' : 'Play'}
          >
            {timeline.isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={handleSkipForward}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Skip Forward 10%"
          >
            <FastForward size={18} />
          </button>

          <button
            onClick={() => setCurrentTime(maxDate)}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Skip to End"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Center: Progress Indicator */}
        <div className="flex items-center gap-3 px-4">
          <div className="text-xs text-zinc-500">
            Progress: <span className="text-purple-400 font-bold">{progress.toFixed(1)}%</span>
          </div>
          {timeline.isPlaying && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-500 font-medium">PLAYING</span>
            </div>
          )}
        </div>

        {/* Right: Speed Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Speed</span>
          <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            {[0.5, 1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-all ${
                  timeline.playbackSpeed === speed
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineControls;