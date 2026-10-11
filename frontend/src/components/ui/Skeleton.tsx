import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const baseClasses = 'animate-pulse bg-ivory-200/90 rounded-xl';

  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
    card: 'h-36 w-full rounded-2xl border border-ivory-200',
  };

  const customStyle: React.CSSProperties = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={customStyle}
      aria-hidden="true"
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-5 bg-white border border-ivory-200 rounded-2xl space-y-4 ${className}`}>
    <div className="flex items-center justify-between">
      <Skeleton variant="text" className="w-1/3 h-4" />
      <Skeleton variant="rectangular" className="w-16 h-5 rounded-full" />
    </div>
    <Skeleton variant="text" className="w-2/3 h-8" />
    <div className="grid grid-cols-2 gap-2 pt-2">
      <Skeleton variant="rectangular" className="h-10 rounded-lg" />
      <Skeleton variant="rectangular" className="h-10 rounded-lg" />
    </div>
  </div>
);
