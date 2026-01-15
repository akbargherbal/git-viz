// src/components/common/TimeBinSelector.tsx
import React from "react";
import { useAppStore } from "@/store/appStore";
import { TimeBinType } from "@/types/domain";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
} from "lucide-react";

export const TimeBinSelector: React.FC = () => {
  const { filters, setTimeBin } = useAppStore();

  const options: {
    value: TimeBinType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "day", label: "Day", icon: <CalendarDays size={14} /> },
    { value: "week", label: "Week", icon: <CalendarRange size={14} /> },
    { value: "month", label: "Month", icon: <Calendar size={14} /> },
    { value: "quarter", label: "Quarter", icon: <CalendarClock size={14} /> },
  ];

  return (
    <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTimeBin(option.value)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${
              filters.timeBin === option.value
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }
          `}
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
