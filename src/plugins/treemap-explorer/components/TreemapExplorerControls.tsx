// src/plugins/treemap-explorer/components/TreemapExplorerControls.tsx

import React from 'react';
import { PluginControlProps } from '@/types/plugin';
import { LensModeSelector } from './LensModeSelector';
import { TreemapExplorerState } from '../types';

/**
 * Header controls for Treemap Explorer
 * Renders inline controls: Lens Mode buttons + Size Metric selector
 */
export const TreemapExplorerControls: React.FC<PluginControlProps<TreemapExplorerState>> = ({
  state,
  updateState
}) => {
  const { lensMode, sizeMetric } = state;

  const sizeMetrics = [
    { id: 'commits', label: 'Commits' },
    { id: 'authors', label: 'Authors' },
    { id: 'events', label: 'Events' }
  ];

  return (
    <>
      {/* Lens Mode Selector */}
      <LensModeSelector
        currentLens={lensMode}
        onLensChange={(lens) => updateState({ lensMode: lens })}
      />

      {/* Size Metric Selector */}
      <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
        {sizeMetrics.map(metric => (
          <button
            key={metric.id}
            onClick={() => updateState({ sizeMetric: metric.id as any })}
            className={`
              px-3 py-1 rounded-md text-xs font-medium transition-all
              ${sizeMetric === metric.id
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            {metric.label}
          </button>
        ))}
      </div>
    </>
  );
};
