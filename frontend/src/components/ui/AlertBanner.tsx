import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export interface AlertBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const configs = {
    info: {
      bg: 'bg-sage-50',
      border: 'border-sage-300',
      text: 'text-forest-950',
      icon: Info,
      iconColor: 'text-forest-700',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-950',
      icon: AlertTriangle,
      iconColor: 'text-amber-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-950',
      icon: AlertCircle,
      iconColor: 'text-red-700',
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-950',
      icon: CheckCircle,
      iconColor: 'text-emerald-700',
    },
  };

  const config = configs[type];
  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true" />
        <div className="flex-1 text-xs sm:text-sm">
          {title && <h4 className="font-bold mb-1 tracking-tight">{title}</h4>}
          <div className="leading-relaxed text-gray-700">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss alert"
            className="p-1 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
