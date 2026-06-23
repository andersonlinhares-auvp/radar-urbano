import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

// Stub: prepara a arquitetura para ingestão futura de dados do IBGE
// (recortes territoriais/demográficos oficiais). Não realiza scraping.
export const ibgeAdapter: SourceAdapter = {
  id: 'ibge',
  sourceKind: 'OFFICIAL',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.id),
      categorySlug: 'outro',
      title: String(raw.titulo ?? 'Registro IBGE'),
      lng: Number(raw.longitude),
      lat: Number(raw.latitude),
      occurredAt: new Date(String(raw.data)),
    };
  },
};
