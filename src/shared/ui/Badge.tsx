import React from 'react';
import { cn } from './cn';

export type BadgeVariant = 'success' | 'info' | 'warning' | 'neutral' | 'error';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  coloredBg?: boolean;
  className?: string;
  children: React.ReactNode;
}

const neutralContainer = 'bg-slate-100/90 text-slate-700 ring-1 ring-inset ring-slate-200/80';

const coloredContainers: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50/90 text-emerald-800 ring-1 ring-inset ring-emerald-600/20',
  info: 'bg-blue-50/90 text-blue-800 ring-1 ring-inset ring-blue-600/20',
  warning: 'bg-amber-50/90 text-amber-800 ring-1 ring-inset ring-amber-600/20',
  neutral: 'bg-slate-100/90 text-slate-600 ring-1 ring-inset ring-slate-500/15',
  error: 'bg-rose-50/90 text-rose-800 ring-1 ring-inset ring-rose-600/20',
};

const dotColors: Record<BadgeVariant, { dot: string; ping: string }> = {
  success: {
    dot: 'bg-emerald-500',
    ping: 'bg-emerald-400',
  },
  info: {
    dot: 'bg-blue-600',
    ping: 'bg-blue-400',
  },
  warning: {
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
  },
  neutral: {
    dot: 'bg-slate-400',
    ping: 'bg-slate-300',
  },
  error: {
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
  coloredBg = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const containerStyle = coloredBg
    ? (coloredContainers[variant] || coloredContainers.neutral)
    : neutralContainer;
  const d = dotColors[variant] || dotColors.neutral;
  const s = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium tracking-tight select-none shrink-0 transition-colors',
        containerStyle,
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
                d.ping
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full', s.dot, d.dot)} />
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
