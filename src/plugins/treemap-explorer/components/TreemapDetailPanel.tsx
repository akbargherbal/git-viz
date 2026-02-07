// src/plugins/treemap-explorer/components/TreemapDetailPanel.tsx

import { X } from "lucide-react";
import { EnrichedFileData, TemporalFileData } from "../types";
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
  onClose,
}: TreemapDetailPanelProps) {
  return (
    <div
      className="animate-slide-in-right absolute right-0 top-0 z-40 flex h-full w-96 flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-900 shadow-2xl"
      data-testid="detail-panel"
      data-lens-mode={lensMode}
      data-file-path={file.key}
      data-file-name={file.key.split("/").pop()}
      data-has-coupling-data={lensMode === "coupling" && !!couplingIndex}
      data-coupling-threshold={
        lensMode === "coupling" ? couplingThreshold : undefined
      }
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-900 p-4">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-sm font-bold text-zinc-100"
            title={file.key}
          >
            {file.key.split("/").pop()}
          </h3>
          <p
            className="mt-0.5 truncate font-mono text-xs text-zinc-500"
            title={file.key}
          >
            {file.key}
          </p>
        </div>
        <button
          onClick={onClose}
          data-testid="close-detail-panel"
          className="flex-shrink-0 rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content based on lens mode */}
      <div className="flex-1 space-y-4 p-4">
        {lensMode === "debt" && <DebtView file={file as EnrichedFileData} />}
        {lensMode === "coupling" &&
          couplingIndex &&
          couplingThreshold !== undefined && (
            <CouplingView
              file={file as EnrichedFileData}
              couplingIndex={couplingIndex}
              couplingThreshold={couplingThreshold}
            />
          )}
        {lensMode === "time" && <TimeView file={file} />}
      </div>

      {/* Lens Mode Indicator */}
      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              lensMode === "debt" && "bg-red-500",
              lensMode === "coupling" && "bg-purple-500",
              lensMode === "time" && "bg-blue-500",
            )}
          />
          <span className="font-semibold uppercase">
            {lensMode === "debt" && "Technical Debt Lens"}
            {lensMode === "coupling" && "Coupling Lens"}
            {lensMode === "time" && "Temporal Lens"}
          </span>
        </div>
      </div>
    </div>
  );
}
