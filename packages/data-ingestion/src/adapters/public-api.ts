import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

export const publicApiAdapter: SourceAdapter = {
  id: 'public-api',
  sourceKind: 'PARTNER',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.id),
      categorySlug: 'outro',
      title: String(raw.title ?? 'Ocorrência'),
      lng: Number(raw.lng),
      lat: Number(raw.lat),
      occurredAt: new Date(String(raw.timestamp)),
    };
  },
};
