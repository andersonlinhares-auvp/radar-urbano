import { describe, it, expect } from 'vitest';
import { generateRefCode } from './ref-code.js';

describe('generateRefCode', () => {
  it('matches RU-XXXX with 4 uppercase alphanumerics', () => {
    expect(generateRefCode()).toMatch(/^RU-[A-Z0-9]{4}$/);
  });
  it('is reasonably unique across many calls', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateRefCode()));
    expect(codes.size).toBeGreaterThan(480);
  });
});
