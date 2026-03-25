import React from 'react';

interface SectionContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionContainer({ title, description, children, className = '' }: SectionContainerProps) {
  return (
    <div className={`py-8 border-b border-[var(--border)] last:border-0 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-bold tracking-tight text-[var(--teal-900)] font-heading">{title}</h3>
        {description && <p className="text-sm text-[var(--muted)] mt-1">{description}</p>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
