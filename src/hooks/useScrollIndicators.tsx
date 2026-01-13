// src/hooks/useScrollIndicators.tsx

import { useState, useCallback, useLayoutEffect, RefObject } from "react";

interface UseScrollIndicatorsOptions {
  enableDrag?: boolean;
  enableWheel?: boolean;
  threshold?: number;
  containerRef?: RefObject<HTMLElement>;
}

export const useScrollIndicators = (
  ref: RefObject<HTMLElement>,
  options: UseScrollIndicatorsOptions = {}
) => {
  const {
    enableDrag = false,
    enableWheel = false,
    threshold = 60,
    containerRef,
  } = options;

  const [state, setState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    canScrollTop: false,
    canScrollBottom: false,
    isHoveringLeft: false,
    isHoveringRight: false,
    isHoveringTop: false,
    isHoveringBottom: false,
  });

  const checkScrollability = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const {
      scrollTop,
      scrollLeft,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight,
    } = el;

    // Use a slightly larger tolerance for more reliable boundary detection
    const tolerance = 5;

    // Calculate scroll boundaries with better precision
    const isAtLeftEdge = scrollLeft <= tolerance;
    const isAtRightEdge = scrollLeft + clientWidth >= scrollWidth - tolerance;
    const isAtTopEdge = scrollTop <= tolerance;
    const isAtBottomEdge = scrollTop + clientHeight >= scrollHeight - tolerance;

    // Check if content actually overflows (prevents false positives)
    const hasHorizontalOverflow = scrollWidth > clientWidth;
    const hasVerticalOverflow = scrollHeight > clientHeight;

    setState((prev) => {
      const newState = {
        ...prev,
        // Only show indicators if there's overflow AND we're not at the edge
        canScrollLeft: hasHorizontalOverflow && !isAtLeftEdge,
        canScrollRight: hasHorizontalOverflow && !isAtRightEdge,
        canScrollTop: hasVerticalOverflow && !isAtTopEdge,
        canScrollBottom: hasVerticalOverflow && !isAtBottomEdge,
      };

      // Only update if state actually changed to prevent render loops
      if (
        prev.canScrollLeft !== newState.canScrollLeft ||
        prev.canScrollRight !== newState.canScrollRight ||
        prev.canScrollTop !== newState.canScrollTop ||
        prev.canScrollBottom !== newState.canScrollBottom
      ) {
        return newState;
      }
      return prev;
    });
  }, [ref]);

  const scroll = useCallback(
    (direction: "left" | "right" | "up" | "down", amount: number = 200) => {
      const el = ref.current;
      if (!el) return;
      const behavior = "smooth";

      switch (direction) {
        case "left":
          el.scrollBy({ left: -amount, behavior });
          break;
        case "right":
          el.scrollBy({ left: amount, behavior });
          break;
        case "up":
          el.scrollBy({ top: -amount, behavior });
          break;
        case "down":
          el.scrollBy({ top: amount, behavior });
          break;
      }

      // Force immediate check after scroll is initiated
      setTimeout(() => checkScrollability(), 50);
    },
    [ref, checkScrollability]
  );

  // Use LayoutEffect to attach listeners immediately after DOM updates
  useLayoutEffect(() => {
    const el = ref.current;
    const eventEl = containerRef?.current || el;

    if (!el || !eventEl) return;

    // Create a throttled version of checkScrollability for scroll events
    let scrollTimeout: NodeJS.Timeout;
    const handleScrollWithCheck = () => {
      checkScrollability();

      // Additional check after scroll animation completes
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        checkScrollability();
      }, 150);
    };

    // 1. Scroll Listener with throttling
    el.addEventListener("scroll", handleScrollWithCheck, { passive: true });

    // 2. Resize Observer (Handles content changes and window resize)
    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });
    resizeObserver.observe(el);

    // 3. MutationObserver to catch content changes
    const mutationObserver = new MutationObserver(() => {
      checkScrollability();
    });
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // 4. Initial Check (with slight delay to ensure layout is complete)
    requestAnimationFrame(() => {
      checkScrollability();
    });

    // 5. Hover Detection
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setState((prev) => ({
        ...prev,
        isHoveringLeft: x < threshold,
        isHoveringRight: x > rect.width - threshold,
        isHoveringTop: y < threshold,
        isHoveringBottom: y > rect.height - threshold,
      }));
    };

    const handleMouseLeave = () => {
      setState((prev) => ({
        ...prev,
        isHoveringLeft: false,
        isHoveringRight: false,
        isHoveringTop: false,
        isHoveringBottom: false,
      }));
    };

    eventEl.addEventListener("mousemove", handleMouseMove);
    eventEl.addEventListener("mouseleave", handleMouseLeave);

    // 6. Drag Logic
    let isDown = false;
    let startX: number;
    let startY: number;
    let scrollLeftStart: number;
    let scrollTopStart: number;

    const handleMouseDown = (e: MouseEvent) => {
      if (!enableDrag) return;
      isDown = true;
      el.classList.add("cursor-grabbing");
      el.classList.remove("cursor-grab");
      startX = e.pageX - el.offsetLeft;
      startY = e.pageY - el.offsetTop;
      scrollLeftStart = el.scrollLeft;
      scrollTopStart = el.scrollTop;
    };

    const handleMouseUp = () => {
      if (!enableDrag) return;
      isDown = false;
      el.classList.remove("cursor-grabbing");
      el.classList.add("cursor-grab");
    };

    const handleDragMove = (e: MouseEvent) => {
      if (!isDown || !enableDrag) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const y = e.pageY - el.offsetTop;
      const walkX = (x - startX) * 2;
      const walkY = (y - startY) * 2;
      el.scrollLeft = scrollLeftStart - walkX;
      el.scrollTop = scrollTopStart - walkY;
    };

    if (enableDrag) {
      el.style.cursor = "grab";
      el.addEventListener("mousedown", handleMouseDown);
      el.addEventListener("mouseup", handleMouseUp);
      el.addEventListener("mouseleave", handleMouseUp);
      el.addEventListener("mousemove", handleDragMove);
    }

    // 7. Wheel Logic
    const handleWheel = (e: WheelEvent) => {
      if (!enableWheel) return;
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    if (enableWheel) {
      el.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      clearTimeout(scrollTimeout);
      el.removeEventListener("scroll", handleScrollWithCheck);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      eventEl.removeEventListener("mousemove", handleMouseMove);
      eventEl.removeEventListener("mouseleave", handleMouseLeave);

      if (enableDrag) {
        el.removeEventListener("mousedown", handleMouseDown);
        el.removeEventListener("mouseup", handleMouseUp);
        el.removeEventListener("mouseleave", handleMouseUp);
        el.removeEventListener("mousemove", handleDragMove);
      }
      if (enableWheel) {
        el.removeEventListener("wheel", handleWheel);
      }
    };
  }, [
    ref,
    threshold,
    enableDrag,
    enableWheel,
    checkScrollability,
    containerRef,
  ]);

  return {
    ...state,
    scroll,
    checkScrollability,
  };
};
