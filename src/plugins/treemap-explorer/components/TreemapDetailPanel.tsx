// src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx

import { X } from "lucide-react";
import { EnrichedFileData } from "../types";
import { TemporalFileData } from "@/services/data/TemporalDataProcessor";
import { DebtView } from "./DebtView";
import { CouplingView } from "./CouplingView";
import { TimeView } from "./TimeView";
import { cn } from "@/utils/formatting";
import { CouplingIndex } from "@/services/data/CouplingDataProcessor";

export interface TreemapDetailPanelProps {
  file: EnrichedFileData | TemporalFileData;
  lensMode: "debt" | "coupling" | "time";
  couplingIndex?: CouplingIndex;
  couplingThreshold?: number;
  onClose: () => void;
}

export default function TreemapDetailPanel({
  file,
  lensMode,
  couplingIndex,
  couplingThreshold,
  onClose
}: TreemapDetailPanelProps) {
  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-40 overflow-y-auto flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-start justify-between gap-3 z-10">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-100 truncate" title={file.key}>
            {file.key.split("/").pop()}
          </h3>
          <p className="text-xs text-zinc-500 font-mono truncate mt-0.5" title={file.key}>
            {file.key}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content based on lens mode */}
      <div className="flex-1 p-4 space-y-4">
        {lensMode === "debt" && <DebtView file={file} />}
        {lensMode === "coupling" && couplingIndex && couplingThreshold !== undefined && (
          <CouplingView
            file={file}
            couplingIndex={couplingIndex}
            couplingThreshold={couplingThreshold}
          />
        )}
        {lensMode === "time" && <TimeView file={file as TemporalFileData} />}
      </div>

      {/* Lens Mode Indicator */}
      <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              lensMode === "debt" && "bg-red-500",
              lensMode === "coupling" && "bg-purple-500",
              lensMode === "time" && "bg-blue-500"
            )}
          />
          <span className="uppercase font-semibold">
            {lensMode === "debt" && "Technical Debt Lens"}
            {lensMode === "coupling" && "Coupling Lens"}
            {lensMode === "time" && "Temporal Lens"}
          </span>
        </div>
      </div>
    </div>
  );
}
