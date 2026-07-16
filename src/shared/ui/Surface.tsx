import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function Surface({ children, padding = 'md', className, ...props }: SurfaceProps) {
  return (
    <div className={cn('ui-surface', `ui-surface--${padding}`, className)} {...props}>
      {children}
    </div>
  );
}
