import { IconRail } from '@/components/IconRail';
import { KpiCard } from '@/components/KpiCard';
import { RiskBar } from '@/components/RiskBar';
import { getDashboardStats, incidentsByHour } from '@/lib/dashboard';
import { topNeighborhoodRisk } from '@/lib/risk';

export const dynamic = 'force-dynamic';

const W = 480;
const H = 160;

function buildChart(counts: number[]) {
  if (counts.length === 0)
    return { line: '', area: '', peak: null as { x: number; y: number } | null };
  const max = Math.max(...counts, 1);
  const stepX = counts.length > 1 ? W / (counts.length - 1) : W;
  const pts = counts.map((c, i) => {
    const x = Math.round(i * stepX);
    const y = Math.round(H - 16 - (c / max) * (H - 32));
    return { x, y };
  });
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${line} ${W},${H} 0,${H}`;
  let peak: { x: number; y: number } | null = null;
  for (const p of pts) {
    if (!peak || p.y < peak.y) peak = p;
  }
  return { line, area, peak };
}

export default async function PainelPage() {
  const [stats, hours, ranking] = await Promise.all([
    getDashboardStats(),
    incidentsByHour(12),
    topNeighborhoodRisk(),
  ]);

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const chart = buildChart(hours.map((h) => h.count));

  return (
    <div className="flex min-h-screen w-full bg-superficie">
      <IconRail />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        {/* header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 font-mono text-[11px] tracking-[0.1em] text-[#8a857a]">
              MUNICÍPIO DO RIO DE JANEIRO · {today.toUpperCase()}
            </div>
            <h1 className="font-serif text-[26px] font-medium text-tinta">
              Panorama de risco urbano
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-linha px-3 py-2 text-xs text-[#3a434c]"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="rounded-md bg-petroleo-600 px-3 py-2 text-xs text-white hover:bg-petroleo-500"
            >
              Gerar relatório
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="OCORRÊNCIAS · 24H"
            value={stats.incidents24h.toLocaleString('pt-BR')}
            hint="janela móvel de 24 horas"
          />
          <KpiCard
            label="VERIFICADAS"
            value={`${stats.verifiedPct}%`}
            hint="confirmadas por curadoria"
            hintColor="#3e8e7e"
          />
          <KpiCard
            label="ALERTAS CRÍTICOS"
            value={stats.criticalAlerts}
            hint="violência armada · 24h"
            hintColor="#a8332f"
            critical
          />
          <KpiCard
            label="BAIRROS COM OCORRÊNCIA"
            value={stats.neighborhoodsActive24h.toLocaleString('pt-BR')}
            hint="bairros com ao menos 1 ocorrência nas últimas 24h"
          />
        </div>

        {/* charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* trend chart */}
          <div className="rounded-lg border border-linha bg-white p-5">
            <div className="mb-[18px] flex items-center justify-between">
              <span className="text-sm font-semibold text-tinta">Ocorrências por hora</span>
              <span className="font-mono text-[11px] text-[#8a857a]">ÚLTIMAS 12H</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none">
              <line x1="0" y1="120" x2={W} y2="120" stroke="#efebe1" />
              <line x1="0" y1="80" x2={W} y2="80" stroke="#efebe1" />
              <line x1="0" y1="40" x2={W} y2="40" stroke="#efebe1" />
              {chart.area && <polygon points={chart.area} fill="#0e5c63" opacity="0.08" />}
              {chart.line && (
                <polyline points={chart.line} fill="none" stroke="#0e5c63" strokeWidth="2.5" />
              )}
              {chart.peak && <circle cx={chart.peak.x} cy={chart.peak.y} r="4" fill="#a8332f" />}
            </svg>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-[#8a857a]">
              <span>{hours[0]?.hour}</span>
              <span>{hours[hours.length - 1]?.hour}</span>
            </div>
          </div>

          {/* risk ranking */}
          <div className="rounded-lg border border-linha bg-white p-5">
            <div className="mb-3.5 text-sm font-semibold text-tinta">Maior risco agora</div>
            <div className="flex flex-col">
              {ranking.map((n, i) => (
                <RiskBar
                  key={n.name}
                  name={n.name}
                  score={n.score}
                  band={n.band}
                  color={n.color}
                  last={i === ranking.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
