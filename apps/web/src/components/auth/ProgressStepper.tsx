// apps/web/src/components/auth/ProgressStepper.tsx
const STEPS = [
  { label: 'Cadastro', step: 1 },
  { label: 'Verificação', step: 2 },
  { label: 'Concluído', step: 3 },
] as const;

interface ProgressStepperProps {
  currentStep: 1 | 2 | 3;
}

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  return (
    <nav aria-label="Etapas do cadastro" className="flex items-center gap-0">
      {STEPS.map(({ label, step }, idx) => {
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200',
                  done
                    ? 'bg-petroleo-600 text-white'
                    : active
                      ? 'border-2 border-petroleo-600 bg-petroleo-100 text-petroleo-600'
                      : 'border border-linha bg-superficie text-nevoa',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2 6l2.5 2.5L10 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={[
                  'text-[10px] font-mono uppercase tracking-widest',
                  active
                    ? 'text-petroleo-600 font-semibold'
                    : done
                      ? 'text-petroleo-600'
                      : 'text-nevoa',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'mx-2 mb-4 h-px w-10 transition-all duration-300',
                  step < currentStep ? 'bg-petroleo-600' : 'bg-linha',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
