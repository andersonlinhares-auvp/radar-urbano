// apps/web/src/components/auth/InputField.tsx
'use client';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  className?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { id, label, error, className = '', ...rest },
  ref,
) {
  const hasError = Boolean(error);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-widest text-ardosia font-mono"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={[
          'rounded-lg border bg-superficie px-4 py-3 text-sm text-tinta',
          'placeholder:text-nevoa',
          'outline-none transition-all duration-150',
          'focus:border-petroleo-500 focus:ring-2 focus:ring-petroleo-500/20',
          hasError
            ? 'border-risco-critico ring-2 ring-risco-critico/20'
            : 'border-linha hover:border-ardosia',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' ')}
        {...rest}
      />
      {hasError && (
        <p id={`${id}-error`} role="alert" className="text-xs text-risco-critico">
          {error}
        </p>
      )}
    </div>
  );
});
