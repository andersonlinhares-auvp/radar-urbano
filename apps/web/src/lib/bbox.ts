/**
 * Parses a bbox query string "w,s,e,n" into a 4-tuple of finite numbers.
 * Returns null if the string is missing, malformed, or contains non-finite values.
 */
export function parseBbox(raw: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as [number, number, number, number];
}
