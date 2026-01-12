// src/components/layout/PluginSelector.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { VisualizationPlugin } from '@/types/plugin';
import { ChevronDown, Check, LayoutGrid } from 'lucide-react';

interface PluginSelectorProps {
  plugins: VisualizationPlugin[];
}

export const PluginSelector: React.FC<PluginSelectorProps> = ({ plugins }) => {
  const { ui, setActivePlugin } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activePlugin = plugins.find(p => p.metadata.id === ui.activePluginId) || plugins[0];

  if (!activePlugin) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
          ${isOpen 
            ? 'bg-zinc-800 border-zinc-600 text-white' 
            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'}
        `}
        title="Select Visualization"
      >
        <LayoutGrid size={16} className="text-purple-500" />
        <span className="min-w-[140px] text-left">{activePlugin.metadata.name}</span>
        <ChevronDown 
          size={14} 
          className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
          {plugins.map((plugin) => (
            <button
              key={plugin.metadata.id}
              onClick={() => {
                setActivePlugin(plugin.metadata.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors
                ${ui.activePluginId === plugin.metadata.id
                  ? 'bg-purple-900/20 text-purple-300'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
              `}
            >
              <span>{plugin.metadata.name}</span>
              {ui.activePluginId === plugin.metadata.id && (
                <Check size={14} className="text-purple-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PluginSelector;
