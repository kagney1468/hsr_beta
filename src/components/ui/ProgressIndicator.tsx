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
          <span className="text-xs font-semibold text-[var(--teal-900)] uppercase tracking-wide">{label}</span>
          <span className="text-xs font-semibold text-[var(--teal-600)]">{progress}%</span>
        </div>
      )}
      <div className="w-full bg-[var(--teal-050)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
        <div 
          className="bg-[var(--teal-600)] h-full rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
