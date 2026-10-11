import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'emerald' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-forest-800 text-white hover:bg-forest-900 focus:ring-forest-700 shadow-sm hover:shadow hover:bg-forest-950',
    secondary:
      'bg-sage-100 text-forest-900 hover:bg-sage-200 border border-sage-300 focus:ring-forest-600',
    outline:
      'bg-white text-forest-900 border border-ivory-300 hover:bg-ivory-100 hover:border-forest-600 focus:ring-forest-600 shadow-sm',
    ghost:
      'bg-transparent text-gray-700 hover:bg-ivory-200/70 hover:text-forest-900 focus:ring-forest-600',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    emerald:
      'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-400 shadow-md hover:shadow-glow-emerald',
    glass:
      'bg-white/80 backdrop-blur border border-white/60 text-forest hover:bg-white focus:ring-forest-600 shadow-glass',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};
