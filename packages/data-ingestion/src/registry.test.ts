import { describe, it, expect, beforeEach } from 'vitest';
import { registerAdapter, getAdapter, listAdapters, _resetRegistry } from './registry.js';
import type { SourceAdapter } from './types.js';

const fake: SourceAdapter = {
  id: 'fake',
  sourceKind: 'COMMUNITY',
  async fetch() {
    return [];
  },
  normalize() {
    throw new Error('noop');
  },
};

describe('adapter registry', () => {
  beforeEach(() => _resetRegistry());
  it('registers and retrieves an adapter', () => {
    registerAdapter(fake);
    expect(getAdapter('fake')).toBe(fake);
  });
  it('lists registered adapters', () => {
    registerAdapter(fake);
    expect(listAdapters().map((a) => a.id)).toContain('fake');
  });
  it('throws on unknown adapter', () => {
    expect(() => getAdapter('nope')).toThrow();
  });
});
