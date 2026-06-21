import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('segredo123');
    expect(hash).not.toBe('segredo123');
    expect(await verifyPassword('segredo123', hash)).toBe(true);
  });
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('segredo123');
    expect(await verifyPassword('errado', hash)).toBe(false);
  });
});
