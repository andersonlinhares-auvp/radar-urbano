import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

// Stub: prepara a arquitetura para ingestão futura do portal Data.Rio (Prefeitura do RJ).
// Não realiza scraping; espera datasets oficiais já disponibilizados.
export const dataRioAdapter: SourceAdapter = {
  id: 'data-rio',
  sourceKind: 'OFFICIAL',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.id),
      categorySlug: 'outro',
      title: String(raw.titulo ?? 'Ocorrência oficial'),
      lng: Number(raw.longitude),
      lat: Number(raw.latitude),
      occurredAt: new Date(String(raw.data)),
    };
  },
};
