// apps/web/src/components/auth/AuthLayout.tsx
import type { ReactNode } from 'react';
import { RadarMark } from '@/components/RadarMark';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Institutional quotes rotated on the left panel */
const QUOTES = [
  {
    text: 'Entender o território é o primeiro passo para transformá-lo.',
    author: 'Princípio do Radar Urbano',
  },
  { text: 'Dados abertos, cidade mais justa.', author: 'Missão' },
  { text: 'Cada relato conta. Cada ponto no mapa importa.', author: 'Comunidade' },
] as const;

const QUOTE = QUOTES[0]; // static for SSR predictability

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL: branding + radar (desktop only) ─────────────── */}
      <aside
        className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between bg-tinta p-12"
        aria-hidden="true"
      >
        {/* Logo lockup */}
        <div className="flex items-center gap-3">
          <RadarMark size={32} color="#3fb6a8" dotColor="#f4f1ea" />
          <div>
            <div className="font-sans font-bold text-lg tracking-tight text-superficie leading-none">
              Radar Urbano
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-petroleo-400 uppercase mt-0.5">
              Inteligência Urbana
            </div>
          </div>
        </div>

        {/* Large animated radar mark */}
        <div className="flex flex-col items-center gap-10 py-8">
          {/* Static large radar SVG (no animation dep for SSR) */}
          <div className="relative" style={{ width: 220, height: 220 }}>
            <svg width="220" height="220" viewBox="0 0 300 300" fill="none">
              <circle cx="150" cy="150" r="146" stroke="#2b343d" strokeWidth="1" />
              <circle cx="150" cy="150" r="108" stroke="#2b343d" strokeWidth="1" />
              <circle cx="150" cy="150" r="70" stroke="#2b343d" strokeWidth="1" />
              <circle cx="150" cy="150" r="32" stroke="#2b343d" strokeWidth="1" />
              <line x1="4" y1="150" x2="296" y2="150" stroke="#2b343d" strokeWidth="1" />
              <line x1="150" y1="4" x2="150" y2="296" stroke="#2b343d" strokeWidth="1" />
            </svg>
            {/* Sweep wedge — rendered client side via CSS animation declared in globals */}
            <div className="absolute inset-1 overflow-hidden rounded-full" suppressHydrationWarning>
              <div
                className="ru-sweep absolute inset-0"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(63,182,168,0) 0deg, rgba(63,182,168,0) 270deg, rgba(63,182,168,0.45) 360deg)',
                }}
              />
            </div>
            {/* incident dot */}
            <div className="absolute h-3 w-3" style={{ top: 68, left: 144 }}>
              <div className="ru-ping absolute inset-0 rounded-full bg-risco-medio" />
              <div className="absolute inset-[3px] rounded-full bg-risco-medio" />
            </div>
            {/* center dot */}
            <div className="absolute h-3.5 w-3.5" style={{ top: 88, left: 88 }}>
              <div
                className="absolute inset-[3px] rounded-full"
                style={{ background: '#f4f1ea', boxShadow: '0 0 0 4px rgba(244,241,234,0.15)' }}
              />
            </div>
          </div>

          {/* Institutional quote */}
          <blockquote className="text-center max-w-xs">
            <p className="font-serif text-lg text-superficie/80 leading-relaxed italic">
              "{QUOTE.text}"
            </p>
            <cite className="mt-3 block font-mono text-[11px] tracking-widest text-petroleo-400 not-italic uppercase">
              — {QUOTE.author}
            </cite>
          </blockquote>
        </div>

        {/* Footer trust signals */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-petroleo-400" />
            <span className="font-mono text-[10px] tracking-wider text-grafite uppercase">
              Open source
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-petroleo-400" />
            <span className="font-mono text-[10px] tracking-wider text-grafite uppercase">
              Dados abertos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-petroleo-400" />
            <span className="font-mono text-[10px] tracking-wider text-grafite uppercase">
              Rio de Janeiro
            </span>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL: form ─────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-papel lg:bg-superficie">
        <div className="w-full max-w-md">
          {/* Mobile logo (hidden on desktop where left panel shows) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <RadarMark size={28} color="#0e5c63" dotColor="#11181f" />
            <span className="font-mono text-xs tracking-[0.18em] text-petroleo-600 uppercase font-semibold">
              Radar Urbano
            </span>
          </div>

          {/* Page heading */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-medium text-tinta leading-tight tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm text-ardosia leading-relaxed">{subtitle}</p>}
          </div>

          {/* Form slot */}
          {children}
        </div>
      </main>
    </div>
  );
}
