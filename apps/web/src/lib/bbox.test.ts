import { describe, it, expect } from 'vitest';
import { parseBbox } from './bbox.js';

describe('parseBbox', () => {
  it('returns null for null input', () => {
    expect(parseBbox(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBbox('')).toBeNull();
  });

  it('returns null for fewer than 4 parts', () => {
    expect(parseBbox('-43.3,-23.1,-43.0')).toBeNull();
  });

  it('returns null for more than 4 parts', () => {
    expect(parseBbox('-43.3,-23.1,-43.0,-22.8,0')).toBeNull();
  });

  it('returns null when any part is NaN', () => {
    expect(parseBbox('-43.3,abc,-43.0,-22.8')).toBeNull();
  });

  it('returns null when any part is Infinity', () => {
    expect(parseBbox('Infinity,-23.1,-43.0,-22.8')).toBeNull();
  });

  it('returns the 4-tuple for valid Rio bbox', () => {
    expect(parseBbox('-43.3,-23.1,-43.0,-22.8')).toEqual([-43.3, -23.1, -43.0, -22.8]);
  });
});
