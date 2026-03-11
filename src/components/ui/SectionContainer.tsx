import React from 'react';

interface SectionContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionContainer({ title, description, children, className = '' }: SectionContainerProps) {
  return (
    <div className={`py-8 border-b border-slate-200 dark:border-slate-800 last:border-0 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
