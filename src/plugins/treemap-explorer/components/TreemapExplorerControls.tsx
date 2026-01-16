// src/plugins/treemap-explorer/components/TreemapExplorerControls.tsx

import React from 'react';
import { PluginControlProps } from '@/types/plugin';
import { TreemapExplorerState } from '../TreemapExplorerPlugin';
import { LensModeSelector } from './LensModeSelector';

export const TreemapExplorerControls: React.FC<PluginControlProps> = ({
  state,
  updateState,
}) => {
  const pluginState = state as TreemapExplorerState;

  const handleLensChange = (lens: 'debt' | 'coupling' | 'time') => {
    updateState({ lensMode: lens });
  };

  const handleSizeMetricChange = (metric: 'commits' | 'authors' | 'events') => {
    updateState({ sizeMetric: metric });
  };

  const sizeMetrics = [
    { id: 'commits', label: 'Commits' },
    { id: 'authors', label: 'Authors' },
    { id: 'events', label: 'Events' }
  ];

  return (
    <div className="flex items-center gap-4">
      {/* Lens Mode Selector */}
      <LensModeSelector
        currentLens={pluginState.lensMode}
        onLensChange={handleLensChange}
      />

      <div className="h-6 w-px bg-zinc-700" />

      {/* Size Metric Selector */}
      <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
        {sizeMetrics.map((metric) => (
          <button
            key={metric.id}
            onClick={() => handleSizeMetricChange(metric.id as 'commits' | 'authors' | 'events')}
            className={`
              px-3 py-1 rounded-md text-xs font-medium transition-all
              ${pluginState.sizeMetric === metric.id
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
            title={`Size cells by ${metric.label.toLowerCase()}`}
          >
            {metric.label}
          </button>
        ))}
      </div>
    </div>
  );
};