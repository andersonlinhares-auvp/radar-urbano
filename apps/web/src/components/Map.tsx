// apps/web/src/components/Map.tsx
'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { STATUS_LABELS, trustLabel, relativeTime } from '@/lib/labels';

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

function buildPopupHTML(item: RecentIncident): string {
  const statusText = STATUS_LABELS[item.status] ?? item.status;
  const trust = trustLabel(item.trustScore);
  const time = relativeTime(item.occurredAt);
  const neighborhoodPart = item.neighborhood ? ` · ${escapeHtml(item.neighborhood)}` : '';
  const confirmText =
    item.confirmations === 1
      ? 'Confirmado por 1 pessoa'
      : item.confirmations > 1
        ? `Confirmado por ${item.confirmations} pessoas`
        : 'Nenhuma confirmação ainda';

  return (
    `<div style="font-family:'IBM Plex Sans',sans-serif;width:240px;">` +
    `<div style="height:4px;background:${item.categoryColor ?? '#0e5c63'};"></div>` +
    `<div style="padding:12px 14px;">` +
    `<strong style="font-size:14px;font-weight:600;color:#11181f;">${escapeHtml(item.title)}</strong>` +
    `<div style="margin-top:4px;font-size:12px;color:#5a6470;">${escapeHtml(item.categoryLabel)} · ${escapeHtml(time)}${neighborhoodPart}</div>` +
    `<div style="margin-top:4px;font-size:12px;color:#5a6470;">${escapeHtml(statusText)} · ${escapeHtml(confirmText)}</div>` +
    `<div style="margin-top:6px;display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#11181f;background:#e8f5f3;padding:2px 7px;border-radius:100px;">${escapeHtml(trust)}</div>` +
    `</div></div>`
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
  neighborhood?: string | null;
  confirmations: number;
};

export type MapHandle = {
  showIncident: (i: RecentIncident) => void;
};

type MapProps = {
  onBboxChange?: (bbox: [number, number, number, number]) => void;
  markers?: RecentIncident[];
};

export const Map = forwardRef<MapHandle, MapProps>(function Map({ onBboxChange, markers }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onBboxChangeRef = useRef(onBboxChange);
  useEffect(() => {
    onBboxChangeRef.current = onBboxChange;
  }, [onBboxChange]);

  function openIncidentPopup(item: RecentIncident) {
    const map = mapRef.current;
    const popup = popupRef.current;
    if (!map || !popup) return;
    map.flyTo({ center: [item.lng, item.lat], zoom: Math.max(15, map.getZoom()) });
    popup.setLngLat([item.lng, item.lat]).setHTML(buildPopupHTML(item)).addTo(map);
  }

  useImperativeHandle(ref, () => ({
    showIncident(item: RecentIncident) {
      openIncidentPopup(item);
    },
  }));

  // Sync Waze-style pin markers whenever the markers prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const item of markers ?? []) {
      const el = document.createElement('div');
      el.style.cssText = [
        'width:26px',
        'height:26px',
        'border-radius:50% 50% 50% 0',
        'transform:rotate(-45deg)',
        `background:${item.categoryColor ?? '#0e5c63'}`,
        'border:2px solid #fff',
        'box-shadow:0 2px 6px rgba(0,0,0,0.35)',
        'cursor:pointer',
      ].join(';');
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openIncidentPopup(item);
      });
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([item.lng, item.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [markers]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: RIO,
      zoom: 11,
      attributionControl: { compact: true },
      // Mapa sempre "de cima", sem rotação/inclinação (Ctrl+arrastar deixava torto).
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' });
    popupRef.current = popup;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    function emitBbox() {
      if (!onBboxChangeRef.current) return;
      const b = map.getBounds();
      onBboxChangeRef.current([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
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

    // O popup do relato só abre ao clicar no ícone (pin), nunca ao clicar perto no mapa.

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current = null;
      popupRef.current = null;
      map.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
});
