import { sql } from 'drizzle-orm';
import {
  CATEGORIES,
  computeTrustScore,
  aggregateRisk,
  normalizeRisk,
  type CategorySlug,
  type SourceKind,
  type RiskInput,
} from '@radar-urbano/core';
import { db } from './client.js';

// Dados de DEMONSTRACAO para o Rio de Janeiro. Idempotente: limpa e recria.
// Bairros aproximados como retangulos ao redor de coordenadas reais.

interface Bairro {
  name: string;
  lng: number;
  lat: number;
  half: number; // meio-lado do retangulo em graus
  count: number; // numero de incidentes
  profile: CategorySlug[]; // categorias mais provaveis no bairro
}

const BAIRROS: Bairro[] = [
  {
    name: 'Centro',
    lng: -43.1789,
    lat: -22.9068,
    half: 0.012,
    count: 12,
    profile: [
      'roubo-celular',
      'furto-celular',
      'assalto-mao-armada',
      'area-alagada',
      'via-interditada',
      'golpe',
    ],
  },
  {
    name: 'Botafogo',
    lng: -43.1841,
    lat: -22.9519,
    half: 0.01,
    count: 5,
    profile: ['furto-celular', 'roubo-celular', 'vandalismo', 'via-interditada'],
  },
  {
    name: 'Copacabana',
    lng: -43.1822,
    lat: -22.9711,
    half: 0.011,
    count: 9,
    profile: ['roubo-celular', 'arrastao', 'furto-celular', 'assedio', 'tentativa-assalto'],
  },
  {
    name: 'Complexo da Maré',
    lng: -43.248,
    lat: -22.858,
    half: 0.013,
    count: 14,
    profile: [
      'tiroteio',
      'disparo-arma',
      'confronto-policial',
      'roubo-veiculo',
      'assalto-mao-armada',
    ],
  },
  {
    name: 'Madureira',
    lng: -43.3389,
    lat: -22.8736,
    half: 0.012,
    count: 7,
    profile: ['roubo-celular', 'roubo-veiculo', 'furto-veiculo', 'tentativa-assalto', 'golpe'],
  },
  {
    name: 'Campo Grande',
    lng: -43.561,
    lat: -22.9035,
    half: 0.014,
    count: 8,
    profile: [
      'roubo-veiculo',
      'furto-veiculo',
      'roubo-carga',
      'sequestro-relampago',
      'disparo-arma',
    ],
  },
];

const STATUSES = ['CONFIRMED', 'PENDING', 'PENDING', 'RESOLVED', 'REJECTED'] as const;

const weightOf = (slug: CategorySlug) => CATEGORIES.find((c) => c.slug === slug)!.riskWeight;
const labelOf = (slug: CategorySlug) => CATEGORIES.find((c) => c.slug === slug)!.label;
const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]!;
const jitter = (v: number, h: number) => v + (Math.random() * 2 - 1) * h * 0.85;

async function main() {
  // 1. Limpa dados de demonstracao (idempotente).
  await db.execute(
    sql`TRUNCATE TABLE risk_scores, incidents, neighborhoods, regions RESTART IDENTITY CASCADE`,
  );

  // 2. Regiao + bairros.
  const [region] = await db.execute<{ id: string }>(sql`
    INSERT INTO regions (name, geom)
    VALUES ('Município do Rio de Janeiro', ST_SetSRID(ST_GeomFromText(
      'MULTIPOLYGON(((-43.80 -23.10, -43.10 -23.10, -43.10 -22.75, -43.80 -22.75, -43.80 -23.10)))'), 4326))
    RETURNING id
  `);
  const regionId = region!.id;

  const sources = await db.execute<{ id: string; kind: SourceKind }>(
    sql`SELECT id, kind FROM sources`,
  );
  const sourceByKind = new Map(sources.map((s) => [s.kind, s.id]));
  const communityId = sourceByKind.get('COMMUNITY')!;
  const officialId = sourceByKind.get('OFFICIAL')!;
  const newsId = sourceByKind.get('NEWS')!;

  const now = Date.now();
  let total = 0;
  const riskByNeighborhood: { id: string; name: string; items: RiskInput[] }[] = [];

  for (const b of BAIRROS) {
    const w = b.half;
    const wkt = `MULTIPOLYGON(((${b.lng - w} ${b.lat - w}, ${b.lng + w} ${b.lat - w}, ${b.lng + w} ${b.lat + w}, ${b.lng - w} ${b.lat + w}, ${b.lng - w} ${b.lat - w})))`;
    const [n] = await db.execute<{ id: string }>(sql`
      INSERT INTO neighborhoods (region_id, name, geom)
      VALUES (${regionId}, ${b.name}, ST_SetSRID(ST_GeomFromText(${wkt}), 4326))
      RETURNING id
    `);
    const neighborhoodId = n!.id;
    const items: RiskInput[] = [];

    for (let i = 0; i < b.count; i++) {
      const slug = pick(b.profile);
      const status = pick(STATUSES);
      const lng = jitter(b.lng, w);
      const lat = jitter(b.lat, w);
      const ageDays = Math.random() * 7;
      const occurredAt = new Date(now - ageDays * 86400000);

      // Fonte: maioria comunidade; violencia armada costuma vir de oficial/imprensa.
      const sourceKind: SourceKind =
        Math.random() < 0.2 ? (Math.random() < 0.5 ? 'OFFICIAL' : 'NEWS') : 'COMMUNITY';
      const sourceId =
        sourceKind === 'OFFICIAL' ? officialId : sourceKind === 'NEWS' ? newsId : communityId;

      const confirms =
        status === 'CONFIRMED' ? 3 + Math.floor(Math.random() * 6) : Math.floor(Math.random() * 2);
      const disputes = status === 'REJECTED' ? 3 + Math.floor(Math.random() * 3) : 0;
      const hasPhoto = Math.random() < 0.4;

      const trustScore = computeTrustScore({
        sourceKind,
        confirms,
        disputes,
        authorReputation: 30 + Math.floor(Math.random() * 50),
        hasPhoto,
        hasVideo: hasPhoto && Math.random() < 0.3,
        recurrenceCount: Math.floor(Math.random() * 4),
      });

      const refCode = `RU-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const title = `${labelOf(slug)} — ${b.name}`;

      await db.execute(sql`
        INSERT INTO incidents
          (ref_code, category_slug, source_id, title, location, neighborhood_id, occurred_at, status, trust_score)
        VALUES (
          ${refCode}, ${slug}, ${sourceId}, ${title},
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${neighborhoodId}, ${occurredAt.toISOString()}, ${status}, ${trustScore}
        )
      `);

      items.push({ categoryWeight: weightOf(slug), trustScore, ageDays });
      total++;
    }
    riskByNeighborhood.push({ id: neighborhoodId, name: b.name, items });
  }

  // 3. Risk score por bairro (snapshot), normalizado contra o maximo da cidade.
  const raw = riskByNeighborhood.map((r) => ({ ...r, value: aggregateRisk(r.items, 1) }));
  const cityMax = Math.max(1, ...raw.map((r) => r.value));
  const windowEnd = new Date(now);
  const windowStart = new Date(now - 30 * 86400000);

  for (const r of raw) {
    const score = normalizeRisk(r.value, cityMax);
    await db.execute(sql`
      INSERT INTO risk_scores (scope, ref_id, window_start, window_end, score)
      VALUES ('NEIGHBORHOOD', ${r.id}, ${windowStart.toISOString()}, ${windowEnd.toISOString()}, ${score})
    `);
  }

  console.log(`Seed de demonstração concluído: ${BAIRROS.length} bairros, ${total} incidentes.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
