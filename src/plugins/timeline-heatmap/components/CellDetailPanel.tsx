// src/plugins/timeline-heatmap/components/CellDetailPanel.tsx

import React from 'react';
import { X, Calendar, Folder, GitCommit, User, FilePlus, FileMinus, FileEdit } from 'lucide-react';
import { format } from 'date-fns';
// Note: We use the HeatmapCell definition from the plugin, or a compatible shape
import { HeatmapCell } from '../../TimelineHeatmapPlugin'; 

interface CellDetailPanelProps {
  cell: HeatmapCell;
  onClose: () => void;
}

export const CellDetailPanel: React.FC<CellDetailPanelProps> = ({ cell, onClose }) => {
  // Calculate percentages for the bar chart
  const totalChanges = cell.creations + cell.deletions + cell.modifications;
  const pCreate = totalChanges ? (cell.creations / totalChanges) * 100 : 0;
  const pDelete = totalChanges ? (cell.deletions / totalChanges) * 100 : 0;
  const pMod = totalChanges ? (cell.modifications / totalChanges) * 100 : 0;

  return (
    <div className="absolute top-4 right-4 w-80 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in slide-in-from-right-10 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-start">
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <Folder size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Directory Detail</span>
          </div>
          <h3 className="text-sm font-bold text-white break-all leading-tight font-mono" title={cell.directory}>
            {cell.directory.split('/').pop()}
          </h3>
          <div className="text-xs text-zinc-500 truncate">{cell.directory}</div>
        </div>
        <button 
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-px bg-zinc-800 border-b border-zinc-800">
        <div className="bg-zinc-900 p-4 flex flex-col items-center justify-center text-center">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Events</div>
          <div className="text-2xl font-bold text-white">{cell.events}</div>
        </div>
        <div className="bg-zinc-900 p-4 flex flex-col items-center justify-center text-center">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Authors</div>
          <div className="text-2xl font-bold text-white">{cell.authors}</div>
        </div>
      </div>

      {/* Activity Breakdown Chart */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800">
        <div className="text-xs text-zinc-400 mb-3 font-medium">Activity Composition</div>
        
        {/* Visual Bar */}
        <div className="h-4 w-full flex rounded-full overflow-hidden mb-3 bg-zinc-800">
          {pCreate > 0 && <div style={{ width: `${pCreate}%` }} className="bg-green-500" />}
          {pMod > 0 && <div style={{ width: `${pMod}%` }} className="bg-blue-500" />}
          {pDelete > 0 && <div style={{ width: `${pDelete}%` }} className="bg-red-500" />}
        </div>

        {/* Legend / Stats */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <FilePlus size={12} className="text-green-500" /> Created
            </div>
            <span className="font-mono">{cell.creations}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <FileEdit size={12} className="text-blue-500" /> Modified
            </div>
            <span className="font-mono">{cell.modifications}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <FileMinus size={12} className="text-red-500" /> Deleted
            </div>
            <span className="font-mono">{cell.deletions}</span>
          </div>
        </div>
      </div>

      {/* Context Info */}
      <div className="p-4 bg-zinc-900 text-xs text-zinc-500 space-y-2">
        <div className="flex items-center gap-2">
          <Calendar size={12} />
          <span>Period: {format(new Date(cell.timeBin), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2">
          <GitCommit size={12} />
          <span>Commits: {cell.commits}</span>
        </div>
      </div>

      {/* Note about raw events */}
      <div className="p-3 bg-zinc-950 text-[10px] text-zinc-600 text-center border-t border-zinc-800">
        * Detailed event logs are aggregated for performance
      </div>
    </div>
  );
};

export default CellDetailPanel;