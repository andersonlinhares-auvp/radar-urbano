// Ícones de linha monocromáticos para a landing. Usam currentColor (cor herdada).
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 32, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

/** Comunidade reporta: balão de fala com pin. */
export function IconReport(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 5h16v10H9l-4 3v-3H4z" />
      <circle cx="12" cy="9.5" r="1.6" />
      <path d="M12 11.1V13" />
    </svg>
  );
}

/** Verificação: documento com lupa. */
export function IconVerify(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 3h8l4 4v8" />
      <path d="M14 3v4h4" />
      <circle cx="10" cy="15" r="3.2" />
      <path d="m12.4 17.4 2.6 2.6" />
    </svg>
  );
}

/** Difusão: ondas de sinal saindo de um ponto. */
export function IconBroadcast(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="1.8" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M6 6a9 9 0 0 0 0 12M18 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

/** Fonte oficial: documento com carimbo. */
export function IconSource(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

/** Voz local: balão de fala com localização. */
export function IconVoice(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 5h16v9H8l-3 3v-3H4z" />
      <path d="M12 7.5c1.5 0 2.6 1.1 2.6 2.5 0 1.7-2.6 3.8-2.6 3.8S9.4 11.7 9.4 10c0-1.4 1.1-2.5 2.6-2.5Z" />
    </svg>
  );
}

/** Moderação: check com pessoas ao redor. */
export function IconModeration(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="9" r="3" />
      <path d="M6 20a6 6 0 0 1 12 0" />
      <path d="m15.5 9 1.6 1.6 3-3.2" />
    </svg>
  );
}
