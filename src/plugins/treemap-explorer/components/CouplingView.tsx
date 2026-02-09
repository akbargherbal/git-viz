// src/plugins/treemap-explorer/components/CouplingView.tsx

import React, { useState } from "react";
import { Link, HelpCircle, Info } from "lucide-react";
import { EnrichedFileData } from "../types";
import {
  CouplingDataProcessor,
  CouplingIndex,
  CouplingPartner,
} from "@/services/data/CouplingDataProcessor";
import CouplingGlossaryModal from "./CouplingGlossaryModal";

interface CouplingViewProps {
  file: EnrichedFileData;
  couplingIndex: CouplingIndex;
  couplingThreshold: number;
}

export const CouplingView: React.FC<CouplingViewProps> = ({
  file,
  couplingIndex,
  couplingThreshold,
}) => {
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [highlightedTerm, setHighlightedTerm] = useState<string | undefined>();

  const openGlossary = (termId?: string) => {
    setHighlightedTerm(termId);
    setIsGlossaryOpen(true);
  };

  // Get coupling partners filtered by threshold
  const partners = CouplingDataProcessor.getTopCouplings(
    couplingIndex,
    file.key,
    10,
  ).filter((p) => p.strength >= couplingThreshold);

  // Get coupling metrics with defensive fallback
  const metrics =
    couplingIndex && couplingIndex.size > 0
      ? CouplingDataProcessor.getFileCouplingMetrics(couplingIndex, file.key)
      : {
          maxStrength: 0,
          avgStrength: 0,
          totalPartners: 0,
          strongCouplings: 0,
        };

  // Generate insight based on coupling strength
  const getInsight = (): string => {
    if (metrics.totalPartners === 0) {
      return "This file has no detected coupling relationships. It may be isolated or recently added.";
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
    <>
      <div className="space-y-6">
        {/* Help Button */}
        <button
          onClick={() => openGlossary()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 text-xs text-zinc-400 transition-colors hover:border-purple-500 hover:bg-zinc-800 hover:text-purple-400"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Open Metrics Glossary</span>
        </button>

        {/* Coupling Statistics Grid */}
        <div className="grid grid-cols-2 gap-px bg-zinc-800">
          <div className="bg-zinc-900 p-4 text-center">
            <button
              onClick={() => openGlossary("coupled-files-count")}
              className="mx-auto block transition-opacity hover:opacity-80"
            >
              <div className="text-2xl font-bold text-purple-400">
                {metrics.totalPartners}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                <span>Coupled Files</span>
                <Info className="h-2.5 w-2.5" />
              </div>
            </button>
          </div>
          <div className="bg-zinc-900 p-4 text-center">
            <button
              onClick={() => openGlossary("max-strength")}
              className="mx-auto block transition-opacity hover:opacity-80"
            >
              <div className="text-2xl font-bold text-white">
                {(metrics.maxStrength || 0).toFixed(2)}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                <span>Max Strength</span>
                <Info className="h-2.5 w-2.5" />
              </div>
            </button>
          </div>
        </div>

        {/* Key Metrics Section */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Coupling Metrics
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <button
                onClick={() => openGlossary("avg-strength")}
                className="flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-300"
              >
                <span>Average Strength</span>
                <Info className="h-2.5 w-2.5" />
              </button>
              <span className="font-mono text-zinc-300">
                {(metrics.avgStrength || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <button
                onClick={() => openGlossary("strong-couplings")}
                className="flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-300"
              >
                <span>Strong Couplings</span>
                <Info className="h-2.5 w-2.5" />
              </button>
              <span className="font-mono text-zinc-300">
                {metrics.strongCouplings} (&gt;0.5)
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <button
                onClick={() => openGlossary("coupling-threshold")}
                className="flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-300"
              >
                <span>Current Threshold</span>
                <Info className="h-2.5 w-2.5" />
              </button>
              <span className="font-mono text-purple-400">
                {couplingThreshold.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Insight Box */}
        <div className="rounded-lg border border-purple-900/50 bg-purple-950/20 p-3">
          <div className="flex items-start gap-2">
            <button
              onClick={() => openGlossary("coupling-insight")}
              className="mt-0.5 transition-opacity hover:opacity-80"
            >
              <svg
                className="h-4 w-4 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <p className="text-xs leading-relaxed text-zinc-300">
              {getInsight()}
            </p>
          </div>
        </div>

        {/* Top Coupling Partners */}
        {partners.length > 0 && (
          <div>
            <button
              onClick={() => openGlossary("top-coupling-partners")}
              className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-300"
            >
              <Link className="h-3 w-3" />
              <span>Top Coupling Partners</span>
              <Info className="h-2.5 w-2.5" />
            </button>
            <div className="space-y-2">
              {partners.map((partner, index) => (
                <CouplingPartnerCard
                  key={partner.filePath}
                  partner={partner}
                  index={index}
                  onStrengthClick={() => openGlossary("coupling-strength")}
                  onCochangeClick={() => openGlossary("cochange-count")}
                />
              ))}
            </div>
          </div>
        )}

        {/* No coupling partners message */}
        {partners.length === 0 && metrics.totalPartners > 0 && (
          <div className="py-6 text-center">
            <div className="text-sm text-zinc-500">
              No coupling partners above threshold{" "}
              {couplingThreshold.toFixed(1)}
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              Adjust the coupling threshold in filters to see weaker
              relationships
            </div>
          </div>
        )}

        {/* Truly isolated file */}
        {metrics.totalPartners === 0 && (
          <div className="py-6 text-center">
            <div className="text-sm text-zinc-500">
              No coupling relationships detected
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              This file does not co-change with others
            </div>
          </div>
        )}
      </div>

      {/* Glossary Modal */}
      <CouplingGlossaryModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
        highlightedTermId={highlightedTerm}
      />
    </>
  );
};

/**
 * Individual coupling partner card component
 */
interface CouplingPartnerCardProps {
  partner: CouplingPartner;
  index: number;
  onStrengthClick: () => void;
  onCochangeClick: () => void;
}

const CouplingPartnerCard: React.FC<CouplingPartnerCardProps> = ({
  partner,
  index,
  onStrengthClick,
  onCochangeClick,
}) => {
  const fileName = partner.filePath.split("/").pop() || partner.filePath;
  const directory = partner.filePath.split("/").slice(0, -1).join("/") || "/";

  // Determine strength category and color
  const getStrengthInfo = (
    strength: number,
  ): { label: string; color: string } => {
    if (strength >= 0.7)
      return { label: "Very High", color: "text-purple-300" };
    if (strength >= 0.5) return { label: "High", color: "text-purple-400" };
    if (strength >= 0.3) return { label: "Medium", color: "text-purple-500" };
    return { label: "Low", color: "text-purple-600" };
  };

  const strengthInfo = getStrengthInfo(partner.strength);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 transition-colors hover:border-purple-500/50">
      {/* Rank badge */}
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-purple-800/50 bg-purple-950/50">
          <span className="text-[10px] font-bold text-purple-400">
            {index + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* File name */}
          <div className="truncate font-mono text-xs font-medium text-zinc-200">
            {fileName}
          </div>

          {/* Directory path */}
          <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
            {directory}
          </div>

          {/* Strength bar and metrics */}
          <div className="mt-2 space-y-1.5">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                  style={{ width: `${partner.strength * 100}%` }}
                />
              </div>
              <button
                onClick={onStrengthClick}
                className={`font-mono text-[10px] font-bold transition-opacity hover:opacity-80 ${strengthInfo.color}`}
              >
                {partner.strength.toFixed(2)}
              </button>
            </div>

            {/* Metadata row */}
            <div className="flex items-center justify-between text-[10px]">
              <span className={`font-medium ${strengthInfo.color}`}>
                {strengthInfo.label}
              </span>
              <button
                onClick={onCochangeClick}
                className="text-zinc-500 transition-colors hover:text-zinc-400"
              >
                {partner.cochangeCount} co-changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
