// FILE: src/plugins/treemap-explorer/utils/colorScales.ts
import * as d3 from "d3";
import { EnrichedFileData, TemporalFileData } from "../types";

/**
 * Color scale for debt lens (health-based)
 * Maps health score (0-100) to color
 */
export const getDebtColor = (file: EnrichedFileData): string => {
  const score = file.healthScore?.score ?? 100;

  if (score >= 75) return "#22c55e"; // Green - healthy
  if (score >= 50) return "#eab308"; // Yellow - medium
  if (score >= 25) return "#f97316"; // Orange - concerning
  return "#ef4444"; // Red - critical
};

/**
 * Color scale for coupling lens
 * Maps coupling strength to color intensity
 */
export const getCouplingColor = (
  file: EnrichedFileData,
  threshold: number,
): string => {
  const coupling = file.maxCoupling ?? 0;

  if (coupling === 0) return "#27272a"; // Dark gray - no coupling

  // Above threshold: purple scale
  if (coupling >= threshold) {
    const intensity = Math.min(coupling / 0.1, 1); // Cap at 0.1
    const scale = d3
      .scaleLinear<string>()
      .domain([0, 1])
      .range(["#7c3aed", "#c084fc"]);
    return scale(intensity);
  }

  // Below threshold: gray scale
  return "#52525b";
};

/**
 * Color scale for time lens
 * Shows file lifecycle status based on timeline position
 */
export const getTimeColor = (
  file: TemporalFileData,
  timePosition: number,
  filters: { showCreations: boolean; fadeDormant: boolean },
): string => {
  // Hide files not yet created
  if (
    !file.isVisible ||
    (file.createdPosition && file.createdPosition > timePosition)
  ) {
    return "#09090b"; // Near-black
  }

  // Fade dormant files if filter enabled
  if (file.isDormant && filters.fadeDormant) {
    return "#1a1a1d"; // Very dark gray
  }

  // Highlight new creations at start of timeline
  const isNewFile =
    file.createdPosition !== undefined &&
    file.createdPosition >= timePosition - 10;
  if (isNewFile && filters.showCreations && timePosition < 30) {
    return "#22c55e"; // Bright green
  }

  // Recent activity (modified in last 30 days from timeline position)
  const daysSinceModified = file.dormantDays || 0;
  if (daysSinceModified < 30) {
    return "#06b6d4"; // Cyan - very recent
  }

  // Dormant at end of timeline
  if (timePosition > 70 && file.isDormant) {
    return "#3f3f46"; // Medium gray
  }

  // Default: active file
  return "#3b82f6"; // Blue
};

/**
 * Get color for a file based on current lens mode
 */
export const getCellColor = (
  file: EnrichedFileData | TemporalFileData,
  lensMode: "debt" | "coupling" | "time",
  options: {
    couplingThreshold?: number;
    timePosition?: number;
    timeFilters?: { showCreations: boolean; fadeDormant: boolean };
  } = {},
): string => {
  switch (lensMode) {
    case "debt":
      return getDebtColor(file);

    case "coupling":
      return getCouplingColor(file, options.couplingThreshold ?? 0.03);

    case "time":
      if ("isDormant" in file) {
        return getTimeColor(
          file as TemporalFileData,
          options.timePosition ?? 100,
          options.timeFilters ?? { showCreations: false, fadeDormant: true },
        );
      }
      return "#3b82f6"; // Default blue

    default:
      return "#3b82f6";
  }
};
