import type { CategorySlug } from '@radar-urbano/core';
import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

export const geoJsonAdapter: SourceAdapter = {
  id: 'geojson',
  sourceKind: 'PARTNER',
  async fetch() {
    // Stub: ingestão real lê um arquivo/URL GeoJSON. Sem scraping agressivo.
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    const f = raw as {
      geometry: { coordinates: [number, number] };
      properties: Record<string, unknown>;
    };
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties;
    return {
      externalId: String(p.externalId),
      categorySlug: (p.category as CategorySlug) ?? 'outro',
      title: String(p.title ?? 'Ocorrência'),
      description: p.description ? String(p.description) : undefined,
      lng,
      lat,
      occurredAt: new Date(String(p.occurredAt)),
    };
  },
};
