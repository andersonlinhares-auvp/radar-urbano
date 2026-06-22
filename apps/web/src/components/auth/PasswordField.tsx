// apps/web/src/components/auth/PasswordField.tsx
'use client';
import { useState, type ChangeEvent } from 'react';
import { InputField } from './InputField';

interface PasswordFieldProps {
  id: string;
  label: string;
  error?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  className?: string;
}

export function PasswordField({
  id,
  label,
  error,
  value,
  onChange,
  required,
  minLength,
  autoComplete = 'current-password',
  className,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className ?? ''}`}>
      <InputField
        id={id}
        label={label}
        error={error}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        // Extra right padding for the toggle button
        style={{ paddingRight: '3rem' }}
      />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-[34px] text-ardosia hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500 rounded"
      >
        {visible ? (
          /* Eye-off icon */
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          /* Eye icon */
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
