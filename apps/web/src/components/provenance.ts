/**
 * Provenance semantics shared by the map markers, legend, popups and panel rows.
 * Each incident is classified by source + status into a visual "kind":
 *  - verificado  → CONFIRMED status (teardrop, petróleo, ✓)
 *  - oficial     → OFFICIAL source (dark rounded square, ★ in petróleo-400)
 *  - atencao     → armed-violence categories / pending high-risk (amber teardrop, !)
 *  - comunidade  → community report (hollow ardósia circle)
 */
export type ProvenanceKind = 'verificado' | 'oficial' | 'atencao' | 'comunidade';

export interface IncidentLike {
  sourceKind: string;
  status: string;
  category?: string;
}

const ARMED_VIOLENCE = new Set(['disparo-arma', 'tiroteio', 'confronto-policial']);

export function provenanceKind(i: IncidentLike): ProvenanceKind {
  if (i.sourceKind === 'OFFICIAL') return 'oficial';
  if (i.status === 'CONFIRMED' || i.status === 'RESOLVED') return 'verificado';
  if (i.category && ARMED_VIOLENCE.has(i.category)) return 'atencao';
  if (i.sourceKind === 'COMMUNITY') return 'comunidade';
  return 'atencao';
}

export interface ProvenanceMeta {
  label: string;
  /** accent color */
  color: string;
  /** glyph rendered inside the marker / badge */
  glyph: string;
}

export const PROVENANCE_META: Record<ProvenanceKind, ProvenanceMeta> = {
  verificado: { label: 'Verificado', color: '#0e5c63', glyph: '✓' },
  oficial: { label: 'Oficial', color: '#3fb6a8', glyph: '★' },
  atencao: { label: 'Atenção', color: '#e0a93b', glyph: '!' },
  comunidade: { label: 'Comunidade', color: '#5a6470', glyph: '●' },
};
