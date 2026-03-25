import React from 'react';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  icon?: string;
  className?: string;
}

export function StatusBadge({ status, label, icon, className = '' }: StatusBadgeProps) {
  const styles = {
    success: 'bg-[#d1fae5] text-[#059669] border-[#d1fae5]',
    warning: 'bg-[#fef3c7] text-[#d97706] border-[#fef3c7]',
    error: 'bg-[#fee2e2] text-[#dc2626] border-[#fee2e2]',
    info: 'bg-[var(--teal-050)] text-[var(--teal-900)] border-[var(--teal-050)]',
    pending: 'bg-[var(--teal-050)] text-[var(--teal-600)] border-[var(--teal-050)]',
  };

  const defaultIcons = {
    success: 'check_circle',
    warning: 'warning',
    error: 'error',
    info: 'info',
    pending: 'pending',
  };

  const displayIcon = icon || defaultIcons[status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wide ${styles[status]} ${className}`}>
      <span className="material-symbols-outlined text-[14px]">{displayIcon}</span>
      {label}
    </div>
  );
}
