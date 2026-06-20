'use client';
import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PROVENANCE_META, provenanceKind, type ProvenanceKind } from './provenance';

const RIO: [number, number] = [-43.1789, -22.9068];

interface IncidentProps {
  id: string;
  refCode: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  sourceKind: string;
  status: string;
  trustScore: number;
  title: string;
  occurredAt: string;
}

type IncidentFeature = GeoJSON.Feature<GeoJSON.Point, IncidentProps>;
type IncidentCollection = GeoJSON.FeatureCollection<GeoJSON.Point, IncidentProps>;

export interface MapHandle {
  /** Fly to an incident by id and open its popup. */
  focusIncident: (id: string) => void;
}

interface MapProps {
  /** toggles from the parent shell */
  showHeatmap: boolean;
  showMarkers: boolean;
  onLoaded?: () => void;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}

/** Builds the custom DOM element for a provenance-typed marker. */
function buildMarkerEl(kind: ProvenanceKind, accent: string): HTMLDivElement {
  const meta = PROVENANCE_META[kind];
  const el = document.createElement('div');
  el.className = 'ru-marker';

  if (kind === 'oficial') {
    el.style.cssText =
      'width:28px;height:28px;border-radius:4px;background:#11181f;border:2px solid #f4f1ea;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600;';
    el.style.color = '#3fb6a8';
    el.textContent = '★';
    return el;
  }
  if (kind === 'comunidade') {
    el.style.cssText =
      'width:26px;height:26px;border-radius:50%;background:#fbfaf6;border:2.5px solid #5a6470;box-shadow:0 3px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;';
    const dot = document.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#5a6470;';
    el.appendChild(dot);
    return el;
  }
  // verificado / atencao → teardrop
  const bg = kind === 'verificado' ? accent : meta.color;
  el.style.cssText = `width:28px;height:28px;border-radius:50% 50% 50% 2px;transform:rotate(45deg);background:${bg};box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;`;
  const glyph = document.createElement('span');
  glyph.style.cssText = `transform:rotate(-45deg);font-size:14px;font-weight:700;color:${kind === 'atencao' ? '#11181f' : '#fff'};`;
  glyph.textContent = meta.glyph;
  el.appendChild(glyph);
  return el;
}

function popupHtml(p: IncidentProps): string {
  const kind = provenanceKind(p);
  const meta = PROVENANCE_META[kind];
  const trust = Math.max(0, Math.min(100, p.trustScore));
  return `
    <div style="width:264px;font-family:'IBM Plex Sans',sans-serif;">
      <div style="height:4px;background:${p.categoryColor};"></div>
      <div style="padding:14px 16px;">
        <div style="font-size:14px;font-weight:600;line-height:1.35;color:#11181f;margin-bottom:8px;">${p.title}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <span style="display:inline-flex;align-items:center;gap:4px;border-radius:100px;padding:2px 8px;font-family:'IBM Plex Mono',monospace;font-size:11px;background:${meta.color}1a;color:${meta.color};">${meta.glyph} ${meta.label}</span>
          <span style="font-size:12px;color:#5a6470;">${p.categoryLabel}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8a857a;margin-bottom:10px;">
          <span>${p.refCode}</span>
          <span>${relativeTime(p.occurredAt)}</span>
        </div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.08em;color:#8a857a;margin-bottom:5px;">CONFIANÇA ${trust}</div>
        <div style="height:6px;border-radius:3px;background:#efebe1;overflow:hidden;">
          <div style="height:6px;border-radius:3px;width:${trust}%;background:#0e5c63;"></div>
        </div>
      </div>
    </div>`;
}

export const Map = forwardRef<MapHandle, MapProps>(function Map(
  { showHeatmap, showMarkers, onLoaded },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef(new globalThis.Map<string, maplibregl.Marker>());
  const popupsRef = useRef(new globalThis.Map<string, maplibregl.Popup>());
  const featuresRef = useRef(new globalThis.Map<string, IncidentFeature>());
  const loadedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focusIncident(id: string) {
      const map = mapRef.current;
      const feature = featuresRef.current.get(id);
      if (!map || !feature) return;
      const lng = feature.geometry.coordinates[0] ?? 0;
      const lat = feature.geometry.coordinates[1] ?? 0;
      map.flyTo({ center: [lng, lat], zoom: 15, speed: 1.2 });
      const popup = popupsRef.current.get(id);
      const marker = markersRef.current.get(id);
      if (popup && marker) {
        popup.setLngLat([lng, lat]).addTo(map);
      }
    },
  }));

  // Init map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL!,
      center: RIO,
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', async () => {
      const data: IncidentCollection = await fetch('/api/incidents').then((r) => r.json());

      map.addSource('incidents', { type: 'geojson', data });
      map.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'incidents',
        layout: { visibility: 'visible' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'trustScore'], 0, 0, 100, 1],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(63,182,168,0)',
            0.2,
            '#3fb6a8',
            0.4,
            '#a9cf7e',
            0.6,
            '#e0a93b',
            0.8,
            '#d2702f',
            1,
            '#a8332f',
          ],
          'heatmap-radius': 38,
          'heatmap-opacity': 0.8,
        },
      });

      // Custom DOM markers per feature.
      for (const f of data.features) {
        const p = f.properties;
        const lng = f.geometry.coordinates[0] ?? 0;
        const lat = f.geometry.coordinates[1] ?? 0;
        const kind = provenanceKind(p);
        const el = buildMarkerEl(kind, p.categoryColor || '#0e5c63');
        const popup = new maplibregl.Popup({
          offset: 22,
          closeButton: true,
          maxWidth: '280px',
        }).setHTML(popupHtml(p));
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.set(p.id, marker);
        popupsRef.current.set(p.id, popup);
        featuresRef.current.set(p.id, f);
      }

      loadedRef.current = true;
      applyVisibility();
      onLoaded?.();
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      popupsRef.current.clear();
      featuresRef.current.clear();
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Apply layer/marker visibility on toggle changes.
  function applyVisibility() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (map.getLayer('heat')) {
      map.setLayoutProperty('heat', 'visibility', showHeatmap ? 'visible' : 'none');
    }
    markersRef.current.forEach((m) => {
      m.getElement().style.display = showMarkers ? '' : 'none';
    });
  }

  useEffect(applyVisibility, [showHeatmap, showMarkers]);

  return <div ref={containerRef} className="h-full w-full" />;
});
