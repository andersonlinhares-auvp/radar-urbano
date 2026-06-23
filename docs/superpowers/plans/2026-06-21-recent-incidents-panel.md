# Recent Incidents Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-side panel to the Radar Urbano map showing the 10 most recent incidents in the visible map area (viewport bbox), updating as the user pans/zooms, gated behind auth + rate-limit + audit.

**Architecture:** A new `GET /api/incidents/recent` endpoint queries PostGIS using an ST_MakeEnvelope bbox filter, capped at LIMIT 10 on the server. Map.tsx is converted to a forwardRef component exposing `showIncident()` imperatively, plus an `onBboxChange` prop that fires on load/moveend. MapShell.tsx wires bbox→fetch→panel and routes click-to-fly via the ref.

**Tech Stack:** Next.js 15 App Router, React 19 (forwardRef + useImperativeHandle), MapLibre GL 4.7, Drizzle ORM + drizzle `sql` tag, ioredis rate-limit, NextAuth session, Tailwind CSS, Vitest.

## Global Constraints

- All files: LF line endings, UTF-8, pt-BR copy with accents.
- `export const dynamic = 'force-dynamic'` on every API route.
- `requireSession()` → 401 before any data access.
- `rateLimit('recent:'+userId, 60, 60)` → 429.
- LIMIT 10 fixed in SQL; never trust client-supplied limit.
- Response NEVER includes authorId, sourceId, or any attribution field.
- Imports use `@/` alias (`@/lib/session`, `@/lib/rate-limit`, `@/lib/audit`).
- Database package imported as `@radar-urbano/db`.
- Commit body ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Build command: `pnpm --filter @radar-urbano/web build` must PASS.
- Test command: `pnpm --filter @radar-urbano/web test` must PASS.

---

## File Map

| File                                             | Action     | Responsibility                                               |
| ------------------------------------------------ | ---------- | ------------------------------------------------------------ |
| `apps/web/src/app/api/incidents/recent/route.ts` | **Create** | Authenticated, rate-limited, audited bbox→incidents endpoint |
| `apps/web/src/components/Map.tsx`                | **Modify** | forwardRef + MapHandle (showIncident) + onBboxChange prop    |
| `apps/web/src/components/MapShell.tsx`           | **Modify** | Wire ref, fetch on bbox change, render recent panel          |
| `apps/web/src/lib/recent-incidents.test.ts`      | **Create** | Unit test for bbox parsing logic (pure function)             |

---

## Task 1: `GET /api/incidents/recent` endpoint

**Files:**

- Create: `apps/web/src/app/api/incidents/recent/route.ts`

**Interfaces:**

- Consumes: `requireSession` from `@/lib/session`, `rateLimit` from `@/lib/rate-limit`, `logAccess` from `@/lib/audit`, `db` + `sql` from `@radar-urbano/db`
- Produces: `GET /api/incidents/recent?bbox=w,s,e,n` → `{ incidents: RecentIncidentRow[] }` where `RecentIncidentRow = { id, refCode, title, categoryLabel, categoryColor, status, trustScore, occurredAt, lng, lat }`

- [ ] **Step 1: Create the route file**

```typescript
// apps/web/src/app/api/incidents/recent/route.ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { logAccess } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface Row extends Record<string, unknown> {
  id: string;
  ref_code: string;
  title: string;
  status: string;
  trust_score: number;
  occurred_at: string;
  category_label: string;
  category_color: string;
  lng: number;
  lat: number;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (!(await rateLimit(`recent:${session.user.id}`, 60, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const parts = (searchParams.get('bbox') ?? '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ error: 'bbox inválido. Use ?bbox=w,s,e,n' }, { status: 422 });
  }
  const [w, s, e, n] = parts;

  const rows = await db.execute<Row>(sql`
    SELECT
      i.id,
      i.ref_code,
      i.title,
      i.status,
      i.trust_score,
      to_char(i.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at,
      c.label  AS category_label,
      c.color  AS category_color,
      ST_X(i.location::geometry) AS lng,
      ST_Y(i.location::geometry) AS lat
    FROM incidents i
    JOIN incident_categories c ON c.slug = i.category_slug
    WHERE i.location && ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)::geography
    ORDER BY i.occurred_at DESC
    LIMIT 10
  `);

  await logAccess('list', {
    userId: session.user.id,
    meta: { bbox: [w, s, e, n] },
  });

  // Nunca retorna authorId/fonte; identidade do autor jamais sai daqui.
  const incidents = rows.map((row) => ({
    id: row.id,
    refCode: row.ref_code,
    title: row.title,
    categoryLabel: row.category_label,
    categoryColor: row.category_color,
    status: row.status,
    trustScore: Number(row.trust_score),
    occurredAt: row.occurred_at,
    lng: Number(row.lng),
    lat: Number(row.lat),
  }));

  return NextResponse.json({ incidents });
}
```

- [ ] **Step 2: Verify TypeScript compiles (no test yet — unit test in Task 2)**

```powershell
pnpm --filter @radar-urbano/web typecheck
```

Expected: exit 0, no errors about `recent/route.ts`.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/app/api/incidents/recent/route.ts
git commit -m "feat(web): add GET /api/incidents/recent endpoint (gated, capped, audited)

- requireSession() → 401; rateLimit 60/60s → 429
- bbox validation (4 finite numbers) → 422
- PostGIS ST_MakeEnvelope + LIMIT 10 fixed on server
- logAccess audit trail; never exposes authorId/fonte

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Unit test for bbox parsing (pure logic extracted)

**Files:**

- Create: `apps/web/src/lib/recent-incidents.test.ts`

**Interfaces:**

- Consumes: nothing external — tests the bbox validation logic as a pure function
- Produces: confidence that the 4-finite-number validation is correct

The bbox validation is a 2-line expression inside the route. Extract it as a named pure function so it is independently testable, then import it in the route.

- [ ] **Step 1: Add a pure helper file**

```typescript
// apps/web/src/lib/bbox.ts
/**
 * Parses a bbox query string "w,s,e,n" into a 4-tuple of finite numbers.
 * Returns null if the string is missing, malformed, or contains non-finite values.
 */
export function parseBbox(raw: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as [number, number, number, number];
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// apps/web/src/lib/bbox.test.ts
import { describe, it, expect } from 'vitest';
import { parseBbox } from './bbox.js';

describe('parseBbox', () => {
  it('returns null for null input', () => {
    expect(parseBbox(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBbox('')).toBeNull();
  });

  it('returns null for fewer than 4 parts', () => {
    expect(parseBbox('-43.3,-23.1,-43.0')).toBeNull();
  });

  it('returns null for more than 4 parts', () => {
    expect(parseBbox('-43.3,-23.1,-43.0,-22.8,0')).toBeNull();
  });

  it('returns null when any part is NaN', () => {
    expect(parseBbox('-43.3,abc,-43.0,-22.8')).toBeNull();
  });

  it('returns null when any part is Infinity', () => {
    expect(parseBbox('Infinity,-23.1,-43.0,-22.8')).toBeNull();
  });

  it('returns the 4-tuple for valid Rio bbox', () => {
    expect(parseBbox('-43.3,-23.1,-43.0,-22.8')).toEqual([-43.3, -23.1, -43.0, -22.8]);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (parseBbox not yet imported in test)**

```powershell
pnpm --filter @radar-urbano/web test -- --reporter=verbose 2>&1 | Select-String -Pattern "parseBbox|FAIL|PASS|ERROR" | Select-Object -First 20
```

Expected output includes: `FAIL` or `Cannot find module './bbox.js'`.

- [ ] **Step 4: The helper file already exists (Step 1). Now update the route to use it**

```typescript
// apps/web/src/app/api/incidents/recent/route.ts
// Replace the inline bbox parsing with:
import { parseBbox } from '@/lib/bbox';

// ... inside GET():
const bbox = parseBbox(searchParams.get('bbox'));
if (!bbox) {
  return NextResponse.json({ error: 'bbox inválido. Use ?bbox=w,s,e,n' }, { status: 422 });
}
const [w, s, e, n] = bbox;
```

Full updated route file:

```typescript
// apps/web/src/app/api/incidents/recent/route.ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { logAccess } from '@/lib/audit';
import { parseBbox } from '@/lib/bbox';

export const dynamic = 'force-dynamic';

interface Row extends Record<string, unknown> {
  id: string;
  ref_code: string;
  title: string;
  status: string;
  trust_score: number;
  occurred_at: string;
  category_label: string;
  category_color: string;
  lng: number;
  lat: number;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (!(await rateLimit(`recent:${session.user.id}`, 60, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const bbox = parseBbox(searchParams.get('bbox'));
  if (!bbox) {
    return NextResponse.json({ error: 'bbox inválido. Use ?bbox=w,s,e,n' }, { status: 422 });
  }
  const [w, s, e, n] = bbox;

  const rows = await db.execute<Row>(sql`
    SELECT
      i.id,
      i.ref_code,
      i.title,
      i.status,
      i.trust_score,
      to_char(i.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at,
      c.label  AS category_label,
      c.color  AS category_color,
      ST_X(i.location::geometry) AS lng,
      ST_Y(i.location::geometry) AS lat
    FROM incidents i
    JOIN incident_categories c ON c.slug = i.category_slug
    WHERE i.location && ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)::geography
    ORDER BY i.occurred_at DESC
    LIMIT 10
  `);

  await logAccess('list', {
    userId: session.user.id,
    meta: { bbox },
  });

  const incidents = rows.map((row) => ({
    id: row.id,
    refCode: row.ref_code,
    title: row.title,
    categoryLabel: row.category_label,
    categoryColor: row.category_color,
    status: row.status,
    trustScore: Number(row.trust_score),
    occurredAt: row.occurred_at,
    lng: Number(row.lng),
    lat: Number(row.lat),
  }));

  return NextResponse.json({ incidents });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```powershell
pnpm --filter @radar-urbano/web test -- --reporter=verbose 2>&1 | Select-String -Pattern "parseBbox|FAIL|PASS|ERROR" | Select-Object -First 30
```

Expected: all `parseBbox` tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/lib/bbox.ts apps/web/src/lib/bbox.test.ts apps/web/src/app/api/incidents/recent/route.ts
git commit -m "test(web): unit-test bbox parsing; extract parseBbox helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Refactor Map.tsx — forwardRef + MapHandle + onBboxChange

**Files:**

- Modify: `apps/web/src/components/Map.tsx`

**Interfaces:**

- Produces: `export type RecentIncident = { id: string; refCode: string; title: string; categoryLabel: string; categoryColor: string; status: string; trustScore: number; occurredAt: string; lng: number; lat: number }`
- Produces: `export type MapHandle = { showIncident: (i: RecentIncident) => void }`
- Produces: `Map` component accepts `{ onBboxChange?: (bbox: [number, number, number, number]) => void }` prop
- Consumes nothing new from earlier tasks

- [ ] **Step 1: Replace Map.tsx completely**

```typescript
// apps/web/src/components/Map.tsx
'use client';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
};

const RIO: [number, number] = [-43.1789, -22.9068];

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export type RecentIncident = {
  id: string;
  refCode: string;
  title: string;
  categoryLabel: string;
  categoryColor: string;
  status: string;
  trustScore: number;
  occurredAt: string;
  lng: number;
  lat: number;
};

export type MapHandle = {
  showIncident: (i: RecentIncident) => void;
};

type MapProps = {
  onBboxChange?: (bbox: [number, number, number, number]) => void;
};

export const Map = forwardRef<MapHandle, MapProps>(function Map(
  { onBboxChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useImperativeHandle(ref, () => ({
    showIncident(item: RecentIncident) {
      const map = mapRef.current;
      const popup = popupRef.current;
      if (!map || !popup) return;
      map.flyTo({ center: [item.lng, item.lat], zoom: Math.max(15, map.getZoom()) });
      popup
        .setLngLat([item.lng, item.lat])
        .setHTML(
          `<div style="font-family:'IBM Plex Sans',sans-serif;width:240px;">` +
            `<div style="height:4px;background:${item.categoryColor ?? '#0e5c63'};"></div>` +
            `<div style="padding:12px 14px;">` +
            `<strong style="font-size:14px;font-weight:600;color:#11181f;">${escapeHtml(item.title)}</strong><br/>` +
            `<span style="font-size:12px;color:#5a6470;">${escapeHtml(item.categoryLabel)} · ${escapeHtml(item.status)}</span><br/>` +
            `<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8a857a;">${escapeHtml(item.refCode)}</span>` +
            ` · <span style="font-size:11px;color:#8a857a;">confiança ${item.trustScore}</span>` +
            `</div></div>`,
        )
        .addTo(map);
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: RIO,
      zoom: 11,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' });
    popupRef.current = popup;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    );

    function emitBbox() {
      if (!onBboxChange) return;
      const b = map.getBounds();
      onBboxChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }

    map.on('load', () => {
      map.addSource('heat', {
        type: 'raster',
        tiles: [`${location.origin}/api/tiles/{z}/{x}/{y}.png`],
        tileSize: 256,
      });
      map.addLayer({
        id: 'heat',
        type: 'raster',
        source: 'heat',
        paint: { 'raster-opacity': 0.85 },
      });
      emitBbox();
    });

    map.on('moveend', emitBbox);

    map.on('click', async (e) => {
      const r = await fetch(
        `/api/incidents/near?lng=${e.lngLat.lng}&lat=${e.lngLat.lat}`,
      );
      if (!r.ok) return;
      const { incident } = await r.json();
      if (!incident) return;
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-family:'IBM Plex Sans',sans-serif;width:240px;">` +
            `<div style="height:4px;background:${incident.categoryColor ?? '#0e5c63'};"></div>` +
            `<div style="padding:12px 14px;">` +
            `<strong style="font-size:14px;font-weight:600;color:#11181f;">${escapeHtml(incident.title)}</strong><br/>` +
            `<span style="font-size:12px;color:#5a6470;">${escapeHtml(incident.categoryLabel)} · ${escapeHtml(incident.status)}</span><br/>` +
            `<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8a857a;">${escapeHtml(incident.refCode)}</span>` +
            ` · <span style="font-size:11px;color:#8a857a;">confiança ${incident.trustScore}</span>` +
            `</div></div>`,
        )
        .addTo(map);
    });

    return () => {
      mapRef.current = null;
      popupRef.current = null;
      map.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="h-full w-full" />;
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
pnpm --filter @radar-urbano/web typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/Map.tsx
git commit -m "refactor(web): Map → forwardRef with MapHandle.showIncident + onBboxChange

- Exposes showIncident(item) via useImperativeHandle: flyTo + popup
- onBboxChange fires on map load and moveend with [w,s,e,n] tuple
- Exports RecentIncident and MapHandle types
- All existing behaviour preserved (basemap, heat layer, click popup, cleanup)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Update MapShell.tsx — wire bbox fetch + recent panel

**Files:**

- Modify: `apps/web/src/components/MapShell.tsx`

**Interfaces:**

- Consumes: `MapHandle`, `RecentIncident` exported from `./Map`
- Consumes: `GET /api/incidents/recent?bbox=w,s,e,n` endpoint from Task 1

- [ ] **Step 1: Replace MapShell.tsx completely**

```typescript
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

  function handleBboxChange(bbox: [number, number, number, number]) {
    if (fetchingRef.current) return; // simple in-flight guard
    fetchingRef.current = true;
    fetch(`/api/incidents/recent?bbox=${bbox.join(',')}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { incidents: RecentIncident[] }) => setRecent(data.incidents))
      .catch(() => {/* silently ignore; user may be unauthenticated or rate-limited */})
      .finally(() => { fetchingRef.current = false; });
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
                  <p className="truncate text-[13px] font-medium text-tinta">
                    {item.title}
                  </p>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
pnpm --filter @radar-urbano/web typecheck
```

Expected: exit 0.

- [ ] **Step 3: Run full build**

```powershell
pnpm --filter @radar-urbano/web build 2>&1 | Select-Object -Last 20
```

Expected: `Route (app)` table printed, exit 0 (no errors).

- [ ] **Step 4: Run tests**

```powershell
pnpm --filter @radar-urbano/web test -- --reporter=verbose 2>&1 | Select-Object -Last 30
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/MapShell.tsx
git commit -m "feat(web): viewport recent-incidents panel (gated, capped, audited)

- Right panel lists ≤10 most recent incidents in visible map area
- Fetches /api/incidents/recent on map load and moveend (in-flight guard)
- Click on row → mapRef.showIncident → flyTo + popup
- Relative-time formatter (pt-BR): agora / há N min / há N h / há N d
- No authorId or fonte ever exposed in UI or API

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Smoke test + final commit

**Files:**

- Read: `.superpowers/sdd/scratch/recent-panel-report.md` (create this)

**Interfaces:**

- Consumes: running dev server (separate port from prod), valid session cookie

- [ ] **Step 1: Confirm unauthenticated → 401**

```powershell
# Start dev server on port 3001 (3000 may be taken by Docker)
# Run in background first, then test
$proc = Start-Process -FilePath "pnpm" -ArgumentList "--filter", "@radar-urbano/web", "dev", "--port", "3001" -PassThru -NoNewWindow
Start-Sleep -Seconds 15
$r = Invoke-WebRequest -Uri "http://localhost:3001/api/incidents/recent?bbox=-43.3,-23.1,-43.0,-22.8" -UseBasicParsing -ErrorAction SilentlyContinue
Write-Host "Status: $($r.StatusCode)"
# Expected: 401
$proc.Kill()
```

Expected output: `Status: 401`

- [ ] **Step 2: Confirm build passes cleanly**

```powershell
pnpm --filter @radar-urbano/web build 2>&1 | Select-Object -Last 10
```

Expected: exit 0, route `/api/incidents/recent` appears in the route table.

- [ ] **Step 3: Write report file**

Create `C:\Users\anderson.linhares\radar-urbano\.superpowers\sdd\scratch\recent-panel-report.md` with:

- Implementation summary
- Files created/modified
- Build/test/smoke results
- Security confirmation: cap 10 + gated(401) + no authorId

- [ ] **Step 4: Final squash commit (if needed) or tag**

If all prior commits are clean, no further commit needed. Otherwise:

```powershell
git log --oneline -6
```

Verify the 4 feature commits are present and clean.

---

## Self-Review

### Spec coverage check

| Spec requirement                                                 | Task          |
| ---------------------------------------------------------------- | ------------- |
| `export const dynamic = 'force-dynamic'`                         | Task 1        |
| `requireSession()` → 401                                         | Task 1        |
| `rateLimit('recent:'+userId, 60, 60)` → 429                      | Task 1        |
| bbox validation (4 finite numbers) → 422                         | Task 1 + 2    |
| PostGIS ST_MakeEnvelope, LIMIT 10                                | Task 1        |
| `logAccess('list', ...)`                                         | Task 1        |
| Response: `{ incidents: [...] }` without authorId/fonte          | Task 1        |
| `lat`/`lng` via ST_X/ST_Y                                        | Task 1        |
| `forwardRef` + `MapHandle.showIncident`                          | Task 3        |
| `showIncident` → flyTo + popup (reusing existing HTML)           | Task 3        |
| `onBboxChange` prop fires on load + moveend                      | Task 3        |
| `RecentIncident` type exported from Map.tsx                      | Task 3        |
| `MapHandle` type exported from Map.tsx                           | Task 3        |
| Existing Map features preserved                                  | Task 3        |
| `mapRef = useRef<MapHandle>(null)` in MapShell                   | Task 4        |
| `recent` state, `fetch` on bbox change, in-flight guard          | Task 4        |
| Panel: header "ÚLTIMAS OCORRÊNCIAS · N"                          | Task 4        |
| Panel: color square, title, categoryLabel·status·relTime         | Task 4        |
| Click row → `showIncident(item)`                                 | Task 4        |
| build PASS                                                       | Task 4 + 5    |
| test PASS                                                        | Task 4 + 5    |
| smoke: 401 unauthenticated                                       | Task 5        |
| commit with exact subject                                        | Task 4 step 5 |
| report file at `.superpowers/sdd/scratch/recent-panel-report.md` | Task 5        |

### Placeholder scan: None found. All steps contain actual code.

### Type consistency check

- `RecentIncident` defined once in `Map.tsx`, imported in `MapShell.tsx`. Property names `id, refCode, title, categoryLabel, categoryColor, status, trustScore, occurredAt, lng, lat` are consistent across API response mapping (Task 1), type definition (Task 3), and panel render (Task 4). ✓
- `MapHandle.showIncident(i: RecentIncident)` defined in Task 3 and called as `mapRef.current?.showIncident(item)` in Task 4. ✓
- `onBboxChange?: (bbox: [number, number, number, number]) => void` defined in Task 3, consumed as `handleBboxChange` in Task 4. ✓
- `parseBbox` returns `[number, number, number, number] | null`, destructured as `[w, s, e, n]` in Task 2. ✓
