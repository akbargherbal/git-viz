// src/plugins/treemap-explorer/components/LensModeSelector.tsx

import React from "react";
import { AlertTriangle, GitBranch, Clock } from "lucide-react";

interface LensModeSelectorProps {
  currentLens: "debt" | "coupling" | "time";
  onLensChange: (lens: "debt" | "coupling" | "time") => void;
}

interface LensOption {
  id: "debt" | "coupling" | "time";
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const lenses: LensOption[] = [
  {
    id: "debt",
    label: "Technical Debt",
    short: "DEBT",
    icon: AlertTriangle,
    description: "View file health scores based on churn, authors, and age",
  },
  {
    id: "coupling",
    label: "Coupling Analysis",
    short: "COUP",
    icon: GitBranch,
    description: "Analyze co-change patterns and file dependencies",
  },
  {
    id: "time",
    label: "Evolution",
    short: "TIME",
    icon: Clock,
    description: "Explore file lifecycle and temporal patterns",
  },
];

export const LensModeSelector: React.FC<LensModeSelectorProps> = ({
  currentLens,
  onLensChange,
}) => {
  return (
    <div
      className="flex gap-2"
      role="group"
      aria-label="Lens mode selector"
      data-testid="lens-mode-selector"
      data-current-lens={currentLens}
    >
      {lenses.map((lens) => {
        const Icon = lens.icon;
        const isActive = currentLens === lens.id;

        return (
          <button
            key={lens.id}
            data-testid={`lens-${lens.id}`}
            data-selected={isActive}
            onClick={() => onLensChange(lens.id)}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-medium transition-all ${
              isActive
                ? "border-purple-500 bg-purple-600 text-white shadow-sm"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            } `}
            aria-pressed={isActive}
            title={lens.description}
          >
            <Icon className="h-3 w-3" />
            <span>{lens.short}</span>
          </button>
        );
      })}
    </div>
  );
};
