/** Minúsculas, sem acentos, pontuação→espaço, espaços colapsados. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** True se needle aparece em haystack com fronteira de não-letra (ambos já normalizados). */
export function containsPhrase(haystackNormalized: string, needleNormalized: string): boolean {
  if (!needleNormalized) return false;
  const i = haystackNormalized.indexOf(needleNormalized);
  if (i === -1) return false;
  const before = i === 0 ? ' ' : haystackNormalized[i - 1]!;
  const afterIdx = i + needleNormalized.length;
  const after = afterIdx >= haystackNormalized.length ? ' ' : haystackNormalized[afterIdx]!;
  const isLetter = (c: string) => /[a-z0-9]/.test(c);
  return !isLetter(before) && !isLetter(after);
}
