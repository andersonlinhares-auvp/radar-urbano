import type { RiskBand, RiskInput } from './types.js';

export const RISK_DECAY_LAMBDA = 0.05;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function riskContribution(input: RiskInput): number {
  const decay = Math.exp(-RISK_DECAY_LAMBDA * Math.max(0, input.ageDays));
  return input.categoryWeight * (input.trustScore / 100) * decay;
}

export function aggregateRisk(items: RiskInput[], areaFactor: number): number {
  if (items.length === 0) return 0;
  const factor = areaFactor <= 0 ? 1 : areaFactor;
  return items.reduce((sum, i) => sum + riskContribution(i), 0) / factor;
}

export function normalizeRisk(raw: number, cityMax: number): number {
  if (cityMax <= 0) return 0;
  return Math.round(clamp(raw / cityMax, 0, 1) * 100);
}

export function riskBand(score: number): RiskBand {
  if (score < 33) return 'BAIXO';
  if (score < 60) return 'MEDIO';
  if (score < 80) return 'ALTO';
  return 'CRITICO';
}

export const RISK_BAND_COLOR: Record<RiskBand, string> = {
  BAIXO: '#3e8e7e',
  MEDIO: '#e0a93b',
  ALTO: '#d2702f',
  CRITICO: '#a8332f',
};
