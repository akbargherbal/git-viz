// src/plugins/treemap-explorer/utils/colorScales.ts

import { EnrichedFileData } from "../TreemapExplorerPlugin";
import { HealthScoreCalculator } from "@/services/data/HealthScoreCalculator";

/**
 * Determines cell color based on the active lens mode
 */
export const getCellColor = (
  file: EnrichedFileData,
  lensMode: 'debt' | 'coupling' | 'time',
  state: {
    selectedFile: string | null;
    couplingThreshold: number;
    timePosition: number;
  }
): string => {
  switch (lensMode) {
    case 'debt':
      return getDebtColor(file);
    case 'coupling':
      return getCouplingColor(file, state.selectedFile, state.couplingThreshold);
    case 'time':
      return getTimeColor(file, state.timePosition);
    default:
      return '#27272a'; // zinc-800
  }
};

/**
 * Debt Lens: Colors based on health score
 * Green (Healthy) -> Amber (Medium) -> Red (Critical)
 */
const getDebtColor = (file: EnrichedFileData): string => {
  if (!file.healthScore) return '#27272a';
  return HealthScoreCalculator.getHealthColor(file.healthScore.score);
};

/**
 * Coupling Lens: Highlights relationships relative to selection
 * - Selected file: White
 * - Coupled files: Purple gradient based on strength
 * - Unrelated files: Dark Gray
 */
const getCouplingColor = (
  file: EnrichedFileData,
  selectedFile: string | null,
  threshold: number
): string => {
  // If no file is selected, show potential coupling hotspots above threshold
  if (!selectedFile) {
    if (file.couplingMetrics && file.couplingMetrics.maxStrength > threshold) {
      const intensity = file.couplingMetrics.maxStrength;
      return `hsl(270, ${40 + intensity * 30}%, ${15 + intensity * 10}%)`;
    }
    return '#27272a';
  }

  // If this is the selected file
  if (file.path === selectedFile) {
    return '#ffffff';
  }

  // Note: Direct coupling highlighting is handled in the main render loop 
  // where we have access to the selected file's partners. 
  // This fallback handles the non-coupled state.
  return '#18181b'; // Dimmed
};

/**
 * Time Lens: Colors based on lifecycle (Placeholder for Phase 3)
 */
const getTimeColor = (_file: EnrichedFileData, _timePosition: number): string => {
  return '#3b82f6'; // blue-500
};