// src/components/layout/PluginSelector.tsx

import React from 'react';
import { useAppStore } from '@/store/appStore';
import { VisualizationPlugin } from '@/types/plugin';

interface PluginSelectorProps {
  plugins: VisualizationPlugin[];
}

export const PluginSelector: React.FC<PluginSelectorProps> = ({ plugins }) => {
  const { ui, setActivePlugin } = useAppStore();
  
  return (
    <div className="flex gap-2">
      {plugins.map((plugin) => (
        <button
          key={plugin.metadata.id}
          onClick={() => setActivePlugin(plugin.metadata.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            ui.activePluginId === plugin.metadata.id
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          {plugin.metadata.name}
        </button>
      ))}
    </div>
  );
};

export default PluginSelector;
