'use client';
import { useState } from 'react';

interface Pin {
  top: string;
  left: string;
  color: string;
}

interface UseCase {
  tab: string;
  eyebrow: string;
  title: string;
  body: string;
  badge: string;
  heat: string; // posição do "calor" no mapa
  pins: Pin[];
}

const OURO = '#e0a93b';
const VERDE = '#3fb6a8';
const LARANJA = '#d2702f';

const CASES: UseCase[] = [
  {
    tab: 'Voltando pra casa',
    eyebrow: 'TODA NOITE',
    title: 'Antes de sair do trabalho, você já sabe o caminho mais tranquilo.',
    body: 'Veja o que está acontecendo agora nos bairros entre você e sua casa. Relatos recentes, atualização em tempo real. Sem precisar ligar pra ninguém.',
    badge: '● 3 relatos · há 12 min',
    heat: '38% 46%',
    pins: [
      { top: '40%', left: '34%', color: OURO },
      { top: '58%', left: '52%', color: VERDE },
      { top: '30%', left: '62%', color: LARANJA },
    ],
  },
  {
    tab: 'Escolhendo a rota',
    eyebrow: 'NA HORA DE SAIR',
    title: 'Dois caminhos, informações diferentes. Você decide.',
    body: 'A Estrada dos Bandeirantes está bloqueada? Tem relato recente na Linha Amarela? O feed do bairro conta antes do trânsito virar problema.',
    badge: '● Via interditada · há 5 min',
    heat: '60% 60%',
    pins: [
      { top: '52%', left: '58%', color: LARANJA },
      { top: '66%', left: '44%', color: OURO },
    ],
  },
  {
    tab: 'Meu bairro',
    eyebrow: 'SEMPRE ATUALIZADO',
    title: 'O que está acontecendo na sua vizinhança agora.',
    body: 'Ipanema, Méier, Santa Cruz, Realengo — cada bairro tem seu próprio feed. Relatos das últimas horas, acumulados pelos próprios moradores.',
    badge: '● 7 relatos hoje',
    heat: '50% 40%',
    pins: [
      { top: '36%', left: '46%', color: OURO },
      { top: '46%', left: '56%', color: VERDE },
      { top: '54%', left: '40%', color: VERDE },
      { top: '60%', left: '60%', color: OURO },
    ],
  },
  {
    tab: 'Ocorrências recentes',
    eyebrow: 'ÚLTIMAS HORAS',
    title: 'O que a comunidade registrou hoje na cidade.',
    body: 'Acidente na Presidente Vargas. Interditação em São Conrado. Operação no Complexo do Alemão. Tudo com fonte, horário e número de confirmações.',
    badge: '● 12 relatos · 6 bairros',
    heat: '46% 52%',
    pins: [
      { top: '28%', left: '30%', color: LARANJA },
      { top: '42%', left: '64%', color: OURO },
      { top: '58%', left: '38%', color: VERDE },
      { top: '64%', left: '70%', color: OURO },
      { top: '34%', left: '52%', color: VERDE },
    ],
  },
];

function MapPreview({ data }: { data: UseCase }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-grafite bg-tinta">
      {/* grelha sutil */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(#1b242e 1px, transparent 1px), linear-gradient(90deg, #1b242e 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* mancha de calor */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120px 120px at ${data.heat}, rgba(224,169,59,0.5), rgba(210,112,47,0.25) 45%, transparent 70%)`,
        }}
      />
      {/* pins estilo gota */}
      {data.pins.map((pin, i) => (
        <span
          key={i}
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2"
          style={{ top: pin.top, left: pin.left }}
        >
          <span
            className="block h-full w-full border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
            style={{
              background: pin.color,
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
            }}
          />
        </span>
      ))}
      {/* badge de relato */}
      <div className="absolute bottom-3 left-3 rounded-full bg-tinta/90 px-3 py-1.5 font-mono text-[11px] text-petroleo-400 ring-1 ring-grafite">
        {data.badge}
      </div>
    </div>
  );
}

export function UseCases() {
  const [active, setActive] = useState(0);
  const data = CASES[active]!;

  return (
    <div>
      {/* Tabs (desktop) */}
      <div className="mb-8 hidden flex-wrap gap-1 border-b border-linha md:flex">
        {CASES.map((c, i) => (
          <button
            key={c.tab}
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 px-4 py-3 font-mono text-[12px] tracking-[0.06em] transition-colors ${
              i === active
                ? 'border-petroleo-600 text-petroleo-600'
                : 'border-transparent text-ardosia hover:text-tinta'
            }`}
          >
            {c.tab}
          </button>
        ))}
      </div>

      {/* Desktop: 2 colunas */}
      <div className="hidden items-center gap-12 md:grid md:grid-cols-[1.1fr_0.9fr]">
        <MapPreview data={data} />
        <div>
          <div className="mb-3 font-mono text-[12px] tracking-[0.16em] text-petroleo-600">
            {data.eyebrow}
          </div>
          <h3 className="mb-4 max-w-[18em] font-serif text-[28px] font-medium leading-tight text-tinta">
            {data.title}
          </h3>
          <p className="max-w-[30em] text-[16px] leading-relaxed text-ardosia">{data.body}</p>
        </div>
      </div>

      {/* Mobile: scroll vertical entre casos */}
      <div className="flex flex-col gap-12 md:hidden">
        {CASES.map((c) => (
          <div key={c.tab}>
            <MapPreview data={c} />
            <div className="mt-5">
              <div className="mb-2 font-mono text-[12px] tracking-[0.16em] text-petroleo-600">
                {c.eyebrow}
              </div>
              <h3 className="mb-3 font-serif text-[24px] font-medium leading-tight text-tinta">
                {c.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-ardosia">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
