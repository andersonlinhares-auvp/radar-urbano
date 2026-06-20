'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const RIO: [number, number] = [-43.1729, -22.9068];

export function Map() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL!,
      center: RIO,
      zoom: 11,
    });
    map.on('load', async () => {
      const data = await fetch('/api/incidents').then((r) => r.json());
      map.addSource('incidents', { type: 'geojson', data });
      map.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'incidents',
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
          'heatmap-radius': 30,
        },
      });
      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'incidents',
        minzoom: 13,
        paint: {
          'circle-radius': 6,
          'circle-color': '#0e5c63',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fbfaf6',
        },
      });
    });
    return () => map.remove();
  }, []);
  return <div ref={ref} className="h-screen w-full" />;
}
