// apps/web/src/components/auth/CodeInput.tsx
'use client';
import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react';

interface CodeInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
}

const DIGITS = 6;

export function CodeInput({ value, onChange, error, disabled = false }: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Pad/trim value to exactly DIGITS chars
  const digits = value.padEnd(DIGITS, '').slice(0, DIGITS).split('');

  function updateDigit(index: number, char: string) {
    const next = digits
      .map((d, i) => (i === index ? char : d))
      .join('')
      .trimEnd();
    onChange(next.slice(0, DIGITS));
    if (char && index < DIGITS - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        updateDigit(index, '');
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        updateDigit(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < DIGITS - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, DIGITS - 1);
    refs.current[focusIndex]?.focus();
  }

  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex gap-2 sm:gap-3"
        role="group"
        aria-label="Código de verificação (6 dígitos)"
      >
        {Array.from({ length: DIGITS }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digits[i] === ' ' ? '' : digits[i]}
            disabled={disabled}
            aria-label={`Dígito ${i + 1}`}
            onChange={(e) => {
              const char = e.target.value.replace(/\D/g, '').slice(-1);
              updateDigit(i, char);
            }}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={[
              'h-14 w-full max-w-[52px] rounded-lg border text-center font-mono text-xl font-semibold text-tinta',
              'bg-superficie outline-none transition-all duration-150',
              'focus:border-petroleo-500 focus:ring-2 focus:ring-petroleo-500/20',
              hasError
                ? 'border-risco-critico ring-2 ring-risco-critico/20 animate-shake'
                : 'border-linha hover:border-ardosia',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' ')}
          />
        ))}
      </div>
      {hasError && (
        <p role="alert" className="text-xs text-risco-critico">
          {error}
        </p>
      )}
    </div>
  );
}
