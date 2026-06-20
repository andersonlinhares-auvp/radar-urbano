'use client';
import { useRef, useState } from 'react';
import { IconRail } from './IconRail';
import { Map, type MapHandle } from './Map';
import { ProvenanceIcon } from './ProvenanceBadge';
import { provenanceKind, PROVENANCE_META } from './provenance';
import type { RecentIncident } from '@/lib/incidents';

interface MapShellProps {
  incidents: RecentIncident[];
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function MapShell({ incidents }: MapShellProps) {
  const mapRef = useRef<MapHandle>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const todayCount = incidents.length;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-superficie">
      <IconRail />

      {/* Map column */}
      <div className="relative flex-1">
        <Map ref={mapRef} showHeatmap={showHeatmap} showMarkers={showMarkers} />

        {/* Top floating controls */}
        <div className="pointer-events-none absolute left-4 right-4 top-4 flex flex-wrap items-start gap-2.5">
          <div className="pointer-events-auto flex max-w-[320px] flex-1 items-center gap-2.5 rounded-md border border-linha bg-superficie px-3.5 py-2.5 shadow-md">
            <span aria-hidden className="text-sm text-[#8a857a]">
              ⌕
            </span>
            <input
              className="w-full bg-transparent text-[13px] text-tinta placeholder:text-[#8a857a] focus:outline-none"
              placeholder="Buscar bairro, rua ou ocorrência…"
              aria-label="Buscar bairro, rua ou ocorrência"
            />
          </div>
          <button
            type="button"
            className="pointer-events-auto rounded-md border border-linha bg-superficie px-3 py-2.5 text-xs text-tinta shadow-md"
          >
            Últimas 24h ▾
          </button>
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={() => setLayersOpen((v) => !v)}
              aria-expanded={layersOpen}
              className="rounded-md bg-petroleo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-petroleo-500"
            >
              Camadas
            </button>
            {layersOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md border border-linha bg-superficie p-3 shadow-lg">
                <div className="mb-2 font-mono text-[10px] tracking-wide text-[#8a857a]">
                  CAMADAS DO MAPA
                </div>
                <label className="mb-2 flex cursor-pointer items-center justify-between text-[13px] text-tinta">
                  <span>Heatmap de risco</span>
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    className="accent-petroleo-600"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between text-[13px] text-tinta">
                  <span>Marcadores</span>
                  <input
                    type="checkbox"
                    checked={showMarkers}
                    onChange={(e) => setShowMarkers(e.target.checked)}
                    className="accent-petroleo-600"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Bottom-left legend */}
        <div className="absolute bottom-4 left-4 min-w-[210px] rounded-md border border-linha bg-superficie/95 p-3.5 shadow-md backdrop-blur">
          <div className="mb-2.5 font-mono text-[10px] tracking-wide text-[#8a857a]">
            CAMADAS ATIVAS
          </div>
          <div className="flex flex-col gap-[7px] text-xs text-[#3a434c]">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-petroleo-600" /> Verificado
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[3px] border-[1.5px] border-[#f4f1ea] bg-tinta" />{' '}
              Oficial · órgão público
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-ardosia bg-superficie" />{' '}
              Comunidade
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-[3px] w-3.5 rotate-45 rounded-[3px]"
                style={{
                  width: 14,
                  height: 14,
                  background: '#e0a93b',
                  borderRadius: '50% 50% 50% 2px',
                }}
              />{' '}
              Atenção
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-6 rounded-[2px]"
                style={{
                  background: 'linear-gradient(90deg,#3fb6a8,#a9cf7e,#e0a93b,#d2702f,#a8332f)',
                }}
              />{' '}
              Heatmap de risco
            </div>
          </div>
        </div>

        {/* Bottom-right scale + attribution */}
        <div className="pointer-events-none absolute bottom-4 right-16 text-right">
          <div className="mb-1.5 flex items-center justify-end gap-1.5">
            <span className="h-[3px] w-[50px] bg-ardosia" />
            <span className="font-mono text-[10px] text-ardosia">500 m</span>
          </div>
          <div className="rounded-[3px] bg-superficie/80 px-1.5 py-0.5 font-mono text-[9px] text-[#8a857a]">
            © OpenStreetMap · Dados abertos PCRJ
          </div>
        </div>
      </div>

      {/* Right panel */}
      <aside className="flex w-[340px] flex-none flex-col border-l border-linha bg-superficie">
        <div className="border-b border-linha px-5 py-[18px]">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-wide text-[#8a857a]">
              RIO DE JANEIRO · RJ
            </span>
            <span className="font-mono text-[11px] text-[#b07f14]">AO VIVO</span>
          </div>
          <div className="text-[19px] font-semibold text-tinta">
            {todayCount} ocorrências recentes
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {incidents.map((inc) => {
            const kind = provenanceKind(inc);
            const meta = PROVENANCE_META[kind];
            const active = inc.id === activeId;
            return (
              <button
                key={inc.id}
                type="button"
                onClick={() => {
                  setActiveId(inc.id);
                  mapRef.current?.focusIncident(inc.id);
                }}
                className={`flex w-full gap-3 border-b border-[#efebe1] px-5 py-3.5 text-left transition-colors hover:bg-papel/60 ${
                  active ? 'bg-papel/80' : ''
                }`}
              >
                <ProvenanceIcon kind={kind} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-tinta">{inc.title}</div>
                  <div className="mt-0.5 text-xs text-ardosia">
                    {meta.label} · {timeLabel(inc.occurredAt)} · {inc.categoryLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
