// src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx

import React from 'react';
import { X, AlertTriangle, Users, Calendar, Activity } from 'lucide-react';
import { EnrichedFileData } from '../TreemapExplorerPlugin';
import { HealthScoreCalculator } from '@/services/data/HealthScoreCalculator';

interface TreemapDetailPanelProps {
  file: EnrichedFileData | null;
  lensMode: 'debt' | 'coupling' | 'time';
  onClose: () => void;
}

export const TreemapDetailPanel: React.FC<TreemapDetailPanelProps> = ({
  file,
  lensMode,
  onClose
}) => {
  if (!file) return null;

  return (
    <aside className="w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-mono text-sm font-bold text-white truncate" title={file.name}>
            {file.name}
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5" title={file.path}>
            {file.path}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
          aria-label="Close detail panel"
        >
          <X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
        </button>
      </div>

      {/* Lens-specific content */}
      <div className="flex-1 overflow-y-auto p-4">
        {lensMode === 'debt' && <DebtView file={file} />}
        {lensMode === 'coupling' && <CouplingView file={file} />}
        {lensMode === 'time' && <TimeView file={file} />}
      </div>
    </aside>
  );
};

/* ==================== DEBT VIEW ==================== */

const DebtView: React.FC<{ file: EnrichedFileData }> = ({ file }) => {
  const healthScore = file.healthScore;
  
  if (!healthScore) {
    return (
      <div className="text-zinc-400 text-sm">
        Health score data not available
      </div>
    );
  }

  const { score, category, churnRate, busFactor, factors } = healthScore;
  const insight = HealthScoreCalculator.getInsight(healthScore);

  return (
    <div className="space-y-6">
      {/* Health Score Badge */}
      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            Health Score
          </span>
          <span className={`
            text-xs font-bold px-2 py-0.5 rounded
            ${category === 'critical' ? 'bg-red-900/30 text-red-400' : 
              category === 'medium' ? 'bg-yellow-900/30 text-yellow-400' : 
              'bg-green-900/30 text-green-400'}
          `}>
            {category.toUpperCase()}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums" style={{ 
            color: HealthScoreCalculator.getHealthColor(score)
          }}>
            {score}
          </span>
          <span className="text-zinc-500 text-sm">/100</span>
        </div>
        {category === 'critical' && (
          <div className="mt-3 flex items-start gap-2 bg-red-950/30 border border-red-900/50 rounded p-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-red-300">
              Requires immediate attention
            </span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          Key Metrics
        </h4>
        
        {/* Churn Rate */}
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="Churn Rate"
          value={`${Math.round(churnRate * 100)}%`}
          sublabel={churnRate > 0.7 ? 'High instability' : churnRate > 0.5 ? 'Moderate' : 'Stable'}
          score={factors.churn.score}
          color={factors.churn.score < 40 ? 'red' : factors.churn.score < 70 ? 'yellow' : 'green'}
        />

        {/* Bus Factor */}
        <MetricCard
          icon={<Users className="w-4 h-4" />}
          label="Active Authors"
          value={String(file.uniqueAuthors)}
          sublabel={`Bus Factor: ${busFactor.replace('-', ' ')}`}
          score={factors.authors.score}
          color={busFactor === 'high-risk' ? 'red' : busFactor === 'medium-risk' ? 'yellow' : 'green'}
        />

        {/* Age / Dormancy */}
        <MetricCard
          icon={<Calendar className="w-4 h-4" />}
          label="Age"
          value={`${Math.round(file.ageDays)} days`}
          sublabel={formatDate(file.lastModified)}
          score={factors.age.score}
          color={factors.age.score < 70 ? 'yellow' : 'green'}
        />
      </div>

      {/* Factor Breakdown */}
      <div className="space-y-3">
        <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          Score Breakdown
        </h4>
        <div className="space-y-2">
          <ScoreFactor
            label="Churn Rate"
            score={factors.churn.score}
            weight={factors.churn.weight}
          />
          <ScoreFactor
            label="Author Diversity"
            score={factors.authors.score}
            weight={factors.authors.weight}
          />
          <ScoreFactor
            label="Age / Dormancy"
            score={factors.age.score}
            weight={factors.age.weight}
          />
        </div>
      </div>

      {/* Operations Breakdown */}
      <div className="space-y-3">
        <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          Operations
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <OperationBadge label="Additions" count={file.operations.A || 0} color="green" />
          <OperationBadge label="Modifications" count={file.operations.M || 0} color="blue" />
          <OperationBadge label="Deletions" count={file.operations.D || 0} color="red" />
          <OperationBadge label="Renames" count={file.operations.R || 0} color="purple" />
        </div>
      </div>

      {/* Insight */}
      <div className="bg-purple-950/20 border border-purple-900/50 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-2">
          Insight
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          {insight}
        </p>
      </div>
    </div>
  );
};

/* ==================== COUPLING VIEW (Placeholder) ==================== */

const CouplingView: React.FC<{ file: EnrichedFileData }> = ({ file }) => {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 text-center">
        <div className="text-zinc-400 text-sm mb-2">Coupling Analysis</div>
        <div className="text-xs text-zinc-500">
          Available in Phase 2
        </div>
      </div>
      <div className="text-xs text-zinc-400">
        <p className="mb-2">File: {file.path}</p>
        <p>Coupling data will show co-change relationships and dependencies.</p>
      </div>
    </div>
  );
};

/* ==================== TIME VIEW (Placeholder) ==================== */

const TimeView: React.FC<{ file: EnrichedFileData }> = ({ file }) => {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 text-center">
        <div className="text-zinc-400 text-sm mb-2">Evolution Analysis</div>
        <div className="text-xs text-zinc-500">
          Available in Phase 3
        </div>
      </div>
      <div className="text-xs text-zinc-400 space-y-2">
        <p><strong>File:</strong> {file.path}</p>
        <p><strong>First Seen:</strong> {formatDate(file.firstSeen)}</p>
        <p><strong>Last Modified:</strong> {formatDate(file.lastModified)}</p>
        <p className="mt-4">Temporal data will show commit frequency, lifecycle events, and activity patterns over time.</p>
      </div>
    </div>
  );
};

/* ==================== HELPER COMPONENTS ==================== */

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  score: number;
  color: 'red' | 'yellow' | 'green';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, sublabel, score, color }) => {
  const colorClasses = {
    red: 'text-red-400 bg-red-950/30 border-red-900/50',
    yellow: 'text-yellow-400 bg-yellow-950/30 border-yellow-900/50',
    green: 'text-green-400 bg-green-950/30 border-green-900/50'
  };

  return (
    <div className={`rounded-lg p-3 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="opacity-70">{icon}</div>
        <span className="text-[10px] uppercase tracking-wider font-bold">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[10px] opacity-70 mt-0.5">{sublabel}</div>
        </div>
        <div className="text-xs font-mono opacity-60">
          {score}/100
        </div>
      </div>
    </div>
  );
};

interface ScoreFactorProps {
  label: string;
  score: number;
  weight: number;
}

const ScoreFactor: React.FC<ScoreFactorProps> = ({ label, score, weight }) => {
  const percentage = Math.round(weight * 100);
  const barWidth = `${score}%`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500 font-mono">{score}/100 ({percentage}%)</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300"
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
};

interface OperationBadgeProps {
  label: string;
  count: number;
  color: 'green' | 'blue' | 'red' | 'purple';
}

const OperationBadge: React.FC<OperationBadgeProps> = ({ label, count, color }) => {
  const colorClasses = {
    green: 'bg-green-950/30 text-green-400 border-green-900/50',
    blue: 'bg-blue-950/30 text-blue-400 border-blue-900/50',
    red: 'bg-red-950/30 text-red-400 border-red-900/50',
    purple: 'bg-purple-950/30 text-purple-400 border-purple-900/50'
  };

  return (
    <div className={`rounded-lg p-2 border text-center ${colorClasses[color]}`}>
      <div className="text-lg font-bold tabular-nums">{count}</div>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
};

/* ==================== UTILITIES ==================== */

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}