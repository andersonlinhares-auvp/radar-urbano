import { describe, it, expect } from 'vitest';
import { computeTrustScore, nextReputation, REP_MAX } from './trust-score.js';
import type { TrustInput } from './types.js';

const base: TrustInput = {
  sourceKind: 'COMMUNITY',
  confirms: 0,
  disputes: 0,
  authorReputation: 0,
  hasPhoto: false,
  hasVideo: false,
  recurrenceCount: 0,
};

describe('computeTrustScore', () => {
  it('returns a value within [0,100]', () => {
    const s = computeTrustScore(base);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
  it('official sources score higher than community, all else equal', () => {
    const community = computeTrustScore({ ...base, sourceKind: 'COMMUNITY' });
    const official = computeTrustScore({ ...base, sourceKind: 'OFFICIAL' });
    expect(official).toBeGreaterThan(community);
  });
  it('confirmations increase the score with diminishing returns', () => {
    const one = computeTrustScore({ ...base, confirms: 1 });
    const five = computeTrustScore({ ...base, confirms: 5 });
    const ten = computeTrustScore({ ...base, confirms: 10 });
    expect(five).toBeGreaterThan(one);
    expect(ten - five).toBeLessThan(five - one);
  });
  it('disputes offset confirmations', () => {
    const net = computeTrustScore({ ...base, confirms: 5, disputes: 5 });
    const positive = computeTrustScore({ ...base, confirms: 5, disputes: 0 });
    expect(net).toBeLessThan(positive);
  });
  it('evidence raises the score', () => {
    const none = computeTrustScore(base);
    const photo = computeTrustScore({ ...base, hasPhoto: true });
    const both = computeTrustScore({ ...base, hasPhoto: true, hasVideo: true });
    expect(photo).toBeGreaterThan(none);
    expect(both).toBeGreaterThan(photo);
  });
  it('a fully-corroborated official report approaches 100', () => {
    const s = computeTrustScore({
      sourceKind: 'OFFICIAL',
      confirms: 20,
      disputes: 0,
      authorReputation: REP_MAX,
      hasPhoto: true,
      hasVideo: true,
      recurrenceCount: 10,
    });
    expect(s).toBeGreaterThan(90);
  });
});

describe('nextReputation', () => {
  it('rewards confirmed reports and penalizes rejected ones', () => {
    expect(nextReputation(50, 'CONFIRMED')).toBeGreaterThan(50);
    expect(nextReputation(50, 'REJECTED')).toBeLessThan(50);
  });
  it('clamps within [0, REP_MAX]', () => {
    expect(nextReputation(REP_MAX, 'CONFIRMED')).toBeLessThanOrEqual(REP_MAX);
    expect(nextReputation(0, 'REJECTED')).toBeGreaterThanOrEqual(0);
  });
});
