import type { SourceAdapter } from './types.js';

let registry = new Map<string, SourceAdapter>();

export function registerAdapter(adapter: SourceAdapter): void {
  registry.set(adapter.id, adapter);
}

export function getAdapter(id: string): SourceAdapter {
  const adapter = registry.get(id);
  if (!adapter) throw new Error(`Adapter desconhecido: ${id}`);
  return adapter;
}

export function listAdapters(): SourceAdapter[] {
  return [...registry.values()];
}

export function _resetRegistry(): void {
  registry = new Map();
}
