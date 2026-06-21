'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const RIO: [number, number] = [-43.1789, -22.9068];

export function Map() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL!,
      center: RIO,
      zoom: 11,
      attributionControl: false,
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
            `<strong style="font-size:14px;font-weight:600;color:#11181f;">${incident.title}</strong><br/>` +
            `<span style="font-size:12px;color:#5a6470;">${incident.categoryLabel} · ${incident.status}</span><br/>` +
            `<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8a857a;">${incident.refCode}</span>` +
            ` · <span style="font-size:11px;color:#8a857a;">confiança ${incident.trustScore}</span>` +
            `</div></div>`,
        )
        .addTo(map);
    });

    return () => map.remove();
  }, []);
  return <div ref={ref} className="h-full w-full" />;
}
