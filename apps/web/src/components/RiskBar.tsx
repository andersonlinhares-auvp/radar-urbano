import type { RiskBand } from '@radar-urbano/core';

const BAND_LABEL: Record<RiskBand, string> = {
  BAIXO: 'Baixo',
  MEDIO: 'Médio',
  ALTO: 'Alto',
  CRITICO: 'Crítico',
};

interface RiskBarProps {
  name: string;
  score: number;
  band: RiskBand;
  color: string;
  last?: boolean;
}

/** A neighborhood risk ranking row: name, track bar, numeric score + band label (color + label). */
export function RiskBar({ name, score, band, color, last }: RiskBarProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-[9px] ${last ? '' : 'border-b border-[#efebe1]'}`}
    >
      <span className="text-[13px] text-tinta">{name}</span>
      <span className="flex items-center gap-2">
        <span
          className="block h-1.5 w-12 overflow-hidden rounded-[3px] bg-[#efebe1]"
          role="img"
          aria-label={`Risco ${score} de 100, ${BAND_LABEL[band]}`}
        >
          <span
            className="block h-1.5 rounded-[3px]"
            style={{ width: `${Math.min(100, score)}%`, background: color }}
          />
        </span>
        <span className="w-5 text-right font-mono text-xs font-semibold" style={{ color }}>
          {score}
        </span>
        <span className="w-[44px] font-mono text-[10px] uppercase tracking-wide" style={{ color }}>
          {BAND_LABEL[band]}
        </span>
      </span>
    </div>
  );
}
