// src/components/common/MetricSelector.tsx
import React from "react";
import { useAppStore } from "@/store/appStore";
import { MetricType } from "@/types/domain";
import { GitCommit, Activity, Users } from "lucide-react";

/**
 * Props for controlled mode (when used by plugins)
 */
interface ControlledMetricSelectorProps {
  value: MetricType;
  onChange: (metric: MetricType) => void;
}

/**
 * MetricSelector component
 * Supports both controlled (plugin-owned) and uncontrolled (store-connected) modes
 *
 * Usage:
 * - Controlled: <MetricSelector value={state.metric} onChange={updateMetric} />
 * - Uncontrolled: <MetricSelector /> (reads/writes to store)
 */
export const MetricSelector: React.FC<
  Partial<ControlledMetricSelectorProps>
> = ({ value: controlledValue, onChange: controlledOnChange }) => {
  // Uncontrolled mode: use store
  const { filters, setMetric } = useAppStore();

  // Determine if we're in controlled or uncontrolled mode
  const isControlled =
    controlledValue !== undefined && controlledOnChange !== undefined;

  const currentValue = isControlled ? controlledValue : filters.metric;
  const handleChange = isControlled ? controlledOnChange : setMetric;

  const options: { value: MetricType; label: string; icon: React.ReactNode }[] =
    [
      { value: "commits", label: "Commits", icon: <GitCommit size={14} /> },
      { value: "events", label: "Events", icon: <Activity size={14} /> },
      { value: "authors", label: "Authors", icon: <Users size={14} /> },
    ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${
                currentValue === option.value
                  ? "bg-purple-900/50 text-purple-200 border border-purple-700/50"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }
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
