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

// Seed de DEMONSTRACAO usando os bairros reais do Rio (importados via import-bairros.ts).
// Idempotente: trunca incidents e risk_scores, mas preserva regions/neighborhoods.

interface BairroProfile {
  name: string; // nome real no dataset (para ILIKE)
  count: number; // número de incidentes a gerar
  profile: CategorySlug[]; // categorias mais prováveis
}

const BAIRROS: BairroProfile[] = [
  {
    name: 'Centro',
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
    count: 5,
    profile: ['furto-celular', 'roubo-celular', 'vandalismo', 'via-interditada'],
  },
  {
    name: 'Copacabana',
    count: 9,
    profile: ['roubo-celular', 'arrastao', 'furto-celular', 'assedio', 'tentativa-assalto'],
  },
  {
    name: 'Maré',
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
    count: 7,
    profile: ['roubo-celular', 'roubo-veiculo', 'furto-veiculo', 'tentativa-assalto', 'golpe'],
  },
  {
    name: 'Campo Grande',
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

async function main() {
  // 1. Limpa apenas incidents e risk_scores (preserva regions/neighborhoods).
  await db.execute(sql`TRUNCATE TABLE risk_scores, incidents RESTART IDENTITY CASCADE`);

  // 2. Busca sources.
  const sourcesRows = await db.execute<{ id: string; kind: SourceKind }>(
    sql`SELECT id, kind FROM sources`,
  );
  const sourceByKind = new Map(sourcesRows.map((s) => [s.kind, s.id]));
  const communityId = sourceByKind.get('COMMUNITY')!;
  const officialId = sourceByKind.get('OFFICIAL')!;
  const newsId = sourceByKind.get('NEWS')!;

  const now = Date.now();
  let total = 0;
  const riskByNeighborhood: { id: string; name: string; items: RiskInput[] }[] = [];
  let skipped = 0;

  for (const b of BAIRROS) {
    // 3. Busca o bairro real pelo nome (ILIKE para tolerar diferenças de caixa).
    const rows = await db.execute<{ id: string; name: string }>(sql`
      SELECT id, name FROM neighborhoods WHERE name ILIKE ${b.name} LIMIT 1
    `);

    if (rows.length === 0) {
      console.warn(`Bairro não encontrado no banco: "${b.name}" — pulando.`);
      skipped++;
      continue;
    }

    const neighborhoodId = rows[0]!.id;
    const neighborhoodName = rows[0]!.name;
    const items: RiskInput[] = [];

    // 4. Gera N pontos aleatórios DENTRO do polígono real via PostGIS.
    const pointRows = await db.execute<{ pt: string }>(sql`
      SELECT ST_AsText((ST_Dump(ST_GeneratePoints(geom, ${b.count}))).geom) AS pt
      FROM neighborhoods
      WHERE id = ${neighborhoodId}
    `);

    for (const ptRow of pointRows) {
      const slug = pick(b.profile);
      const status = pick(STATUSES);
      const ageDays = Math.random() * 7;
      const occurredAt = new Date(now - ageDays * 86400000);

      // Fonte: maioria comunidade; violência armada costuma vir de oficial/imprensa.
      const sourceKindVal: SourceKind =
        Math.random() < 0.2 ? (Math.random() < 0.5 ? 'OFFICIAL' : 'NEWS') : 'COMMUNITY';
      const sourceId =
        sourceKindVal === 'OFFICIAL' ? officialId : sourceKindVal === 'NEWS' ? newsId : communityId;

      const confirms =
        status === 'CONFIRMED' ? 3 + Math.floor(Math.random() * 6) : Math.floor(Math.random() * 2);
      const disputes = status === 'REJECTED' ? 3 + Math.floor(Math.random() * 3) : 0;
      const hasPhoto = Math.random() < 0.4;

      const trustScore = computeTrustScore({
        sourceKind: sourceKindVal,
        confirms,
        disputes,
        authorReputation: 30 + Math.floor(Math.random() * 50),
        hasPhoto,
        hasVideo: hasPhoto && Math.random() < 0.3,
        recurrenceCount: Math.floor(Math.random() * 4),
      });

      const refCode = `RU-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const title = `${labelOf(slug)} — ${neighborhoodName}`;

      // Insere o incidente com o ponto gerado dentro do polígono real.
      await db.execute(sql`
        INSERT INTO incidents
          (ref_code, category_slug, source_id, title, location, neighborhood_id, occurred_at, status, trust_score)
        VALUES (
          ${refCode}, ${slug}, ${sourceId}, ${title},
          ST_SetSRID(${ptRow.pt}::geometry, 4326)::geography,
          ${neighborhoodId}, ${occurredAt.toISOString()}, ${status}, ${trustScore}
        )
      `);

      items.push({ categoryWeight: weightOf(slug), trustScore, ageDays });
      total++;
    }

    riskByNeighborhood.push({ id: neighborhoodId, name: neighborhoodName, items });
  }

  // 5. Risk score por bairro (snapshot), normalizado contra o máximo da cidade.
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

  const seededCount = BAIRROS.length - skipped;
  console.log(
    `Seed de demonstração concluído: ${seededCount} bairros reais, ${total} incidentes.${skipped > 0 ? ` (${skipped} bairros não encontrados)` : ''}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
