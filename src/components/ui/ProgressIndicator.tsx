import React from 'react';

interface ProgressIndicatorProps {
  progress: number;
  label?: string;
  className?: string;
}

export function ProgressIndicator({ progress, label, className = '' }: ProgressIndicatorProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-primary uppercase">{label}</span>
          <span className="text-xs font-bold text-primary">{progress}%</span>
        </div>
      )}
      <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-primary h-full rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
