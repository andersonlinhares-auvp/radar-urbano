'use client';
import { useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Basemap real (ruas + rótulos), dessaturado p/ combinar com o design.
// Carto Positron (light) — tiles OSM gratuitos, sem chave.
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

export function Map() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: BASE_STYLE,
      center: RIO,
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

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
    });

    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' });
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

    return () => map.remove();
  }, []);
  return <div ref={ref} className="h-full w-full" />;
}
