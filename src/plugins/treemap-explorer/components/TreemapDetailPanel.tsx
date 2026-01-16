// src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx

import React from 'react';
import { X, AlertTriangle, GitBranch, Clock } from 'lucide-react';
import { EnrichedFileData } from '../TreemapExplorerPlugin';
import { CouplingIndex } from '@/services/data/CouplingDataProcessor';
import { CouplingView } from './CouplingView';

interface TreemapDetailPanelProps {
  file: EnrichedFileData | null;
  lensMode: 'debt' | 'coupling' | 'time';
  couplingIndex: CouplingIndex;
  couplingThreshold: number;
  onClose: () => void;
}

export const TreemapDetailPanel: React.FC<TreemapDetailPanelProps> = ({
  file,
  lensMode,
  couplingIndex,
  couplingThreshold,
  onClose
}) => {
  if (!file) return null;

  // Get lens display info
  const getLensInfo = () => {
    switch (lensMode) {
      case 'debt':
        return { icon: AlertTriangle, label: 'Technical Debt', color: 'text-red-400' };
      case 'coupling':
        return { icon: GitBranch, label: 'Coupling Analysis', color: 'text-purple-400' };
      case 'time':
        return { icon: Clock, label: 'Evolution', color: 'text-blue-400' };
    }
  };

  const lensInfo = getLensInfo();
  const LensIcon = lensInfo.icon;

  return (
    <aside className="w-96 bg-zinc-900/95 backdrop-blur border-l border-zinc-700 flex flex-col shadow-2xl transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            {/* Lens indicator */}
            <div className={`flex items-center gap-2 mb-2 ${lensInfo.color}`}>
              <LensIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {lensInfo.label}
              </span>
            </div>
            
            {/* File name */}
            <h3 className="text-sm font-bold text-white font-mono truncate mb-1">
              {file.name}
            </h3>
            
            {/* Full path */}
            <div className="text-[10px] text-zinc-500 font-mono break-all">
              {file.path}
            </div>
          </div>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="ml-3 p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
            aria-label="Close detail panel"
          >
            <X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
          </button>
        </div>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {lensMode === 'debt' && <DebtView file={file} />}
          {lensMode === 'coupling' && (
            <CouplingView 
              file={file} 
              couplingIndex={couplingIndex}
              couplingThreshold={couplingThreshold}
            />
          )}
          {lensMode === 'time' && <TimeView file={file} />}
        </div>
      </div>
    </aside>
  );
};

/**
 * Debt Lens View - shows health metrics and technical debt indicators
 */
const DebtView: React.FC<{ file: EnrichedFileData }> = ({ file }) => {
  const healthScore = file.healthScore?.score || 0;
  const category = file.healthScore?.category || 'medium';
  const churnRate = file.healthScore?.churnRate || 0;
  const busFactor = file.healthScore?.busFactor || 'medium-risk';

  // Get category color and label
  const getCategoryInfo = (cat: string) => {
    switch (cat) {
      case 'healthy':
        return { color: 'text-green-400', bgColor: 'bg-green-950/20', borderColor: 'border-green-900/50', label: 'Healthy' };
      case 'medium':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-950/20', borderColor: 'border-yellow-900/50', label: 'Medium Risk' };
      case 'critical':
        return { color: 'text-red-400', bgColor: 'bg-red-950/20', borderColor: 'border-red-900/50', label: 'Critical' };
      default:
        return { color: 'text-zinc-400', bgColor: 'bg-zinc-950/20', borderColor: 'border-zinc-900/50', label: 'Unknown' };
    }
  };

  const categoryInfo = getCategoryInfo(category);

  // Generate insight based on health metrics
  const getInsight = (): string => {
    if (healthScore < 30) {
      return 'Critical technical debt detected. High churn with low contributor diversity suggests reactive maintenance rather than planned evolution. Immediate attention recommended.';
    }
    if (file.uniqueAuthors < 2) {
      return 'Bus factor risk: This file has limited expertise distribution. Consider knowledge sharing initiatives and pair programming to reduce organizational risk.';
    }
    if (churnRate > 70) {
      return 'High churn rate indicates frequent rewrites. This may signal unclear requirements, technical uncertainty, or evolving understanding of the domain.';
    }
    if (healthScore >= 70) {
      return 'Healthy file with sustainable maintenance patterns and good contributor distribution. Continue current practices.';
    }
    return 'Moderate technical debt. File shows some risk factors but is manageable. Monitor trends and consider proactive refactoring during feature work.';
  };

  return (
    <div className="space-y-6">
      {/* Health Score Badge */}
      <div className={`${categoryInfo.bgColor} border ${categoryInfo.borderColor} rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            Health Score
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${categoryInfo.bgColor} ${categoryInfo.color}`}>
            {categoryInfo.label}
          </div>
        </div>
        <div className={`text-4xl font-bold ${categoryInfo.color}`}>
          {healthScore}
          <span className="text-lg text-zinc-500">/100</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          Key Metrics
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Churn Rate</span>
            <span 
              className={`font-mono ${churnRate > 70 ? 'text-red-400' : churnRate > 40 ? 'text-yellow-400' : 'text-zinc-300'}`}
            >
              {churnRate.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Bus Factor</span>
            <span 
              className={`font-mono ${
                busFactor === 'high-risk' ? 'text-red-400' : 
                busFactor === 'medium-risk' ? 'text-yellow-400' : 
                'text-green-400'
              }`}
            >
              {busFactor === 'high-risk' ? 'High Risk' : 
               busFactor === 'medium-risk' ? 'Medium' : 
               'Low Risk'}
            </span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Total Authors</span>
            <span className="text-zinc-300 font-mono">{file.uniqueAuthors}</span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Total Commits</span>
            <span className="text-zinc-300 font-mono">{file.totalCommits}</span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Age (days)</span>
            <span className="text-zinc-300 font-mono">{Math.floor(file.ageDays)}</span>
          </div>
        </div>
      </div>

      {/* Operations Breakdown */}
      <div className="space-y-3">
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          Operations
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Modified</div>
            <div className="text-lg font-bold text-zinc-200">{file.operations.M || 0}</div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Added</div>
            <div className="text-lg font-bold text-green-400">{file.operations.A || 0}</div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Deleted</div>
            <div className="text-lg font-bold text-red-400">{file.operations.D || 0}</div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Renamed</div>
            <div className="text-lg font-bold text-zinc-400">{file.operations.R || 0}</div>
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className={`${categoryInfo.bgColor} border ${categoryInfo.borderColor} rounded-lg p-3`}>
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            <svg className={`w-4 h-4 ${categoryInfo.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {getInsight()}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Time Lens View - placeholder for Phase 3
 */
const TimeView: React.FC<{ file: EnrichedFileData }> = ({ file }) => {
  const firstSeenDate = new Date(file.firstSeen).toLocaleDateString();
  const lastModifiedDate = new Date(file.lastModified).toLocaleDateString();
  const daysSinceLastMod = Math.floor(
    (new Date().getTime() - new Date(file.lastModified).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-4">
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-3">
          File Lifecycle
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Created</div>
            <div className="text-sm font-mono text-zinc-200">{firstSeenDate}</div>
          </div>
          
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Last Modified</div>
            <div className="text-sm font-mono text-zinc-200">{lastModifiedDate}</div>
          </div>
          
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Days Since Last Change</div>
            <div className={`text-sm font-mono ${daysSinceLastMod > 180 ? 'text-zinc-500' : 'text-blue-400'}`}>
              {daysSinceLastMod} days
            </div>
          </div>
          
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</div>
            <div className={`text-sm font-mono ${daysSinceLastMod > 180 ? 'text-zinc-500' : 'text-green-400'}`}>
              {daysSinceLastMod > 180 ? 'Dormant' : 'Active'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-3">
        <p className="text-xs text-zinc-300 leading-relaxed">
          {daysSinceLastMod > 180 
            ? 'This file has been dormant for an extended period. May be stable/complete, or a candidate for deprecation review.'
            : 'Active file with recent modifications. Part of current development focus area.'}
        </p>
      </div>
    </div>
  );
};