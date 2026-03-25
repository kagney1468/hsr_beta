import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-[8px] transition-colors active:translate-y-[0.5px] disabled:opacity-60 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[var(--teal-600)] text-white hover:bg-[var(--teal-900)] shadow-soft',
    secondary: 'bg-[var(--teal-050)] text-[var(--teal-900)] hover:bg-white border border-[var(--border)]',
    outline: 'border-[1.5px] border-[#6dd4d4] bg-white text-[var(--teal-600)] hover:bg-[var(--teal-050)]',
    ghost: 'bg-transparent text-[var(--teal-600)] hover:bg-[var(--teal-050)]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
