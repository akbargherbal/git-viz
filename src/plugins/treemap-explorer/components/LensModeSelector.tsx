// src/plugins/treemap-explorer/components/LensModeSelector.tsx

import React from 'react';
import { AlertTriangle, GitBranch, Clock } from 'lucide-react';

interface LensModeSelectorProps {
  currentLens: 'debt' | 'coupling' | 'time';
  onLensChange: (lens: 'debt' | 'coupling' | 'time') => void;
}

interface LensOption {
  id: 'debt' | 'coupling' | 'time';
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const lenses: LensOption[] = [
  {
    id: 'debt',
    label: 'Technical Debt',
    short: 'DEBT',
    icon: AlertTriangle,
    description: 'View file health scores based on churn, authors, and age'
  },
  {
    id: 'coupling',
    label: 'Coupling Analysis',
    short: 'COUP',
    icon: GitBranch,
    description: 'Analyze co-change patterns and file dependencies'
  },
  {
    id: 'time',
    label: 'Evolution',
    short: 'TIME',
    icon: Clock,
    description: 'Explore file lifecycle and temporal patterns'
  }
];

export const LensModeSelector: React.FC<LensModeSelectorProps> = ({
  currentLens,
  onLensChange
}) => {
  return (
    <div className="flex gap-2" role="group" aria-label="Lens mode selector">
      {lenses.map(lens => {
        const Icon = lens.icon;
        const isActive = currentLens === lens.id;

        return (
          <button
            key={lens.id}
            onClick={() => onLensChange(lens.id)}
            className={`
              px-2 py-1 rounded text-[10px] font-medium transition-all border
              flex items-center gap-1.5
              ${isActive 
                ? 'bg-purple-900/50 text-purple-200 border-purple-700/50' 
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border-zinc-700 hover:border-zinc-600'
              }
            `}
            aria-pressed={isActive}
            title={lens.description}
          >
            <Icon className="w-3 h-3" />
            <span>{lens.short}</span>
          </button>
        );
      })}
    </div>
  );
};