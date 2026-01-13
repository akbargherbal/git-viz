// src/components/common/FilterPanel.tsx
import React, { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { X, Filter, User, File, RotateCcw } from 'lucide-react'; // Removed unused icons
import { RepoMetadata } from '@/types/domain';

interface FilterPanelProps {
  metadata: RepoMetadata | null;
  onClose: () => void;
}

interface FilterSectionProps {
  title: string;
  icon: any;
  items: { label: string; count: number }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title, 
  icon: Icon, 
  items, 
  selected, 
  onToggle 
}) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3 text-zinc-400 font-medium text-sm uppercase tracking-wider">
      <Icon size={14} />
      {title}
    </div>
    <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
      {items.map(({ label, count }) => (
        <label 
          key={label} 
          className={`
            flex items-center justify-between p-2 rounded cursor-pointer text-sm transition-colors
            ${selected.has(label) ? 'bg-purple-900/30 text-purple-200' : 'hover:bg-zinc-800 text-zinc-300'}
          `}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <input
              type="checkbox"
              checked={selected.has(label)}
              onChange={() => onToggle(label)}
              className="rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500/50"
            />
            <span className="truncate" title={label}>{label}</span>
          </div>
          <span className="text-xs text-zinc-500 font-mono">{count.toLocaleString()}</span>
        </label>
      ))}
    </div>
  </div>
);

export const FilterPanel: React.FC<FilterPanelProps> = ({ metadata, onClose }) => {
  // REMOVED: toggleDirectory, toggleEventType (unused)
  const { filters, toggleAuthor, toggleFileType, clearFilters } = useAppStore();

  // Memoize and aggregate data to ensure uniqueness and performance
  const { authorItems, fileTypeItems } = useMemo(() => {
    if (!metadata) return { authorItems: [], fileTypeItems: [] };

    // Aggregate authors by name to handle duplicates (same name, different emails)
    const authorMap = new Map<string, number>();
    metadata.authors.forEach(a => {
      const current = authorMap.get(a.name) || 0;
      authorMap.set(a.name, current + a.commit_count);
    });

    const aggregatedAuthors = Array.from(authorMap.entries())
      .map(([name, count]) => ({ label: name, count }))
      .sort((a, b) => b.count - a.count);

    const fileTypes = metadata.file_types.map(f => ({ label: f.extension, count: f.count }));

    return { authorItems: aggregatedAuthors, fileTypeItems: fileTypes };
  }, [metadata]);

  if (!metadata) return null;

  // Check if any filters are active
  const hasActiveFilters = 
    filters.authors.size > 0 ||
    filters.directories.size > 0 ||
    filters.fileTypes.size > 0 ||
    filters.eventTypes.size > 0;
  
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
          title="Authors" 
          icon={User} 
          items={authorItems} 
          selected={filters.authors} 
          onToggle={toggleAuthor} 
        />
        
        <FilterSection 
          title="File Types" 
          icon={File} 
          items={fileTypeItems} 
          selected={filters.fileTypes} 
          onToggle={toggleFileType} 
        />
      </div>

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
        >
          <RotateCcw size={16} />
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;