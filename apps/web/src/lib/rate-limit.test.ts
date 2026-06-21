import { describe, it, expect } from 'vitest';
import { allow } from './rate-limit.js';

describe('allow (pure decision)', () => {
  it('permite até o limite e bloqueia depois', () => {
    expect(allow(1, 3)).toBe(true); // count após incremento = 1
    expect(allow(3, 3)).toBe(true); // = limite
    expect(allow(4, 3)).toBe(false); // > limite
  });
});
