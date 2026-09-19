import React from 'react';
import { cn } from './cn';

export type BadgeVariant = 'success' | 'info' | 'warning' | 'neutral' | 'error';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string; ping?: string }> = {
  success: {
    container: 'bg-emerald-50/90 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    dot: 'bg-emerald-500',
    ping: 'bg-emerald-400',
  },
  info: {
    container: 'bg-blue-50/90 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    dot: 'bg-blue-500',
    ping: 'bg-blue-400',
  },
  warning: {
    container: 'bg-amber-50/90 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
  },
  neutral: {
    container: 'bg-slate-100/90 text-slate-600 ring-1 ring-inset ring-slate-500/15',
    dot: 'bg-slate-400',
    ping: 'bg-slate-300',
  },
  error: {
    container: 'bg-rose-50/90 text-rose-700 ring-1 ring-inset ring-rose-600/20',
    dot: 'bg-rose-500',
    ping: 'bg-rose-400',
  },
};

const sizeStyles: Record<BadgeSize, { container: string; dot: string }> = {
  sm: {
    container: 'px-2 py-0.5 text-[11px] gap-1.5 rounded-md',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    container: 'px-2.5 py-1 text-xs gap-1.5 rounded-md',
    dot: 'w-1.5 h-1.5',
  },
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = true,
  pulse = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const v = variantStyles[variant] || variantStyles.neutral;
  const s = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium tracking-tight select-none shrink-0 transition-colors',
        v.container,
        s.container,
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('relative flex items-center justify-center shrink-0', s.dot)}>
          {pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                v.ping || v.dot
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full', s.dot, v.dot)} />
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
