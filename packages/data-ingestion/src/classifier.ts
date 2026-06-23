import type { CategorySlug } from '@radar-urbano/core';
import { normalizeText } from './text-utils.js';

// Regras em ORDEM DE PRIORIDADE: a primeira cujo termo aparecer vence.
// Termos já normalizados (sem acento, minúsculos).
const RULES: ReadonlyArray<{ slug: CategorySlug; terms: readonly string[] }> = [
  {
    slug: 'confronto-policial',
    terms: ['operacao policial', 'confronto', 'tropa', 'bope', 'incursao'],
  },
  { slug: 'tiroteio', terms: ['tiroteio', 'intenso tiroteio', 'troca de tiros'] },
  {
    slug: 'disparo-arma',
    terms: ['disparo', 'disparos', 'bala perdida', 'baleado', 'baleada', 'tiros', 'tiro'],
  },
  { slug: 'arrastao', terms: ['arrastao'] },
  { slug: 'sequestro-relampago', terms: ['sequestro relampago', 'sequestro-relampago'] },
  {
    slug: 'roubo-veiculo',
    terms: ['roubo de carro', 'roubo de veiculo', 'roubo de moto', 'carro roubado', 'moto roubada'],
  },
  { slug: 'roubo-carga', terms: ['roubo de carga', 'carga roubada'] },
  { slug: 'roubo-celular', terms: ['roubo de celular', 'celular roubado', 'rouba celular'] },
  { slug: 'assalto-mao-armada', terms: ['assalto a mao armada', 'mao armada', 'assalto', 'roubo'] },
  { slug: 'tentativa-assalto', terms: ['tentativa de assalto', 'tentativa de roubo'] },
  { slug: 'furto-veiculo', terms: ['furto de carro', 'furto de veiculo', 'furto de moto'] },
  { slug: 'furto-celular', terms: ['furto de celular', 'furto'] },
  { slug: 'golpe', terms: ['golpe', 'estelionato', 'fraude'] },
  { slug: 'area-alagada', terms: ['alagamento', 'enchente', 'alagada', 'inundacao'] },
  {
    slug: 'via-interditada',
    terms: ['interdicao', 'via interditada', 'bloqueio de via', 'pista bloqueada', 'interditada'],
  },
  { slug: 'vandalismo', terms: ['vandalismo', 'depredacao', 'pichacao'] },
];

export function classifyCategory(text: string): CategorySlug | null {
  const t = normalizeText(text);
  for (const rule of RULES) {
    for (const term of rule.terms) {
      if (t.includes(term)) return rule.slug;
    }
  }
  return null;
}
