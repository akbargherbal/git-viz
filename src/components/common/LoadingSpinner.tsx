// src/components/common/LoadingSpinner.tsx

import React from "react";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500"></div>
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
