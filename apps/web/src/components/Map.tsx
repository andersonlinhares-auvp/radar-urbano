// apps/web/src/components/Map.tsx
'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
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
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
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

export const Map = forwardRef<MapHandle, MapProps>(function Map({ onBboxChange }, ref) {
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

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

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
      const r = await fetch(`/api/incidents/near?lng=${e.lngLat.lng}&lat=${e.lngLat.lat}`);
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
  }, []);  

  return <div ref={containerRef} className="h-full w-full" />;
});
