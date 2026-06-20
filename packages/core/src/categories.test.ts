import { describe, it, expect } from 'vitest';
import { CATEGORIES, getCategory } from './categories.js';

describe('categories', () => {
  it('has the 19 Brazilian categories', () => {
    expect(CATEGORIES).toHaveLength(19);
  });
  it('every category has icon, color, weight in [0,1] and description', () => {
    for (const c of CATEGORIES) {
      expect(c.icon).toBeTruthy();
      expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.riskWeight).toBeGreaterThanOrEqual(0);
      expect(c.riskWeight).toBeLessThanOrEqual(1);
      expect(c.description.length).toBeGreaterThan(5);
    }
  });
  it('slugs are unique', () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it('getCategory returns the matching category', () => {
    expect(getCategory('tiroteio').label).toBe('Tiroteio');
  });
  it('getCategory throws on unknown slug', () => {
    // @ts-expect-error testing runtime guard
    expect(() => getCategory('inexistente')).toThrow();
  });
  it('armed-violence categories carry the highest weights', () => {
    expect(getCategory('tiroteio').riskWeight).toBeGreaterThanOrEqual(0.9);
    expect(getCategory('outro').riskWeight).toBeLessThanOrEqual(0.3);
  });
});
