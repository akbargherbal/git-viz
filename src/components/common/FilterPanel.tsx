// src/components/common/FilterPanel.tsx
import React, { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { X, Filter, User, Folder, File, Tag, RotateCcw } from 'lucide-react';
import { FileEvent } from '@/types/domain';

interface FilterPanelProps {
  events: FileEvent[];
  onClose: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ events, onClose }) => {
  const { filters, toggleAuthor, toggleDirectory, toggleFileType, toggleEventType, clearFilters } = useAppStore();

  // Compute available options from data
  const options = useMemo(() => {
    const authors = new Map<string, number>();
    const directories = new Map<string, number>();
    const fileTypes = new Map<string, number>();
    const eventTypes = new Map<string, number>();

    events.forEach(e => {
      // Authors
      authors.set(e.author_name, (authors.get(e.author_name) || 0) + 1);
      
      // Directories (top level)
      const dir = e.file_path.split('/')[0];
      if (dir) directories.set(dir, (directories.get(dir) || 0) + 1);
      
      // File Types
      const ext = e.file_path.split('.').pop() || 'unknown';
      fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
      
      // Event Types
      eventTypes.set(e.status, (eventTypes.get(e.status) || 0) + 1);
    });

    return {
      authors: Array.from(authors.entries()).sort((a, b) => b[1] - a[1]),
      directories: Array.from(directories.entries()).sort((a, b) => b[1] - a[1]),
      fileTypes: Array.from(fileTypes.entries()).sort((a, b) => b[1] - a[1]),
      eventTypes: Array.from(eventTypes.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [events]);

  // Check if any filters are active
  const hasActiveFilters = 
    filters.authors.size > 0 ||
    filters.directories.size > 0 ||
    filters.fileTypes.size > 0 ||
    filters.eventTypes.size > 0;

  const FilterSection = ({ 
    title, 
    icon: Icon, 
    items, 
    selected, 
    onToggle 
  }: { 
    title: string; 
    icon: any; 
    items: [string, number][]; 
    selected: Set<string>; 
    onToggle: (id: string) => void; 
  }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 text-zinc-400 font-medium text-sm uppercase tracking-wider">
        <Icon size={14} />
        {title}
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {items.map(([item, count]) => (
          <label 
            key={item} 
            className={`
              flex items-center justify-between p-2 rounded cursor-pointer text-sm transition-colors
              ${selected.has(item) ? 'bg-purple-900/30 text-purple-200' : 'hover:bg-zinc-800 text-zinc-300'}
            `}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <input
                type="checkbox"
                checked={selected.has(item)}
                onChange={() => onToggle(item)}
                className="rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500/50"
              />
              <span className="truncate" title={item}>{item}</span>
            </div>
            <span className="text-xs text-zinc-500 font-mono">{count}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-purple-400" />
          <h2 className="font-bold text-white">Filters</h2>
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-medium">
              Active
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <FilterSection 
          title="Event Types" 
          icon={Tag} 
          items={options.eventTypes} 
          selected={filters.eventTypes} 
          onToggle={toggleEventType} 
        />
        
        <FilterSection 
          title="Directories" 
          icon={Folder} 
          items={options.directories} 
          selected={filters.directories} 
          onToggle={toggleDirectory} 
        />
        
        <FilterSection 
          title="File Types" 
          icon={File} 
          items={options.fileTypes} 
          selected={filters.fileTypes} 
          onToggle={toggleFileType} 
        />
        
        <FilterSection 
          title="Authors" 
          icon={User} 
          items={options.authors} 
          selected={filters.authors} 
          onToggle={toggleAuthor} 
        />
      </div>

      {/* QUICK WIN: Improved Reset Filters button */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className={`
            w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all
            flex items-center justify-center gap-2
            ${hasActiveFilters 
              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/50' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }
          `}
          title={hasActiveFilters ? 'Reset all filters' : 'No active filters'}
        >
          <RotateCcw size={16} />
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;