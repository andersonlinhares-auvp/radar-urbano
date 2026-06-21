// apps/web/src/components/MapShell.tsx
'use client';
import { useRef, useState } from 'react';
import { IconRail } from './IconRail';
import { Map, type MapHandle, type RecentIncident } from './Map';

/** Simple relative-time formatter (pt-BR). */
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `há ${days} d`;
}

export function MapShell() {
  const [layersOpen, setLayersOpen] = useState(false);
  const [recent, setRecent] = useState<RecentIncident[]>([]);
  const mapRef = useRef<MapHandle>(null);
  const fetchingRef = useRef(false);
  const pendingBboxRef = useRef<[number, number, number, number] | null>(null);

  function fetchRecent(bbox: [number, number, number, number]) {
    fetchingRef.current = true;
    pendingBboxRef.current = null;
    fetch(`/api/incidents/recent?bbox=${bbox.join(',')}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { incidents: RecentIncident[] }) => setRecent(data.incidents))
      .catch(() => {
        /* silently ignore auth/rate-limit errors */
      })
      .finally(() => {
        fetchingRef.current = false;
        if (pendingBboxRef.current) {
          fetchRecent(pendingBboxRef.current);
        }
      });
  }

  function handleBboxChange(bbox: [number, number, number, number]) {
    if (fetchingRef.current) {
      pendingBboxRef.current = bbox; // remember latest while in-flight
      return;
    }
    fetchRecent(bbox);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-superficie">
      <IconRail />

      {/* Map column */}
      <div className="relative flex-1">
        <Map ref={mapRef} onBboxChange={handleBboxChange} />

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
                <div className="text-[13px] text-tinta">
                  <div className="flex items-center gap-2 py-1">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{
                        background:
                          'linear-gradient(90deg,#3fb6a8,#a9cf7e,#e0a93b,#d2702f,#a8332f)',
                      }}
                    />
                    Heatmap de risco (tiles)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom-left legend */}
        <div className="absolute bottom-4 left-4 min-w-[210px] rounded-md border border-linha bg-superficie/95 p-3.5 shadow-md backdrop-blur">
          <div className="mb-2.5 font-mono text-[10px] tracking-wide text-[#8a857a]">LEGENDA</div>
          <div className="flex flex-col gap-[7px] text-xs text-[#3a434c]">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-6 rounded-[2px]"
                style={{
                  background: 'linear-gradient(90deg,#3fb6a8,#a9cf7e,#e0a93b,#d2702f,#a8332f)',
                }}
              />{' '}
              Densidade de risco
            </div>
            <div className="mt-1 text-[11px] text-[#8a857a]">
              Clique no mapa para ver a ocorrência mais próxima.
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

      {/* Right panel — últimas ocorrências */}
      <aside className="flex w-72 flex-col border-l border-linha bg-superficie">
        <div className="flex items-center justify-between border-b border-linha px-4 py-3">
          <span className="font-mono text-[10px] tracking-wide text-[#8a857a]">
            ÚLTIMAS OCORRÊNCIAS · {recent.length}
          </span>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {recent.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-[#8a857a]">
              Mova o mapa para carregar ocorrências da área visível.
            </li>
          )}
          {recent.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => mapRef.current?.showIncident(item)}
                className="flex w-full items-start gap-3 border-b border-linha px-4 py-3 text-left hover:bg-[#f5f4f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500"
              >
                <span
                  className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ background: item.categoryColor ?? '#0e5c63' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-tinta">{item.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#8a857a]">
                    {item.categoryLabel} · {item.status} · {relTime(item.occurredAt)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
