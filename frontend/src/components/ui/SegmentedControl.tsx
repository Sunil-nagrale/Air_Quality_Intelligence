import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  ariaLabel = 'Segmented options',
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'p-1 text-xs gap-1',
    md: 'p-1.5 text-sm gap-1.5',
  };

  const itemSizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-xs sm:text-sm',
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-ivory-200/90 rounded-2xl border border-ivory-300 ${sizeClasses[size]} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-forest-800 ${
              itemSizeClasses[size]
            } ${
              isSelected
                ? 'bg-white text-forest-950 shadow-sm'
                : 'text-gray-600 hover:text-forest-900 hover:bg-white/40'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sage-200 text-forest-900 font-bold ml-1">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
