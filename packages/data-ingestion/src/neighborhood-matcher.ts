import { normalizeText, containsPhrase } from './text-utils.js';
import type { NeighborhoodRef } from './types.js';

interface Indexed {
  ref: NeighborhoodRef;
  norm: string;
}

let cachedRaw: readonly NeighborhoodRef[] | null = null;
let cachedIndex: Indexed[] = [];

function buildIndex(gazetteer: readonly NeighborhoodRef[]): Indexed[] {
  if (cachedRaw === gazetteer) return cachedIndex;
  cachedRaw = gazetteer;
  cachedIndex = gazetteer
    .map((ref) => ({ ref, norm: normalizeText(ref.name) }))
    .filter((x) => x.norm.length >= 3)
    .sort((a, b) => b.norm.length - a.norm.length); // nome mais longo primeiro
  return cachedIndex;
}

/** Retorna o bairro cujo nome (normalizado, mais longo) aparece no texto, ou null. */
export function matchNeighborhood(
  text: string,
  gazetteer: readonly NeighborhoodRef[],
): NeighborhoodRef | null {
  const haystack = normalizeText(text);
  const index = buildIndex(gazetteer);
  for (const { ref, norm } of index) {
    if (containsPhrase(haystack, norm)) return ref;
  }
  return null;
}
