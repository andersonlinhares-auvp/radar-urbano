import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

export const csvAdapter: SourceAdapter = {
  id: 'csv',
  sourceKind: 'PARTNER',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.id),
      categorySlug: 'outro',
      title: String(raw.titulo ?? 'Ocorrência'),
      lng: Number(raw.lng),
      lat: Number(raw.lat),
      occurredAt: new Date(String(raw.data)),
    };
  },
};
