// src/plugins/treemap-explorer/components/CouplingView.tsx

import React from 'react';
import { Link } from 'lucide-react';
import { EnrichedFileData } from '../TreemapExplorerPlugin';
import { CouplingDataProcessor, CouplingIndex, CouplingPartner } from '@/services/data/CouplingDataProcessor';

interface CouplingViewProps {
  file: EnrichedFileData;
  couplingIndex: CouplingIndex;
  couplingThreshold: number;
}

export const CouplingView: React.FC<CouplingViewProps> = ({ 
  file, 
  couplingIndex,
  couplingThreshold 
}) => {
  // Get coupling partners filtered by threshold
  const partners = CouplingDataProcessor.getTopCouplings(
    couplingIndex,
    file.path,
    10
  ).filter(p => p.strength >= couplingThreshold);

  // Get coupling metrics
  const metrics = CouplingDataProcessor.getFileCouplingMetrics(couplingIndex, file.path);

  // Generate insight based on coupling strength
  const getInsight = (): string => {
    if (metrics.totalPartners === 0) {
      return 'This file has no detected coupling relationships. It may be isolated or recently added.';
    }

    if (metrics.maxStrength >= 0.7 && metrics.totalPartners >= 5) {
      return `${metrics.totalPartners} coupling relationships detected with high strength. Changes here will likely ripple to multiple files. Consider careful refactoring and comprehensive testing.`;
    }

    if (metrics.maxStrength >= 0.5) {
      return `${metrics.strongCouplings} strong coupling relationships detected (strength > 0.5). Changes here may impact coupled files. Review dependencies before major refactoring.`;
    }

    return `${metrics.totalPartners} coupling relationships detected with moderate strength. This file co-changes with others but has manageable dependencies.`;
  };



  return (
    <div className="space-y-6">
      {/* Coupling Statistics Grid */}
      <div className="grid grid-cols-2 gap-px bg-zinc-800">
        <div className="bg-zinc-900 p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {metrics.totalPartners}
          </div>
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">
            Coupled Files
          </div>
        </div>
        <div className="bg-zinc-900 p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {metrics.maxStrength.toFixed(2)}
          </div>
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">
            Max Strength
          </div>
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="space-y-3">
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          Coupling Metrics
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Average Strength</span>
            <span className="font-mono text-zinc-300">
              {metrics.avgStrength.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Strong Couplings</span>
            <span className="font-mono text-zinc-300">
              {metrics.strongCouplings} (&gt;0.5)
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Current Threshold</span>
            <span className="font-mono text-purple-400">
              {couplingThreshold.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Insight Box */}
      <div className="bg-purple-950/20 border border-purple-900/50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {getInsight()}
          </p>
        </div>
      </div>

      {/* Top Coupling Partners */}
      {partners.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-400 mb-3 font-bold uppercase tracking-widest flex items-center gap-2">
            <Link className="w-3 h-3" />
            Top Coupling Partners
          </div>
          <div className="space-y-2">
            {partners.map((partner, index) => (
              <CouplingPartnerCard
                key={partner.filePath}
                partner={partner}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* No coupling partners message */}
      {partners.length === 0 && metrics.totalPartners > 0 && (
        <div className="text-center py-6">
          <div className="text-zinc-500 text-sm">
            No coupling partners above threshold {couplingThreshold.toFixed(1)}
          </div>
          <div className="text-zinc-600 text-xs mt-1">
            Adjust the coupling threshold in filters to see weaker relationships
          </div>
        </div>
      )}

      {/* Truly isolated file */}
      {metrics.totalPartners === 0 && (
        <div className="text-center py-6">
          <div className="text-zinc-500 text-sm">
            No coupling relationships detected
          </div>
          <div className="text-zinc-600 text-xs mt-1">
            This file does not co-change with others
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Individual coupling partner card component
 */
interface CouplingPartnerCardProps {
  partner: CouplingPartner;
  index: number;
}

const CouplingPartnerCard: React.FC<CouplingPartnerCardProps> = ({ partner, index }) => {
  const fileName = partner.filePath.split('/').pop() || partner.filePath;
  const directory = partner.filePath.split('/').slice(0, -1).join('/') || '/';

  // Determine strength category and color
  const getStrengthInfo = (strength: number): { label: string; color: string } => {
    if (strength >= 0.7) return { label: 'Very High', color: 'text-purple-300' };
    if (strength >= 0.5) return { label: 'High', color: 'text-purple-400' };
    if (strength >= 0.3) return { label: 'Medium', color: 'text-purple-500' };
    return { label: 'Low', color: 'text-purple-600' };
  };

  const strengthInfo = getStrengthInfo(partner.strength);

  return (
    <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-purple-500/50 transition-colors">
      {/* Rank badge */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-950/50 border border-purple-800/50 flex items-center justify-center">
          <span className="text-[10px] font-bold text-purple-400">
            {index + 1}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          {/* File name */}
          <div className="text-xs text-zinc-200 font-mono truncate font-medium">
            {fileName}
          </div>
          
          {/* Directory path */}
          <div className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
            {directory}
          </div>
          
          {/* Strength bar and metrics */}
          <div className="mt-2 space-y-1.5">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                  style={{ width: `${partner.strength * 100}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono font-bold ${strengthInfo.color}`}>
                {partner.strength.toFixed(2)}
              </span>
            </div>
            
            {/* Metadata row */}
            <div className="flex items-center justify-between text-[10px]">
              <span className={`font-medium ${strengthInfo.color}`}>
                {strengthInfo.label}
              </span>
              <span className="text-zinc-500">
                {partner.cochangeCount} co-changes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};