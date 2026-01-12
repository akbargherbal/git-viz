// src/components/common/MetricSelector.tsx
import React from 'react';
import { useAppStore } from '@/store/appStore';
import { MetricType } from '@/types/domain';
import { GitCommit, Activity, Users, FileText } from 'lucide-react';

export const MetricSelector: React.FC = () => {
  const { filters, setMetric } = useAppStore();

  const options: { value: MetricType; label: string; icon: React.ReactNode }[] = [
    { value: 'commits', label: 'Commits', icon: <GitCommit size={14} /> },
    { value: 'events', label: 'Events', icon: <Activity size={14} /> },
    { value: 'authors', label: 'Authors', icon: <Users size={14} /> },
    { value: 'lines', label: 'Lines', icon: <FileText size={14} /> },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setMetric(option.value)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${filters.metric === option.value
                ? 'bg-purple-900/50 text-purple-200 border border-purple-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}
            `}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MetricSelector;