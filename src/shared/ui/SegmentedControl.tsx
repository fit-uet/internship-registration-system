import type { ReactNode } from 'react';
import { cn } from './cn';

export type SegmentedItem<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
};

type SegmentedControlProps<T extends string = string> = {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
};

export function SegmentedControl<T extends string = string>({
  items,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div className={cn('ui-segmented-control', className)} role="tablist">
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              'ui-segmented-item',
              size === 'sm' && 'px-2.5 py-1 text-xs',
              isActive && 'ui-segmented-item--active'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== null && item.badge !== '' && (
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  isActive
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-black/5 text-slate-500'
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
