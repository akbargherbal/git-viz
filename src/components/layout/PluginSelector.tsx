// src/components/layout/PluginSelector.tsx

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/appStore';
import { VisualizationPlugin } from '@/types/plugin';
import { ChevronDown, Check, LayoutGrid } from 'lucide-react';

interface PluginSelectorProps {
  plugins: VisualizationPlugin[];
}

export const PluginSelector: React.FC<PluginSelectorProps> = ({ plugins }) => {
  const { ui, setActivePlugin } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if the click was inside the portal dropdown (which is not in containerRef)
        const dropdown = document.getElementById('plugin-selector-dropdown');
        if (dropdown && dropdown.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4, // 4px gap
        left: rect.left,
        width: Math.max(rect.width, 180) // Min width 180px
      });
    }
  }, [isOpen]);

  // Handle window resize/scroll to close dropdown (simpler than repositioning)
  useEffect(() => {
    const handleResize = () => setIsOpen(false);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true); // Capture phase for all scrolling elements
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
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

      {isOpen && createPortal(
        <div 
          id="plugin-selector-dropdown"
          className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default PluginSelector;