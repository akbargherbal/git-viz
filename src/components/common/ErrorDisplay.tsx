// src/components/common/ErrorDisplay.tsx

import React from 'react';
import { X } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="bg-red-950/50 border border-red-800 rounded-lg p-6 max-w-md">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-red-400 font-bold text-lg">Error</h3>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-300"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <p className="text-red-200 text-sm">{error}</p>
        <div className="mt-4 text-xs text-red-300">
          Please check the console for more details or try reloading the page.
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
