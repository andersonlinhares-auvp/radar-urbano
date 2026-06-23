import { describe, it, expect } from 'vitest';
import { classifyCategory } from './classifier.js';

describe('classifyCategory', () => {
  it('tiroteio → tiroteio', () => {
    expect(classifyCategory('Tiroteio deixa feridos na Maré')).toBe('tiroteio');
  });
  it('baleado (sem a palavra tiroteio) → disparo-arma', () => {
    expect(classifyCategory('Homem é baleado em assalto na Penha')).toBe('disparo-arma');
  });
  it('operação policial → confronto-policial', () => {
    expect(classifyCategory('Operação policial no Alemão termina com confronto')).toBe(
      'confronto-policial',
    );
  });
  it('roubo de celular → roubo-celular', () => {
    expect(classifyCategory('Bandido rouba celular de pedestre em Copacabana')).toBe(
      'roubo-celular',
    );
  });
  it('alagamento → area-alagada', () => {
    expect(classifyCategory('Chuva forte causa alagamento na Tijuca')).toBe('area-alagada');
  });
  it('sem termo conhecido → null', () => {
    expect(classifyCategory('Inauguração de praça no Méier')).toBeNull();
  });
});
