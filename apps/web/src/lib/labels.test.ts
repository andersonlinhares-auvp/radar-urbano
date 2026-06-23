import { describe, it, expect } from 'vitest';
import { STATUS_LABELS, trustLabel, relativeTime } from './labels.js';

describe('STATUS_LABELS', () => {
  it('maps PENDING to Em análise', () => {
    expect(STATUS_LABELS['PENDING']).toBe('Em análise');
  });
  it('maps CONFIRMED to Confirmado', () => {
    expect(STATUS_LABELS['CONFIRMED']).toBe('Confirmado');
  });
  it('maps REJECTED to Descartado', () => {
    expect(STATUS_LABELS['REJECTED']).toBe('Descartado');
  });
  it('maps RESOLVED to Resolvido', () => {
    expect(STATUS_LABELS['RESOLVED']).toBe('Resolvido');
  });
});

describe('trustLabel', () => {
  it('returns Pouco confirmado for score < 40', () => {
    expect(trustLabel(0)).toBe('Pouco confirmado');
    expect(trustLabel(39)).toBe('Pouco confirmado');
  });
  it('returns Parcialmente confirmado for score 40–69', () => {
    expect(trustLabel(40)).toBe('Parcialmente confirmado');
    expect(trustLabel(57)).toBe('Parcialmente confirmado');
    expect(trustLabel(69)).toBe('Parcialmente confirmado');
  });
  it('returns Bem confirmado for score >= 70', () => {
    expect(trustLabel(70)).toBe('Bem confirmado');
    expect(trustLabel(100)).toBe('Bem confirmado');
  });
});

describe('relativeTime', () => {
  it('returns agora for less than 1 minute ago', () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(relativeTime(iso)).toBe('agora');
  });
  it('returns há X min for less than 60 minutes', () => {
    const iso = new Date(Date.now() - 15 * 60_000).toISOString();
    expect(relativeTime(iso)).toBe('há 15 min');
  });
  it('returns há X h for less than 24 hours', () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relativeTime(iso)).toBe('há 3 h');
  });
  it('returns há X dias for 24+ hours', () => {
    const iso = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(relativeTime(iso)).toBe('há 2 dias');
  });
  it('returns há 1 dia for exactly 1 day', () => {
    const iso = new Date(Date.now() - 1 * 86_400_000).toISOString();
    expect(relativeTime(iso)).toBe('há 1 dia');
  });
});
