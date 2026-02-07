// src/components/common/TimeBinSelector.tsx
import React from "react";
import { useAppStore } from "@/store/appStore";
import { TimeBinType } from "@/types/domain";
import { Calendar, CalendarRange, CalendarClock } from "lucide-react";

/**
 * Props for controlled mode (when used by plugins)
 */
interface ControlledTimeBinSelectorProps {
  value: TimeBinType;
  onChange: (timeBin: TimeBinType) => void;
}

/**
 * TimeBinSelector component
 * Supports both controlled (plugin-owned) and uncontrolled (store-connected) modes
 *
 * Usage:
 * - Controlled: <TimeBinSelector value={state.timeBin} onChange={updateTimeBin} />
 * - Uncontrolled: <TimeBinSelector /> (reads/writes to store)
 */
export const TimeBinSelector: React.FC<
  Partial<ControlledTimeBinSelectorProps>
> = ({ value: controlledValue, onChange: controlledOnChange }) => {
  // Uncontrolled mode: use store
  const { filters, setTimeBin } = useAppStore();

  // Determine if we're in controlled or uncontrolled mode
  const isControlled =
    controlledValue !== undefined && controlledOnChange !== undefined;

  const currentValue = isControlled ? controlledValue : filters.timeBin;
  const handleChange = isControlled ? controlledOnChange : setTimeBin;

  const options: {
    value: TimeBinType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "week", label: "Week", icon: <CalendarRange size={14} /> },
    { value: "month", label: "Month", icon: <Calendar size={14} /> },
    { value: "quarter", label: "Quarter", icon: <CalendarClock size={14} /> },
  ];

  return (
    <div
      className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1"
      data-testid="timebin-selector"
      data-current-timebin={currentValue}
      data-mode={isControlled ? "controlled" : "uncontrolled"}
    >
      {options.map((option) => (
        <button
          key={option.value}
          data-testid={`timebin-${option.value}`}
          data-selected={currentValue === option.value}
          onClick={() => handleChange(option.value)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            currentValue === option.value
              ? "bg-zinc-700 text-white shadow-sm"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          } `}
          title={`Group by ${option.label}`}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TimeBinSelector;
