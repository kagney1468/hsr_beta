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
    success: 'bg-accent/10 text-accent border-accent/20',
    warning: 'bg-amber-custom/10 text-amber-custom border-amber-custom/20',
    error: 'bg-red-50 text-red-600 border-red-100',
    info: 'bg-blue-50 text-blue-600 border-blue-100',
    pending: 'bg-orange-50 text-orange-600 border-orange-100',
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
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest ${styles[status]} ${className}`}>
      <span className="material-symbols-outlined text-[14px]">{displayIcon}</span>
      {label}
    </div>
  );
}
