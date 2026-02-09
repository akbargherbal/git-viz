// src/plugins/treemap-explorer/components/GlossaryModal.tsx

import { X, Search } from "lucide-react";
import { useState } from "react";

export interface GlossaryTerm {
  id: string;
  term: string;
  shortDescription: string;
  fullDescription: string;
  formula?: string;
  source: "provided" | "calculated" | "derived";
  ranges?: Array<{
    range: string;
    description: string;
    color?: string;
  }>;
  example?: string;
  relatedTerms?: string[];
}

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  terms: GlossaryTerm[];
  highlightedTermId?: string;
}

export default function GlossaryModal({
  isOpen,
  onClose,
  title,
  terms,
  highlightedTermId,
}: GlossaryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTermId, setSelectedTermId] = useState<string | null>(
    highlightedTermId || null,
  );

  if (!isOpen) return null;

  const filteredTerms = terms.filter(
    (term) =>
      term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedTerm = selectedTermId
    ? terms.find((t) => t.id === selectedTermId)
    : null;

  const getSourceBadge = (source: GlossaryTerm["source"]) => {
    const badges = {
      provided: {
        color: "bg-green-500/20 text-green-400 border-green-500/30",
        label: "From Dataset",
      },
      calculated: {
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        label: "Calculated",
      },
      derived: {
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        label: "Derived",
      },
    };
    return badges[source];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-[900px] max-w-[95vw] flex-col rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close glossary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="border-b border-zinc-800 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Content: Two-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Term List */}
          <div className="w-64 overflow-y-auto border-r border-zinc-800 bg-zinc-900">
            <div className="p-2">
              {filteredTerms.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  No terms found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTerms.map((term) => (
                    <button
                      key={term.id}
                      onClick={() => setSelectedTermId(term.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedTermId === term.id
                          ? "bg-purple-500/20 text-purple-300"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="text-sm font-semibold">{term.term}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {term.shortDescription}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Term Details */}
          <div className="flex-1 overflow-y-auto bg-zinc-900 p-6">
            {selectedTerm ? (
              <div className="space-y-6">
                {/* Term Header */}
                <div>
                  <div className="mb-2 flex items-start gap-3">
                    <h3 className="flex-1 text-2xl font-bold text-zinc-100">
                      {selectedTerm.term}
                    </h3>
                    <span
                      className={`rounded border px-2 py-1 text-xs font-semibold uppercase ${getSourceBadge(selectedTerm.source).color}`}
                    >
                      {getSourceBadge(selectedTerm.source).label}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    {selectedTerm.shortDescription}
                  </p>
                </div>

                {/* Full Description */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Description
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                    {selectedTerm.fullDescription}
                  </p>
                </div>

                {/* Formula */}
                {selectedTerm.formula && (
                  <div className="rounded-lg border border-purple-900/50 bg-purple-950/20 p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                      Formula
                    </h4>
                    <pre className="overflow-x-auto font-mono text-sm text-purple-300">
                      {selectedTerm.formula}
                    </pre>
                  </div>
                )}

                {/* Ranges/Thresholds */}
                {selectedTerm.ranges && selectedTerm.ranges.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Interpretation
                    </h4>
                    <div className="space-y-2">
                      {selectedTerm.ranges.map((range, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
                        >
                          {range.color && (
                            <div
                              className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: range.color }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-zinc-200">
                              {range.range}
                            </div>
                            <div className="mt-0.5 text-xs text-zinc-400">
                              {range.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Example */}
                {selectedTerm.example && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Example
                    </h4>
                    <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300">
                      {selectedTerm.example}
                    </pre>
                  </div>
                )}

                {/* Related Terms */}
                {selectedTerm.relatedTerms &&
                  selectedTerm.relatedTerms.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Related Terms
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTerm.relatedTerms.map((relatedId) => {
                          const relatedTerm = terms.find(
                            (t) => t.id === relatedId,
                          );
                          return relatedTerm ? (
                            <button
                              key={relatedId}
                              onClick={() => setSelectedTermId(relatedId)}
                              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-purple-500 hover:bg-zinc-700"
                            >
                              {relatedTerm.term}
                            </button>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <div className="text-center">
                  <p className="text-sm">Select a term to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
