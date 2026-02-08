// src/plugins/treemap-explorer/components/DebtView.tsx

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
        className={`flex items-center justify-between rounded-lg border p-3 ${getCategoryBg(healthScore.category)}`}
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
          <span className="font-mono text-sm text-zinc-200">
            {(healthScore.churnRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-800">
          <div
            className="h-2 rounded-full bg-amber-500 transition-all"
            style={{ width: `${healthScore.churnRate * 100}%` }}
          />
        </div>
      </div>

      {/* Bus Factor */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">Bus Factor</span>
        <span
          className={`rounded border px-2 py-1 text-xs font-semibold uppercase ${getRiskBadgeColor(
            healthScore.busFactor,
          )}`}
        >
          {healthScore.busFactor.replace("-", " ")}
        </span>
      </div>

      {/* Contributing Factors */}
      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-semibold uppercase text-zinc-400">
          Contributing Factors
        </h4>

        {/* Churn Factor */}
        {healthScore.factors?.churn && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Churn Impact</span>
              <span className="text-xs text-zinc-400">
                Weight:{" "}
                {((healthScore.factors.churn.weight || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-amber-500"
                  style={{ width: `${healthScore.factors.churn.score || 0}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-zinc-300">
                {(healthScore.factors.churn.score || 0).toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* Author Factor */}
        {healthScore.factors?.authors && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Author Diversity</span>
              <span className="text-xs text-zinc-400">
                Weight:{" "}
                {((healthScore.factors.authors.weight || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{
                    width: `${healthScore.factors.authors.score || 0}%`,
                  }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-zinc-300">
                {(healthScore.factors.authors.score || 0).toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* Age Factor */}
        {healthScore.factors?.age && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Age/Stability</span>
              <span className="text-xs text-zinc-400">
                Weight:{" "}
                {((healthScore.factors.age.weight || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-purple-500"
                  style={{ width: `${healthScore.factors.age.score || 0}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-zinc-300">
                {(healthScore.factors.age.score || 0).toFixed(0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* File Stats */}
      <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
        <div>
          <div className="mb-1 text-xs text-zinc-500">Total Commits</div>
          <div className="font-mono text-lg text-zinc-200">
            {file.total_commits}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-500">Contributors</div>
          <div className="font-mono text-lg text-zinc-200">
            {file.unique_authors}
          </div>
        </div>
      </div>

      {/* Operations Breakdown */}
      {file.operations && (
        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <h4 className="text-xs font-semibold uppercase text-zinc-400">
            Operations
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {file.operations.M !== undefined && (
              <div className="flex items-center justify-between pr-12">
                <span className="text-zinc-500">Modified</span>
                <span className="font-mono text-amber-400">
                  {file.operations.M}
                </span>
              </div>
            )}
            {file.operations.A !== undefined && (
              <div className="flex items-center justify-between pr-12">
                <span className="text-zinc-500">Added</span>
                <span className="font-mono text-green-400">
                  {file.operations.A}
                </span>
              </div>
            )}
            {file.operations.D !== undefined && (
              <div className="flex items-center justify-between pr-12">
                <span className="text-zinc-500">Deleted</span>
                <span className="font-mono text-red-400">
                  {file.operations.D}
                </span>
              </div>
            )}
            {file.operations.R !== undefined && (
              <div className="flex items-center justify-between pr-12">
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
