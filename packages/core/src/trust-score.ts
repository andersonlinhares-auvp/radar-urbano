import type { SourceKind, TrustInput } from './types.js';

export const REP_MAX = 100;

export const SOURCE_FACTOR: Record<SourceKind, number> = {
  OFFICIAL: 1.0,
  PARTNER: 0.8,
  NEWS: 0.6,
  COMMUNITY: 0.4,
};

const WEIGHTS = { confirm: 0.3, source: 0.25, author: 0.15, evidence: 0.15, recurrence: 0.15 };
const K_CONFIRM = 0.5;
const K_RECUR = 0.5;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const saturating = (x: number, k: number) => 1 - Math.exp(-k * Math.max(0, x));

export function computeTrustScore(input: TrustInput): number {
  const C = saturating(input.confirms - input.disputes, K_CONFIRM);
  const S = SOURCE_FACTOR[input.sourceKind];
  const A = clamp(input.authorReputation / REP_MAX, 0, 1);
  const E = clamp((input.hasPhoto ? 0.5 : 0) + (input.hasVideo ? 0.5 : 0), 0, 1);
  const R = saturating(input.recurrenceCount, K_RECUR);

  const score =
    WEIGHTS.confirm * C +
    WEIGHTS.source * S +
    WEIGHTS.author * A +
    WEIGHTS.evidence * E +
    WEIGHTS.recurrence * R;

  return Math.round(clamp(score, 0, 1) * 100);
}

export function nextReputation(current: number, outcome: 'CONFIRMED' | 'REJECTED'): number {
  const baseDelta = 6;
  const damping = 1 / (1 + Math.abs(current - 50) / 50);
  const delta = baseDelta * damping * (outcome === 'CONFIRMED' ? 1 : -1.5);
  return clamp(Math.round(current + delta), 0, REP_MAX);
}
