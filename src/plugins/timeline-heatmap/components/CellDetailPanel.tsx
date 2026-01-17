// src/plugins/timeline-heatmap/components/CellDetailPanel.tsx

import React, { useMemo } from "react";
import {
  X,
  Calendar,
  GitCommit,
  User,
  FileText,
  Activity,
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

  // Contextual Header Config
  const headerConfig = useMemo(() => {
    switch (metric) {
      case "authors":
        return {
          icon: User,
          color: "text-orange-400",
          label: "Author Activity",
          primaryValue: cell.authors,
          primaryLabel: "Active Authors",
        };
      case "commits":
        return {
          icon: GitCommit,
          color: "text-blue-400",
          label: "Commit Activity",
          primaryValue: cell.commits,
          primaryLabel: "Commits",
        };
      case "events":
      default:
        return {
          icon: Activity,
          color: "text-purple-400",
          label: "File Events",
          primaryValue: cell.events,
          primaryLabel: "Total Events",
        };
    }
  }, [metric, cell]);

  const HeaderIcon = headerConfig.icon;

  return (
    <div className="absolute top-0 right-0 w-80 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in slide-in-from-right-10 duration-200 max-h-[calc(100vh-2rem)] overflow-y-auto sleek-scrollbar pb-8">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-start sticky top-0 z-10 backdrop-blur-md">
        <div className="overflow-hidden">
          <div className={`flex items-center gap-2 ${headerConfig.color} mb-1`}>
            <HeaderIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {headerConfig.label}
            </span>
          </div>
          <h3
            className="text-sm font-bold text-white break-all leading-tight font-mono"
            title={cell.directory}
          >
            {directoryName}
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

      {/* Primary Stats - Context Aware */}
      <div className="grid grid-cols-2 gap-px bg-zinc-800 border-b border-zinc-800">
        <div className="bg-zinc-900 p-4 flex flex-col items-center justify-center text-center">
          <div
            className={`text-2xl font-bold ${headerConfig.color.replace("text-", "text-")}`}
          >
            {formatNumber(headerConfig.primaryValue)}
          </div>
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">
            {headerConfig.primaryLabel}
          </div>
        </div>

        {/* Secondary Stat depends on context */}
        <div className="bg-zinc-900 p-4 flex flex-col items-center justify-center text-center">
          {metric === "authors" ? (
            <>
              <div className="text-2xl font-bold text-white">
                {formatNumber(cell.commits)}
              </div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">
                Commits
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-white">
                {cell.authors}
              </div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">
                Authors
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lifetime Context (New V2 Feature) */}
      {lifetimeStats && (
        <div className="p-3 bg-zinc-900/50 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2 font-medium">
            <TrendingUp size={12} />
            <span>All-Time Directory Stats</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-950 rounded p-2 border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500">Activity Score</div>
              <div className="text-sm font-mono text-zinc-300">
                {lifetimeStats.activity_score.toFixed(1)}
              </div>
            </div>
            <div className="bg-zinc-950 rounded p-2 border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500">Total Commits</div>
              <div className="text-sm font-mono text-zinc-300">
                {formatNumber(lifetimeStats.total_commits)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Breakdown Chart (Always useful) */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800">
        <div className="text-xs text-zinc-400 mb-3 font-medium">
          Event Composition
        </div>

        <div className="h-4 w-full flex rounded-full overflow-hidden mb-3 bg-zinc-800">
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

        <div className="flex justify-between text-[10px] text-zinc-400 px-1">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" /> +
            {cell.creations}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" /> ~
            {cell.modifications}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /> -
            {cell.deletions}
          </span>
        </div>
      </div>

      {/* Top Contributors */}
      {cell.topContributors && cell.topContributors.length > 0 && (
        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <div className="text-xs text-zinc-400 mb-2 font-medium flex items-center gap-2">
            <User size={12} />
            {metric === "authors" ? "Active Contributors" : "Top Contributors"}
          </div>
          <div className="space-y-1.5">
            {cell.topContributors.map((author: string, idx: number) => (
              <div
                key={idx}
                className="text-xs text-zinc-300 truncate pl-3 border-l-2 border-zinc-700 hover:border-orange-500 transition-colors"
              >
                {author}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Files - Enhanced with V2 Data */}
      {enrichedFiles.length > 0 && (
        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <div className="text-xs text-zinc-400 mb-2 font-medium flex items-center gap-2">
            <FileText size={12} /> Most Active Files
          </div>
          <div className="space-y-2">
            {enrichedFiles.map((file: any, idx: number) => (
              <div key={idx} className="group">
                <div
                  className="text-xs text-zinc-300 truncate pl-3 border-l-2 border-zinc-700 font-mono group-hover:border-purple-500 transition-colors"
                  title={file.name}
                >
                  {file.name}
                </div>
                {/* V2 Enhancement: Primary Author */}
                {file.stats?.primary_author && (
                  <div className="pl-3.5 mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <Crown size={8} className="text-yellow-600" />
                    <span className="truncate max-w-[180px]">
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
      <div className="p-4 bg-zinc-900 text-xs text-zinc-500 space-y-2">
        <div className="flex items-center gap-2">
          <Calendar size={12} />
          <span>Period: {format(new Date(cell.timeBin), "MMM d, yyyy")}</span>
        </div>
      </div>
    </div>
  );
};

export default CellDetailPanel;
