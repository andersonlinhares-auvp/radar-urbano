import Link from 'next/link';
import { AnimatedRadarMark, RadarMark } from '@/components/RadarMark';

const SUMMARY = [
  { label: 'DIREÇÃO', value: 'Cartografia Institucional', sub: 'O mapa em primeiro lugar' },
  { label: 'COR PRIMÁRIA', value: 'Petróleo', sub: 'Confiança, não alarme' },
  { label: 'DADOS', value: 'Comunidade + Oficial', sub: 'Procedência declarada' },
  { label: 'PRINCÍPIO', value: 'Aberto e auditável', sub: 'Open source · cívico' },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-tinta text-[#f4f1ea]">
      {/* radar grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(#1b242e 1px, transparent 1px), linear-gradient(90deg, #1b242e 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="pointer-events-none absolute -right-[120px] -top-[160px] h-[620px] w-[620px] rounded-full border border-grafite" />
      <div className="pointer-events-none absolute -top-10 right-0 h-[380px] w-[380px] rounded-full border border-grafite" />

      <div className="relative mx-auto max-w-[1280px] px-8 py-12">
        {/* top bar */}
        <div className="mb-14 flex items-center gap-2.5">
          <RadarMark size={24} />
          <span className="font-mono text-[13px] font-semibold tracking-[0.14em] text-[#f4f1ea]">
            RADAR<span className="text-petroleo-400">URBANO</span>
          </span>
          <span className="ml-auto font-mono text-[12px] tracking-[0.12em] text-ardosia">
            V1 · JUN 2026 · RIO DE JANEIRO
          </span>
        </div>

        <div className="grid items-center gap-16 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-10 flex items-center gap-3.5">
              <span className="font-mono text-[12px] tracking-[0.2em] text-petroleo-400">
                INTELIGÊNCIA URBANA COLABORATIVA
              </span>
              <span className="h-px w-[60px] bg-grafite" />
            </div>
            <h1 className="mb-6 font-serif text-[76px] font-medium leading-[0.98] tracking-[-0.02em]">
              Radar
              <br />
              Urbano
            </h1>
            <p className="mb-8 max-w-[30em] text-[21px] leading-[1.5] text-[#c8cdd2]">
              Plataforma aberta de inteligência urbana. Entenda o que acontece ao seu redor a partir
              de relatos da comunidade e dados públicos oficiais — em tempo real.
            </p>

            <div className="mb-9 flex flex-wrap gap-2.5">
              <span className="rounded-full bg-petroleo-400 px-3.5 py-2 font-mono text-[12px] font-medium tracking-[0.06em] text-tinta">
                Inteligência urbana colaborativa
              </span>
              <span className="rounded-full border border-grafite px-3.5 py-2 font-mono text-[12px] tracking-[0.06em] text-[#c8cdd2]">
                Open source
              </span>
              <span className="rounded-full border border-grafite px-3.5 py-2 font-mono text-[12px] tracking-[0.06em] text-[#c8cdd2]">
                Cívico · Geoespacial
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/mapa"
                className="rounded-md bg-petroleo-600 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-petroleo-500"
              >
                Abrir o mapa →
              </Link>
              <Link
                href="/painel"
                className="rounded-md border border-grafite px-6 py-3.5 text-[15px] font-semibold text-[#f4f1ea] transition-colors hover:bg-grafite"
              >
                Ver painel de risco
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <AnimatedRadarMark size={300} />
          </div>
        </div>

        {/* recommendation summary strip */}
        <div className="mt-[72px] border-t border-grafite pt-8">
          <div className="mb-5 font-mono text-[12px] tracking-[0.14em] text-ardosia">
            RECOMENDAÇÃO EM RESUMO
          </div>
          <div className="grid grid-cols-2 gap-px border border-grafite bg-grafite md:grid-cols-4">
            {SUMMARY.map((s) => (
              <div key={s.label} className="bg-tinta p-5">
                <div className="mb-2 font-mono text-[11px] tracking-[0.1em] text-ardosia">
                  {s.label}
                </div>
                <div className="text-base font-semibold text-[#f4f1ea]">{s.value}</div>
                <div className="mt-1 text-[13px] text-nevoa">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
