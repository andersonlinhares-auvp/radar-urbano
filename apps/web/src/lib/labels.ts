// apps/web/src/lib/labels.ts

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Em análise',
  CONFIRMED: 'Confirmado',
  REJECTED: 'Descartado',
  RESOLVED: 'Resolvido',
};

/**
 * Returns a human-readable trust band label for a score (0–100).
 * <40  → "Pouco confirmado"
 * 40–69 → "Parcialmente confirmado"
 * ≥70  → "Bem confirmado"
 */
export function trustLabel(score: number): string {
  if (score < 40) return 'Pouco confirmado';
  if (score < 70) return 'Parcialmente confirmado';
  return 'Bem confirmado';
}

/**
 * Returns a relative time string in pt-BR for an ISO 8601 timestamp.
 * "agora"     — less than 1 minute ago
 * "há X min"  — 1–59 minutes
 * "há X h"    — 1–23 hours
 * "há 1 dia"  — exactly 1 day
 * "há X dias" — 2+ days
 */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}
