import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

// Stub: prepara a arquitetura para ingestão futura de microdados do ISP-RJ.
// Não realiza scraping; espera arquivos oficiais já baixados.
export const ispRjAdapter: SourceAdapter = {
  id: 'isp-rj',
  sourceKind: 'OFFICIAL',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.fato_id),
      categorySlug: 'outro',
      title: String(raw.titulo_do_delito ?? 'Ocorrência oficial'),
      lng: Number(raw.longitude),
      lat: Number(raw.latitude),
      occurredAt: new Date(String(raw.data_fato)),
    };
  },
};
