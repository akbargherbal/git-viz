// FILE: src/plugins/treemap-explorer/components/DebtView.tsx
import React from "react";
import { EnrichedFileData } from "../types";

interface DebtViewProps {
  file: EnrichedFileData;
}

export const DebtView: React.FC<DebtViewProps> = ({ file }) => {
  const healthScore = file.healthScore;

  if (!healthScore) {
    return (
      <div className="text-sm text-zinc-500">
        Health score not available for this file.
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "healthy":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-zinc-500";
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case "healthy":
        return "bg-green-950/50 border-green-900/50";
      case "medium":
        return "bg-yellow-950/50 border-yellow-900/50";
      case "critical":
        return "bg-red-950/50 border-red-900/50";
      default:
        return "bg-zinc-950/50 border-zinc-800";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "low-risk":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium-risk":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "high-risk":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="space-y-4">
      {/* Health Score Badge */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg border ${getCategoryBg(healthScore.category)}`}
      >
        <span className="text-xs text-zinc-400">Health Score</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-2xl font-bold ${getCategoryColor(healthScore.category)}`}
          >
            {healthScore.score}
          </span>
          <span className="text-xs text-zinc-500">/ 100</span>
        </div>
      </div>

      {/* Category Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">Category</span>
        <span
          className={`text-sm font-semibold uppercase ${getCategoryColor(healthScore.category)}`}
        >
          {healthScore.category}
        </span>
      </div>

      {/* Churn Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Churn Rate</span>
          <span className="text-sm font-mono text-zinc-200">
            {(healthScore.churnRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${healthScore.churnRate * 100}%` }}
          />
        </div>
      </div>

      {/* Bus Factor */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">Bus Factor</span>
        <span
          className={`text-xs font-semibold uppercase px-2 py-1 rounded border ${getRiskBadgeColor(
            healthScore.busFactor,
          )}`}
        >
          {healthScore.busFactor.replace("-", " ")}
        </span>
      </div>

      {/* Contributing Factors */}
      <div className="space-y-3 pt-4 border-t border-zinc-800">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase">
          Contributing Factors
        </h4>

        {/* Churn Factor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Churn Impact</span>
            <span className="text-xs text-zinc-400">
              Weight: {(healthScore.factors.churn.weight * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-amber-500 h-1.5 rounded-full"
                style={{ width: `${healthScore.factors.churn.score}%` }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-300 w-12 text-right">
              {healthScore.factors.churn.score.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Author Factor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Author Diversity</span>
            <span className="text-xs text-zinc-400">
              Weight: {(healthScore.factors.authors.weight * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${healthScore.factors.authors.score}%` }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-300 w-12 text-right">
              {healthScore.factors.authors.score.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Age Factor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Age/Stability</span>
            <span className="text-xs text-zinc-400">
              Weight: {(healthScore.factors.age.weight * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full"
                style={{ width: `${healthScore.factors.age.score}%` }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-300 w-12 text-right">
              {healthScore.factors.age.score.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* File Stats */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Total Commits</div>
          <div className="text-lg font-mono text-zinc-200">
            {file.total_commits}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Contributors</div>
          <div className="text-lg font-mono text-zinc-200">
            {file.unique_authors}
          </div>
        </div>
      </div>

      {/* Operations Breakdown */}
      {file.operations && (
        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase">
            Operations
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {file.operations.M !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Modified</span>
                <span className="font-mono text-amber-400">
                  {file.operations.M}
                </span>
              </div>
            )}
            {file.operations.A !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Added</span>
                <span className="font-mono text-green-400">
                  {file.operations.A}
                </span>
              </div>
            )}
            {file.operations.D !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Deleted</span>
                <span className="font-mono text-red-400">
                  {file.operations.D}
                </span>
              </div>
            )}
            {file.operations.R !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Renamed</span>
                <span className="font-mono text-blue-400">
                  {file.operations.R}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtView;
