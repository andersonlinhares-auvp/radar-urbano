import { describe, it, expect } from 'vitest';
import { matchNeighborhood } from './neighborhood-matcher.js';
import type { NeighborhoodRef } from './types.js';

const GAZ: NeighborhoodRef[] = [
  { id: '1', name: 'Centro', lng: -43.18, lat: -22.9 },
  { id: '2', name: 'Rio Comprido', lng: -43.21, lat: -22.92 },
  { id: '3', name: 'Copacabana', lng: -43.18, lat: -22.97 },
];

describe('matchNeighborhood', () => {
  it('casa bairro por nome', () => {
    expect(matchNeighborhood('Assalto em Copacabana', GAZ)?.id).toBe('3');
  });
  it('nome mais longo vence (Rio Comprido, não Centro)', () => {
    expect(matchNeighborhood('Tiroteio no Rio Comprido', GAZ)?.id).toBe('2');
  });
  it('ignora acento e caixa', () => {
    expect(matchNeighborhood('fato no CENTRO da cidade', GAZ)?.id).toBe('1');
  });
  it('sem bairro → null', () => {
    expect(matchNeighborhood('Notícia sem bairro', GAZ)).toBeNull();
  });
});
