// src/components/common/ScrollIndicatorOverlay.tsx

import React, { useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface ScrollIndicatorOverlayProps {
  state: {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    canScrollTop: boolean;
    canScrollBottom: boolean;
    isHoveringLeft: boolean;
    isHoveringRight: boolean;
    isHoveringTop: boolean;
    isHoveringBottom: boolean;
  };
  onScroll: (
    direction: "left" | "right" | "up" | "down",
    amount?: number,
  ) => void;
}

export const ScrollIndicatorOverlay: React.FC<ScrollIndicatorOverlayProps> = ({
  state,
  onScroll,
}) => {
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollDirectionRef = useRef<"left" | "right" | "up" | "down" | null>(
    null,
  );

  // Continuous scroll on hold
  const startContinuousScroll = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      onScroll(direction, 200);
      scrollDirectionRef.current = direction;

      scrollIntervalRef.current = setInterval(() => {
        if (scrollDirectionRef.current) {
          onScroll(scrollDirectionRef.current, 200);
        }
      }, 150);
    },
    [onScroll],
  );

  const stopContinuousScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    scrollDirectionRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  const baseClasses =
    "absolute z-50 flex items-center justify-center transition-all duration-300 cursor-pointer select-none";

  /**
   * FIXED: 3-STATE LOGIC with proper visibility control
   * State A: Hidden - when scrolling is not available in this direction
   * State B: Passive/Ghost - available but not being hovered
   * State C: Active/Ready - available and being hovered
   */
  const getClasses = (isHovering: boolean, canScroll: boolean) => {
    // State A: Unavailable (Completely Hidden)
    if (!canScroll) {
      return "opacity-0 scale-75 pointer-events-none";
    }

    // State C: Active (Hover / "Ready")
    if (isHovering) {
      return "opacity-100 bg-purple-600/95 text-white shadow-2xl shadow-purple-900/50 border-purple-400 scale-110 border-2 backdrop-blur-md";
    }

    // State B: Available (Passive / "Ghost")
    return "opacity-40 bg-zinc-800/60 text-zinc-300 border-zinc-600/70 hover:opacity-80 hover:scale-105 scale-100 border backdrop-blur-sm";
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-40">
      {/* Left Indicator */}
      <div
        className={`
          ${baseClasses} 
          left-3 
          top-1/2 
          -translate-y-1/2 
          w-8 
          h-16 
          rounded-xl
          ${getClasses(state.isHoveringLeft, state.canScrollLeft)}
        `}
        style={{
          pointerEvents: state.canScrollLeft ? "auto" : "none",
        }}
        onMouseDown={() => startContinuousScroll("left")}
        onMouseUp={stopContinuousScroll}
        onMouseLeave={stopContinuousScroll}
        aria-label="Scroll left"
        role="button"
        tabIndex={state.canScrollLeft ? 0 : -1}
      >
        <ChevronLeft size={28} strokeWidth={2.5} />
      </div>

      {/* Right Indicator */}
      <div
        className={`
          ${baseClasses} 
          right-3 
          top-1/2 
          -translate-y-1/2 
          w-8 
          h-16 
          rounded-xl
          ${getClasses(state.isHoveringRight, state.canScrollRight)}
        `}
        style={{
          pointerEvents: state.canScrollRight ? "auto" : "none",
        }}
        onMouseDown={() => startContinuousScroll("right")}
        onMouseUp={stopContinuousScroll}
        onMouseLeave={stopContinuousScroll}
        aria-label="Scroll right"
        role="button"
        tabIndex={state.canScrollRight ? 0 : -1}
      >
        <ChevronRight size={28} strokeWidth={2.5} />
      </div>

      {/* Top Indicator */}
      <div
        className={`
          ${baseClasses} 
          top-3 
          left-1/2 
          -translate-x-1/2 
          w-16
          h-12 
          rounded-xl
          ${getClasses(state.isHoveringTop, state.canScrollTop)}
        `}
        style={{
          pointerEvents: state.canScrollTop ? "auto" : "none",
        }}
        onMouseDown={() => startContinuousScroll("up")}
        onMouseUp={stopContinuousScroll}
        onMouseLeave={stopContinuousScroll}
        aria-label="Scroll up"
        role="button"
        tabIndex={state.canScrollTop ? 0 : -1}
      >
        <ChevronUp size={28} strokeWidth={2.5} />
      </div>

      {/* Bottom Indicator */}
      <div
        className={`
          ${baseClasses} 
          bottom-3 
          left-1/2 
          -translate-x-1/2 
          w-16
          h-12 
          rounded-xl
          ${getClasses(state.isHoveringBottom, state.canScrollBottom)}
        `}
        style={{
          pointerEvents: state.canScrollBottom ? "auto" : "none",
        }}
        onMouseDown={() => startContinuousScroll("down")}
        onMouseUp={stopContinuousScroll}
        onMouseLeave={stopContinuousScroll}
        aria-label="Scroll down"
        role="button"
        tabIndex={state.canScrollBottom ? 0 : -1}
      >
        <ChevronDown size={24} strokeWidth={2.5} />
      </div>
    </div>
  );
};

export default ScrollIndicatorOverlay;
