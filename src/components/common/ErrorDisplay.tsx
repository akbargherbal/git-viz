// src/components/common/ErrorDisplay.tsx

import React from "react";
import { X } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
}) => {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-red-800 bg-red-950/50 p-6">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-lg font-bold text-red-400">Error</h3>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-300"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <p className="text-sm text-red-200">{error}</p>
        <div className="mt-4 text-xs text-red-300">
          Please check the console for more details or try reloading the page.
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
