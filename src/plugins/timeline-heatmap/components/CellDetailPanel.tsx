// src/plugins/timeline-heatmap/components/CellDetailPanel.tsx

import React, { useMemo } from "react";
import {
  X,
  Calendar,
  GitCommit,
  User,
  FileText,
  TrendingUp,
  Crown,
} from "lucide-react";
import { format } from "date-fns";
import { useAppStore } from "@/store/appStore";
import { HeatmapCell } from "../TimelineHeatmapPlugin";
import { formatNumber } from "@/utils/formatting";

interface CellDetailPanelProps {
  cell: HeatmapCell;
  onClose: () => void;
}

export const CellDetailPanel: React.FC<CellDetailPanelProps> = ({
  cell,
  onClose,
}) => {
  const { data, filters } = useAppStore();
  const { metric } = filters;
  const metadata = data.metadata;

  // Calculate percentages for the bar chart
  const totalChanges = cell.creations + cell.deletions + cell.modifications;
  const pCreate = totalChanges ? (cell.creations / totalChanges) * 100 : 0;
  const pDelete = totalChanges ? (cell.deletions / totalChanges) * 100 : 0;
  const pMod = totalChanges ? (cell.modifications / totalChanges) * 100 : 0;

  // 🔧 FIX: Memoize directory name to prevent recalculation on every render
  // This resolves the latency issue when switching between tabs (Events ↔ Author)
  const directoryName = useMemo(() => {
    return cell.directory.split("/").pop() || cell.directory;
  }, [cell.directory]);

  // Get Lifetime Stats for this directory
  const lifetimeStats = useMemo(() => {
    return metadata?.directory_stats?.find((d) => d.path === cell.directory);
  }, [metadata, cell.directory]);

  // Get File Stats for top files
  const enrichedFiles = useMemo(() => {
    if (!cell.topFiles || !metadata?.file_stats) return [];

    return cell.topFiles.map((filename: string) => {
      const fullPath = cell.directory
        ? `${cell.directory}/${filename}`
        : filename;
      const stats = metadata.file_stats?.[fullPath];
      return {
        name: filename,
        stats,
      };
    });
  }, [cell.topFiles, cell.directory, metadata]);

  // Fixed Header Config - Always "Commit Activity"
  const headerConfig = {
    icon: GitCommit,
    color: "text-blue-400",
    label: "Commit Activity",
    primaryValue: cell.commits,
    primaryLabel: "Commits",
  };

  const HeaderIcon = headerConfig.icon;

  return (
    <div
      className="animate-in slide-in-from-right-10 sleek-scrollbar absolute right-0 top-0 z-50 flex max-h-[calc(100vh-2rem)] w-80 flex-col overflow-hidden overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900/95 pb-8 shadow-2xl backdrop-blur duration-200"
      data-testid="cell-detail-panel"
      data-metric={metric}
      data-directory={directoryName}
      data-directory-path={cell.directory}
      data-total-events={cell.events}
      data-authors={cell.authors}
      data-commits={cell.commits}
      data-has-lifetime-stats={!!lifetimeStats}
      data-has-data={true}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-800 bg-zinc-950/50 p-4 backdrop-blur-md">
        <div className="overflow-hidden">
          <div className={`flex items-center gap-2 ${headerConfig.color} mb-1`}>
            <HeaderIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {headerConfig.label}
            </span>
          </div>
          <h3
            className="break-all font-mono text-sm font-bold leading-tight text-white"
            title={cell.directory}
          >
            {directoryName}
          </h3>
          <div className="truncate text-xs text-zinc-500">{cell.directory}</div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-px border-b border-zinc-800 bg-zinc-800">
        <div className="flex flex-col items-center justify-center bg-zinc-900 p-4 text-center">
          <div
            className={`text-2xl font-bold ${headerConfig.color.replace("text-", "text-")}`}
          >
            {formatNumber(headerConfig.primaryValue)}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
            {headerConfig.primaryLabel}
          </div>
        </div>

        {/* Secondary Stat - Authors */}
        <div className="flex flex-col items-center justify-center bg-zinc-900 p-4 text-center">
          <div className="text-2xl font-bold text-white">{cell.authors}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Authors
          </div>
        </div>
      </div>

      {/* Lifetime Context (New V2 Feature) */}
      {lifetimeStats && (
        <div className="border-b border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
            <TrendingUp size={12} />
            <span>All-Time Directory Stats</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-zinc-800/50 bg-zinc-950 p-2">
              <div className="text-[10px] text-zinc-500">Activity Score</div>
              <div className="font-mono text-sm text-zinc-300">
                {lifetimeStats.activity_score.toFixed(1)}
              </div>
            </div>
            <div className="rounded border border-zinc-800/50 bg-zinc-950 p-2">
              <div className="text-[10px] text-zinc-500">Total Commits</div>
              <div className="font-mono text-sm text-zinc-300">
                {formatNumber(lifetimeStats.total_commits)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Breakdown Chart (Always useful) */}
      <div className="border-b border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3 text-xs font-medium text-zinc-400">
          Event Composition
        </div>

        <div className="mb-3 flex h-4 w-full overflow-hidden rounded-full bg-zinc-800">
          {pCreate > 0 && (
            <div style={{ width: `${pCreate}%` }} className="bg-green-500" />
          )}
          {pMod > 0 && (
            <div style={{ width: `${pMod}%` }} className="bg-blue-500" />
          )}
          {pDelete > 0 && (
            <div style={{ width: `${pDelete}%` }} className="bg-red-500" />
          )}
        </div>

        <div className="flex justify-between px-1 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" /> +
            {cell.creations}
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" /> ~
            {cell.modifications}
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" /> -
            {cell.deletions}
          </span>
        </div>
      </div>

      {/* Top Contributors */}
      {cell.topContributors && cell.topContributors.length > 0 && (
        <div className="border-b border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
            <User size={12} />
            Top Contributors
          </div>
          <div className="space-y-1.5">
            {cell.topContributors.map((author: string, idx: number) => (
              <div
                key={idx}
                className="truncate border-l-2 border-zinc-700 pl-3 text-xs text-zinc-300 transition-colors hover:border-orange-500"
              >
                {author}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Files - Enhanced with V2 Data */}
      {enrichedFiles.length > 0 && (
        <div className="border-b border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
            <FileText size={12} /> Most Active Files
          </div>
          <div className="space-y-2">
            {enrichedFiles.map((file: any, idx: number) => (
              <div key={idx} className="group">
                <div
                  className="truncate border-l-2 border-zinc-700 pl-3 font-mono text-xs text-zinc-300 transition-colors group-hover:border-purple-500"
                  title={file.name}
                >
                  {file.name}
                </div>
                {/* V2 Enhancement: Primary Author */}
                {file.stats?.primary_author && (
                  <div className="mt-0.5 flex items-center gap-1.5 pl-3.5 text-[10px] text-zinc-500">
                    <Crown size={8} className="text-yellow-600" />
                    <span className="max-w-[180px] truncate">
                      {file.stats.primary_author.email.split("@")[0]}
                    </span>
                    <span className="text-zinc-600">
                      ({Math.round(file.stats.primary_author.percentage)}%)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Info */}
      <div className="space-y-2 bg-zinc-900 p-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Calendar size={12} />
          <span>Period: {format(new Date(cell.timeBin), "MMM d, yyyy")}</span>
        </div>
      </div>
    </div>
  );
};

export default CellDetailPanel;
