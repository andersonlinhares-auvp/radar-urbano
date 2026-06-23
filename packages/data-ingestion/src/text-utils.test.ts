import { describe, it, expect } from 'vitest';
import { normalizeText, containsPhrase } from './text-utils.js';

describe('normalizeText', () => {
  it('remove acentos e baixa caixa', () => {
    expect(normalizeText('Glória, Centro!')).toBe('gloria centro');
  });
  it('colapsa espaços', () => {
    expect(normalizeText('  São   João  ')).toBe('sao joao');
  });
});

describe('containsPhrase', () => {
  it('casa frase com fronteira', () => {
    expect(containsPhrase('tiroteio no rio comprido hoje', 'rio comprido')).toBe(true);
  });
  it('não casa substring parcial de palavra', () => {
    expect(containsPhrase('centroavulso aqui', 'centro')).toBe(false);
  });
  it('casa no início e fim', () => {
    expect(containsPhrase('centro', 'centro')).toBe(true);
  });
});
