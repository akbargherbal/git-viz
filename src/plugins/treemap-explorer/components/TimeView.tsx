// FILE: src/plugins/treemap-explorer/components/TimeView.tsx
import React from 'react';
import { TemporalFileData } from '../types';

interface TimeViewProps {
  file: TemporalFileData;
}

export const TimeView: React.FC<TimeViewProps> = ({ file }) => {
  // Format dates
  const firstSeenDate = new Date(file.createdDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const lastModifiedDate = new Date(file.lastModifiedDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate current dormancy (days since last modification)
  const daysSinceModified = Math.floor(
    (new Date().getTime() - new Date(file.lastModifiedDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const getLifecycleColor = (isDormant: boolean) => {
    return isDormant
      ? 'bg-zinc-950/50 border-zinc-800'
      : 'bg-blue-950/50 border-blue-900/50';
  };

  const getLifecycleIcon = (isDormant: boolean) => {
    return isDormant ? '🔒' : '⚡';
  };

  const getLifecycleText = (isDormant: boolean) => {
    return isDormant ? 'Dormant' : 'Active';
  };

  return (
    <div className="space-y-4">
      {/* Lifecycle Status Badge */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${getLifecycleColor(file.isDormant)}`}>
        <span className="text-xs text-zinc-400">Lifecycle Status</span>
        <span className="text-sm font-bold flex items-center gap-2">
          <span>{getLifecycleIcon(file.isDormant)}</span>
          <span>{getLifecycleText(file.isDormant)}</span>
        </span>
      </div>

      {/* Key Dates Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900/50 p-3 rounded-lg">
          <div className="text-xs text-zinc-500 mb-1">Created</div>
          <div className="text-sm font-mono text-zinc-200">{firstSeenDate}</div>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-lg">
          <div className="text-xs text-zinc-500 mb-1">Last Modified</div>
          <div className="text-sm font-mono text-zinc-200">{lastModifiedDate}</div>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-lg">
          <div className="text-xs text-zinc-500 mb-1">Age</div>
          <div className="text-sm font-mono text-zinc-200">
            {file.ageDays} days
          </div>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-lg">
          <div className="text-xs text-zinc-500 mb-1">Dormant Period</div>
          <div className={`text-sm font-mono ${file.isDormant ? 'text-red-400' : 'text-green-400'}`}>
            {daysSinceModified} days
          </div>
        </div>
      </div>

      {/* Activity Timeline Sparkline */}
      {file.activityTimeline && file.activityTimeline.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase">Activity Timeline</h4>
          <div className="h-16 bg-zinc-900/50 rounded-lg p-2">
            {/* Simple sparkline visualization */}
            <div className="flex items-end justify-between h-full gap-0.5">
              {file.activityTimeline.map((point, i) => {
                const maxCommits = Math.max(...file.activityTimeline!.map((p) => p.commits));
                const height = (point.commits / maxCommits) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500/50 rounded-sm"
                    style={{ height: `${height}%` }}
                    title={`${point.date}: ${point.commits} commits`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activity Metrics */}
      <div className="space-y-3 pt-4 border-t border-zinc-800">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase">Activity Metrics</h4>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Total Commits</span>
          <span className="text-sm font-mono text-zinc-200">{file.totalCommits}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Unique Authors</span>
          <span className="text-sm font-mono text-zinc-200">{file.uniqueAuthors}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Commits per Day</span>
          <span className="text-sm font-mono text-zinc-200">
            {file.ageDays > 0 ? (file.totalCommits / file.ageDays).toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Lifecycle Insights */}
      <div className="space-y-2 pt-4 border-t border-zinc-800">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase">Lifecycle Insights</h4>
        <div className="text-sm text-zinc-400 space-y-2">
          {file.isDormant ? (
            <>
              <p>
                ⚠️ This file has been <span className="text-red-400 font-semibold">dormant</span> for{' '}
                {daysSinceModified} days (no modifications in 180+ days).
              </p>
              <p className="text-xs">
                Consider reviewing if this code is still needed or if it should be archived.
              </p>
            </>
          ) : (
            <>
              <p>
                ✓ This file is <span className="text-green-400 font-semibold">actively maintained</span>{' '}
                (modified within the last 180 days).
              </p>
              <p className="text-xs">Last activity: {daysSinceModified} days ago</p>
            </>
          )}
        </div>
      </div>

      {/* Operations Breakdown */}
      {file.operations && (
        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase">Operations</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {file.operations.M !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Modified</span>
                <span className="text-sm font-mono text-amber-400">{file.operations.M}</span>
              </div>
            )}
            {file.operations.A !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Added</span>
                <span className="text-sm font-mono text-green-400">{file.operations.A}</span>
              </div>
            )}
            {file.operations.D !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Deleted</span>
                <span className="text-sm font-mono text-red-400">{file.operations.D}</span>
              </div>
            )}
            {file.operations.R !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Renamed</span>
                <span className="text-sm font-mono text-blue-400">{file.operations.R}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeView;