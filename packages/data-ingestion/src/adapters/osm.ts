import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

// Stub: prepara a arquitetura para ingestão futura de dados do OpenStreetMap (Overpass).
// Não realiza scraping; espera extrações já baixadas.
export const osmAdapter: SourceAdapter = {
  id: 'osm',
  sourceKind: 'PARTNER',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.id),
      categorySlug: 'outro',
      title: String(raw.name ?? 'Ponto OSM'),
      lng: Number(raw.lon),
      lat: Number(raw.lat),
      occurredAt: new Date(String(raw.timestamp)),
    };
  },
};
