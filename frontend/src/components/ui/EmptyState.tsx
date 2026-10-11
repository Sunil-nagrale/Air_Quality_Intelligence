import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`p-8 text-center bg-white border border-dashed border-ivory-300 rounded-3xl flex flex-col items-center justify-center max-w-md mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-sage-100 text-forest-800 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-forest-950 tracking-tight">{title}</h3>
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button size="sm" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
