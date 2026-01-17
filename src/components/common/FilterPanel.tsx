// src/components/common/FilterPanel.tsx
import React, { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import {
  X,
  Filter,
  User,
  File,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RepoMetadata } from "@/types/domain";

/**
 * Configuration: Number of authors to show by default (collapsed state)
 * Change this value to adjust how many top contributors are visible initially
 */
const TOP_AUTHORS_LIMIT = 5;

/**
 * Props for controlled mode (when used by plugins)
 */
interface ControlledFilterPanelProps {
  authors: Array<{ value: string; label: string; count: number }>;
  extensions: Array<{ extension: string; count: number }>;
  selectedAuthors: string[];
  selectedExtensions: string[];
  onAuthorsChange: (authors: string[]) => void;
  onExtensionsChange: (extensions: string[]) => void;
  onClose?: () => void;
}

/**
 * Props for uncontrolled mode (legacy, store-connected)
 */
interface UncontrolledFilterPanelProps {
  metadata: RepoMetadata | null;
  onClose: () => void;
}

type FilterPanelProps =
  | ControlledFilterPanelProps
  | UncontrolledFilterPanelProps;

/**
 * Type guard to check if props are for controlled mode
 */
function isControlledMode(
  props: FilterPanelProps,
): props is ControlledFilterPanelProps {
  return "authors" in props && "extensions" in props;
}

interface AuthorItemProps {
  name: string;
  count: number;
  isSelected: boolean;
  onToggle: () => void;
}

const AuthorItem: React.FC<AuthorItemProps> = ({
  name,
  count,
  isSelected,
  onToggle,
}) => (
  <div
    onClick={onToggle}
    className={`
      flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm transition-all
      ${
        isSelected
          ? "bg-purple-900/30 border border-purple-600 shadow-sm"
          : "bg-zinc-800 border border-zinc-700 hover:border-purple-400 hover:bg-zinc-750"
      }
    `}
  >
    <span
      className={`truncate ${isSelected ? "text-white font-medium" : "text-zinc-300"}`}
      title={name}
    >
      {name}
    </span>
    <span
      className={`text-xs font-mono flex-shrink-0 ml-2 ${
        isSelected ? "text-purple-300 font-medium" : "text-zinc-500"
      }`}
    >
      {count.toLocaleString()}
    </span>
  </div>
);

interface FileTypePillProps {
  extension: string;
  count: number;
  isSelected: boolean;
  onToggle: () => void;
}

const FileTypePill: React.FC<FileTypePillProps> = ({
  extension,
  count,
  isSelected,
  onToggle,
}) => (
  <button
    onClick={onToggle}
    className={`
      px-4 py-2 rounded-full text-sm font-mono transition-all
      ${
        isSelected
          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50 font-medium"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-purple-400 hover:bg-zinc-750"
      }
    `}
  >
    {extension}{" "}
    <span className="opacity-70 text-xs ml-1">{count.toLocaleString()}</span>
  </button>
);

/**
 * FilterPanel component
 * Supports both controlled (plugin-owned) and uncontrolled (store-connected) modes
 *
 * NEW: Authors section uses search + top N pattern to avoid scrolling through 300+ contributors
 * File types remain as simple pills (typically <20 items)
 */
export const FilterPanel: React.FC<FilterPanelProps> = (props) => {
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorsExpanded, setAuthorsExpanded] = useState(false);

  // Check if we're in controlled or uncontrolled mode
  const isControlled = isControlledMode(props);

  // Uncontrolled mode: use store
  const storeData = useAppStore();

  // Prepare data based on mode
  const {
    displayedAuthorItems,
    totalAuthors,
    fileTypeItems,
    selectedAuthors,
    selectedExtensions,
    handleAuthorToggle,
    handleExtensionToggle,
    handleClearFilters,
    handleClose,
  } = useMemo(() => {
    if (isControlled) {
      // Controlled mode: use props
      const allAuthorItems = props.authors
        .map((a) => ({
          label: a.label || a.value,
          count: a.count,
        }))
        .sort((a, b) => b.count - a.count);

      const fileTypeItems = props.extensions.map((e) => ({
        label: e.extension,
        count: e.count,
      }));

      // Filter and display logic
      const filteredAuthors = authorSearch.trim()
        ? allAuthorItems.filter((a) =>
            a.label.toLowerCase().includes(authorSearch.toLowerCase()),
          )
        : authorsExpanded
          ? allAuthorItems
          : allAuthorItems.slice(0, TOP_AUTHORS_LIMIT);

      const selectedAuthorsSet = new Set(props.selectedAuthors);
      const selectedExtensionsSet = new Set(props.selectedExtensions);

      return {
        displayedAuthorItems: filteredAuthors,
        totalAuthors: allAuthorItems.length,
        hiddenAuthorsCount:
          authorSearch.trim() || authorsExpanded
            ? 0
            : Math.max(0, allAuthorItems.length - TOP_AUTHORS_LIMIT),
        fileTypeItems,
        selectedAuthors: selectedAuthorsSet,
        selectedExtensions: selectedExtensionsSet,
        handleAuthorToggle: (author: string) => {
          const newAuthors = props.selectedAuthors.includes(author)
            ? props.selectedAuthors.filter((a) => a !== author)
            : [...props.selectedAuthors, author];
          props.onAuthorsChange(newAuthors);
        },
        handleExtensionToggle: (ext: string) => {
          const newExtensions = props.selectedExtensions.includes(ext)
            ? props.selectedExtensions.filter((e) => e !== ext)
            : [...props.selectedExtensions, ext];
          props.onExtensionsChange(newExtensions);
        },
        handleClearFilters: () => {
          props.onAuthorsChange([]);
          props.onExtensionsChange([]);
          setAuthorSearch("");
          setAuthorsExpanded(false);
        },
        handleClose: props.onClose || (() => {}),
      };
    } else {
      // Uncontrolled mode: use store
      const { metadata } = props;
      if (!metadata) {
        return {
          displayedAuthorItems: [],
          totalAuthors: 0,
          hiddenAuthorsCount: 0,
          fileTypeItems: [],
          selectedAuthors: new Set<string>(),
          selectedExtensions: new Set<string>(),
          handleAuthorToggle: () => {},
          handleExtensionToggle: () => {},
          handleClearFilters: () => {},
          handleClose: () => {},
        };
      }

      // Aggregate authors by name
      const authorMap = new Map<string, number>();
      metadata.authors.forEach((a) => {
        const current = authorMap.get(a.name) || 0;
        authorMap.set(a.name, current + a.commit_count);
      });

      const allAuthorItems = Array.from(authorMap.entries())
        .map(([name, count]) => ({ label: name, count }))
        .sort((a, b) => b.count - a.count);

      // Filter and display logic
      const filteredAuthors = authorSearch.trim()
        ? allAuthorItems.filter((a) =>
            a.label.toLowerCase().includes(authorSearch.toLowerCase()),
          )
        : authorsExpanded
          ? allAuthorItems
          : allAuthorItems.slice(0, TOP_AUTHORS_LIMIT);

      const fileTypeItems = metadata.file_types.map((f) => ({
        label: f.extension,
        count: f.count,
      }));

      return {
        displayedAuthorItems: filteredAuthors,
        totalAuthors: allAuthorItems.length,
        hiddenAuthorsCount:
          authorSearch.trim() || authorsExpanded
            ? 0
            : Math.max(0, allAuthorItems.length - TOP_AUTHORS_LIMIT),
        fileTypeItems,
        selectedAuthors: storeData.filters.authors,
        selectedExtensions: storeData.filters.fileTypes,
        handleAuthorToggle: storeData.toggleAuthor,
        handleExtensionToggle: storeData.toggleFileType,
        handleClearFilters: () => {
          storeData.clearFilters();
          setAuthorSearch("");
          setAuthorsExpanded(false);
        },
        handleClose: props.onClose,
      };
    }
  }, [isControlled, props, storeData, authorSearch, authorsExpanded]);

  // Don't render if no data in uncontrolled mode
  if (!isControlled && !(props as UncontrolledFilterPanelProps).metadata) {
    return null;
  }

  const hasActiveFilters =
    selectedAuthors.size > 0 || selectedExtensions.size > 0;

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-purple-400" />
          <h2 className="font-bold text-white">Filters</h2>
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-medium">
              {selectedAuthors.size + selectedExtensions.size}
            </span>
          )}
        </div>
        {handleClose && (
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Authors Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">
            <User size={14} />
            Authors
            <span className="text-zinc-600">({totalAuthors} total)</span>
          </div>

          {/* Search Input */}
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              placeholder="Search authors..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
          </div>

          {/* Expand/Collapse Toggle - MOVED TO TOP */}
          {!authorSearch.trim() && totalAuthors > TOP_AUTHORS_LIMIT && (
            <button
              onClick={() => setAuthorsExpanded(!authorsExpanded)}
              className="w-full py-2 px-3 text-xs font-medium text-zinc-400 border border-zinc-700 rounded-lg hover:border-purple-500 hover:text-purple-400 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mb-3"
            >
              {authorsExpanded ? (
                <>
                  <ChevronUp size={14} />
                  Show Top {TOP_AUTHORS_LIMIT} Only
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Show All {totalAuthors} Authors
                </>
              )}
            </button>
          )}

          {/* Author List */}
          <div className="space-y-2">
            {displayedAuthorItems.map(({ label, count }) => (
              <AuthorItem
                key={label}
                name={label}
                count={count}
                isSelected={selectedAuthors.has(label)}
                onToggle={() => handleAuthorToggle(label)}
              />
            ))}
          </div>

          {/* No Results */}
          {authorSearch.trim() && displayedAuthorItems.length === 0 && (
            <div className="text-center py-4 text-sm text-zinc-500">
              No authors found for "{authorSearch}"
            </div>
          )}
        </div>

        {/* File Types Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">
            <File size={14} />
            File Types
          </div>
          <div className="flex flex-wrap gap-2">
            {fileTypeItems.map(({ label, count }) => (
              <FileTypePill
                key={label}
                extension={label}
                count={count}
                isSelected={selectedExtensions.has(label)}
                onToggle={() => handleExtensionToggle(label)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
        {/* Stats Bar */}
        {hasActiveFilters && (
          <div className="flex justify-between text-xs text-zinc-500 mb-3">
            <div>
              Filters Active:{" "}
              <span className="text-purple-400 font-semibold">
                {selectedAuthors.size + selectedExtensions.size}
              </span>
            </div>
          </div>
        )}

        {/* Reset Button */}
        <button
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className={`
            w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all
            flex items-center justify-center gap-2
            ${
              hasActiveFilters
                ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/50"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }
          `}
        >
          <RotateCcw size={16} />
          Reset All Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
