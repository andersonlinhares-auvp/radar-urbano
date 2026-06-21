import { describe, it, expect } from 'vitest';
import { tileToBBox } from './tiles.js';

describe('tileToBBox', () => {
  it('tile 0/0/0 cobre o mundo', () => {
    const b = tileToBBox(0, 0, 0);
    expect(b.west).toBeCloseTo(-180, 5);
    expect(b.east).toBeCloseTo(180, 5);
    expect(b.north).toBeCloseTo(85.0511, 3);
    expect(b.south).toBeCloseTo(-85.0511, 3);
  });
  it('tile 1/0/0 é o quadrante noroeste', () => {
    const b = tileToBBox(1, 0, 0);
    expect(b.west).toBeCloseTo(-180, 5);
    expect(b.east).toBeCloseTo(0, 5);
    expect(b.north).toBeCloseTo(85.0511, 3);
    expect(b.south).toBeCloseTo(0, 5);
  });
});
