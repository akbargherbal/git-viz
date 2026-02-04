// src/plugins/treemap-explorer/components/TreemapExplorerControls.tsx

import React from "react";
import { PluginControlProps } from "@/types/plugin";
import { LensModeSelector } from "./LensModeSelector";
import { TreemapExplorerState } from "../types";

/**
 * Header controls for Treemap Explorer
 * Renders inline controls: Lens Mode buttons + Size Metric selector
 *
 * Phase 3 Enhancement: Added data attributes for state visibility
 * - Container exposes lens mode and size metric state
 * - Size metric selector exposes active metric
 * - Individual buttons expose active state
 */
export const TreemapExplorerControls: React.FC<
  PluginControlProps<TreemapExplorerState>
> = ({ state, updateState }) => {
  // Ensure defaults are applied if state is partial/initializing
  const lensMode = state.lensMode || "debt";
  const sizeMetric = state.sizeMetric || "commits";

  const sizeMetrics = [
    { id: "commits", label: "Commits" },
    { id: "authors", label: "Authors" },
  ];

  return (
    <div
      className="flex gap-4 items-center flex-wrap"
      data-testid="treemap-controls"
      data-lens-mode={lensMode}
      data-size-metric={sizeMetric}
    >
      {/* Lens Mode Selector */}
      <LensModeSelector
        currentLens={lensMode}
        onLensChange={(lens) => updateState({ lensMode: lens })}
      />

      {/* Size Metric Selector */}
      <div
        className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800"
        data-testid="size-metric-selector"
        data-active-metric={sizeMetric}
      >
        {sizeMetrics.map((metric) => (
          <button
            key={metric.id}
            data-testid={`metric-${metric.id}`}
            data-active={sizeMetric === metric.id}
            onClick={() => updateState({ sizeMetric: metric.id as any })}
            className={`
              px-3 py-1 rounded-md text-xs font-medium transition-all
              ${
                sizeMetric === metric.id
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }
            `}
          >
            {metric.label}
          </button>
        ))}
      </div>
    </div>
  );
};