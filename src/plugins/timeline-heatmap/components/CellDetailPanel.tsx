// src/plugins/timeline-heatmap/components/CellDetailPanel.tsx
import React from 'react';
import { X, Calendar, Folder, GitCommit, User } from 'lucide-react';
import { HeatmapCell } from '@/types/visualization';
import { format } from 'date-fns';

interface CellDetailPanelProps {
  cell: HeatmapCell;
  onClose: () => void;
}

export const CellDetailPanel: React.FC<CellDetailPanelProps> = ({ cell, onClose }) => {
  return (
    <div className="absolute top-4 right-4 w-96 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <Folder size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Directory</span>
          </div>
          <h3 className="text-lg font-bold text-white break-all leading-tight">
            {cell.directory}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded"
        >
          <X size={20} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-px bg-zinc-800 border-b border-zinc-800">
        <div className="bg-zinc-900 p-3">
          <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
            <Calendar size={12} /> Time Period
          </div>
          <div className="font-mono text-sm text-zinc-200">{cell.timeBin}</div>
        </div>
        <div className="bg-zinc-900 p-3">
          <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
            <GitCommit size={12} /> Events
          </div>
          <div className="font-mono text-sm text-zinc-200">{cell.value}</div>
        </div>
        <div className="bg-zinc-900 p-3">
          <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
            <User size={12} /> Contributors
          </div>
          <div className="font-mono text-sm text-zinc-200">{cell.uniqueAuthors.size}</div>
        </div>
        <div className="bg-zinc-900 p-3">
          <div className="text-zinc-500 text-xs mb-1">Activity Breakdown</div>
          <div className="flex gap-2 text-xs">
            <span className="text-green-400">+{cell.creations}</span>
            <span className="text-red-400">-{cell.deletions}</span>
            <span className="text-blue-400">~{cell.modifications}</span>
          </div>
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-0">
        <div className="px-4 py-2 bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider sticky top-0 backdrop-blur border-b border-zinc-800">
          Recent Events
        </div>
        <div className="divide-y divide-zinc-800">
          {cell.events.slice(0, 20).map((event, i) => (
            <div key={i} className="p-3 hover:bg-zinc-800/50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded uppercase font-bold
                  ${event.status === 'added' ? 'bg-green-900/30 text-green-400' : 
                    event.status === 'deleted' ? 'bg-red-900/30 text-red-400' : 
                    'bg-blue-900/30 text-blue-400'}
                `}>
                  {event.status}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {format(event.commit_datetime, 'MMM d, HH:mm')}
                </span>
              </div>
              <div className="text-sm text-zinc-300 mb-1 line-clamp-2" title={event.commit_subject}>
                {event.commit_subject}
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  <User size={10} />
                  {event.author_name}
                </div>
                <div className="text-[10px] font-mono text-zinc-600" title={event.file_path}>
                  {event.file_path.split('/').pop()}
                </div>
              </div>
            </div>
          ))}
          {cell.events.length > 20 && (
            <div className="p-3 text-center text-xs text-zinc-500 italic">
              + {cell.events.length - 20} more events
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CellDetailPanel;