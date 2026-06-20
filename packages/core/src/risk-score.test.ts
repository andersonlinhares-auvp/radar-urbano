import { describe, it, expect } from 'vitest';
import {
  riskContribution,
  aggregateRisk,
  normalizeRisk,
  riskBand,
  RISK_BAND_COLOR,
} from './risk-score.js';
import type { RiskInput } from './types.js';

const fresh: RiskInput = { categoryWeight: 1, trustScore: 100, ageDays: 0 };

describe('riskContribution', () => {
  it('is maximal for a fresh, fully-trusted, max-weight incident', () => {
    expect(riskContribution(fresh)).toBeCloseTo(1, 5);
  });
  it('decays with age', () => {
    const old = riskContribution({ ...fresh, ageDays: 30 });
    expect(old).toBeLessThan(riskContribution(fresh));
  });
  it('scales with trust score', () => {
    const low = riskContribution({ ...fresh, trustScore: 20 });
    expect(low).toBeLessThan(riskContribution(fresh));
  });
});

describe('aggregateRisk', () => {
  it('sums contributions divided by area factor', () => {
    const raw = aggregateRisk([fresh, fresh], 2);
    expect(raw).toBeCloseTo(1, 5);
  });
  it('returns 0 for no incidents', () => {
    expect(aggregateRisk([], 1)).toBe(0);
  });
});

describe('normalizeRisk', () => {
  it('maps to 0..100 against city max', () => {
    expect(normalizeRisk(5, 10)).toBe(50);
    expect(normalizeRisk(20, 10)).toBe(100);
    expect(normalizeRisk(0, 10)).toBe(0);
  });
});

describe('riskBand', () => {
  it('classifies scores into bands', () => {
    expect(riskBand(10)).toBe('BAIXO');
    expect(riskBand(45)).toBe('MEDIO');
    expect(riskBand(70)).toBe('ALTO');
    expect(riskBand(90)).toBe('CRITICO');
  });
  it('maps bands to design colors', () => {
    expect(RISK_BAND_COLOR.BAIXO).toBe('#3e8e7e');
    expect(RISK_BAND_COLOR.CRITICO).toBe('#a8332f');
  });
});
