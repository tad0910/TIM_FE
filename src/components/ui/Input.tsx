import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`
              w-full rounded-lg border text-sm transition-colors
              focus:outline-none focus:ring-2
              disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : 'pl-3'}
              ${rightIcon ? 'pr-10' : 'pr-3'}
              py-2
              ${
                error
                  ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-teal-500'
              }
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-rose-500 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
