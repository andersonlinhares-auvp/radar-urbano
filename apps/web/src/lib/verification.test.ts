import { describe, it, expect } from 'vitest';
import {
  generateCode,
  isExpired,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  hashCode,
  verifyCode,
} from './verification.js';

describe('verification', () => {
  it('generates a 6-digit numeric code', () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });
  it('detects expiry against a reference time', () => {
    const now = new Date('2026-06-21T12:00:00Z');
    expect(isExpired(new Date('2026-06-21T11:59:00Z'), now)).toBe(true);
    expect(isExpired(new Date('2026-06-21T12:05:00Z'), now)).toBe(false);
  });
  it('exposes sane constants', () => {
    expect(CODE_TTL_MS).toBe(15 * 60_000);
    expect(MAX_ATTEMPTS).toBe(5);
  });
  it('hashes and verifies a code', async () => {
    const h = await hashCode('123456');
    expect(await verifyCode('123456', h)).toBe(true);
    expect(await verifyCode('000000', h)).toBe(false);
  });
});
