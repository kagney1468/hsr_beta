import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-[14px] border-[1.5px] border-[var(--border)] shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
