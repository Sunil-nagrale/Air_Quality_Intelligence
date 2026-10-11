import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  helperText,
  required = false,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-bold text-forest-900 tracking-tight"
        >
          {label}
          {required && <span className="text-mutedRed ml-1">*</span>}
        </label>
      </div>

      {children}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-mutedRed font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {helperText && !error && (
        <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{helperText}</p>
      )}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className = '', disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full h-11 px-3.5 py-2 text-sm bg-white rounded-xl border font-medium text-forest-950 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-forest-800 focus:ring-offset-1 disabled:opacity-50 disabled:bg-ivory-100 disabled:cursor-not-allowed ${
          hasError
            ? 'border-mutedRed focus:ring-mutedRed'
            : 'border-ivory-300 hover:border-forest-600/50'
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, className = '', disabled, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={`w-full h-11 px-3.5 py-2 text-sm bg-white rounded-xl border font-medium text-forest-950 transition-all focus:outline-none focus:ring-2 focus:ring-forest-800 focus:ring-offset-1 disabled:opacity-50 disabled:bg-ivory-100 disabled:cursor-not-allowed ${
          hasError
            ? 'border-mutedRed focus:ring-mutedRed'
            : 'border-ivory-300 hover:border-forest-600/50'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, className = '', disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full p-3.5 text-sm bg-white rounded-xl border font-medium text-forest-950 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-forest-800 focus:ring-offset-1 disabled:opacity-50 disabled:bg-ivory-100 disabled:cursor-not-allowed ${
          hasError
            ? 'border-mutedRed focus:ring-mutedRed'
            : 'border-ivory-300 hover:border-forest-600/50'
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
