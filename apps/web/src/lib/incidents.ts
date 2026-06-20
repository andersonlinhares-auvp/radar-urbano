import { sql } from 'drizzle-orm';
import { db, incidents } from '@radar-urbano/db';
import { computeTrustScore, getCategory, type CategorySlug } from '@radar-urbano/core';
import { generateRefCode } from './ref-code.js';

export interface CreateIncidentInput {
  categorySlug: CategorySlug;
  sourceId: string;
  authorId?: string;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
}

interface IncidentRow extends Record<string, unknown> {
  id: string;
  ref_code: string;
  category_slug: string;
  category_label: string;
  category_color: string;
  category_icon: string;
  source_kind: string;
  status: string;
  trust_score: number;
  title: string;
  occurred_at: string;
  lng: number;
  lat: number;
}

const SELECT_FEATURES = sql`
  SELECT i.id, i.ref_code, i.category_slug, i.status, i.trust_score, i.title,
         to_char(i.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at,
         s.kind AS source_kind,
         c.label AS category_label, c.color AS category_color, c.icon AS category_icon,
         ST_X(i.location::geometry) AS lng, ST_Y(i.location::geometry) AS lat
  FROM incidents i
  JOIN sources s ON s.id = i.source_id
  JOIN incident_categories c ON c.slug = i.category_slug
`;

function toFeatureCollection(rows: IncidentRow[]) {
  return {
    type: 'FeatureCollection' as const,
    features: rows.map((r) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(r.lng), Number(r.lat)] },
      properties: {
        id: r.id,
        refCode: r.ref_code,
        category: r.category_slug,
        categoryLabel: r.category_label,
        categoryColor: r.category_color,
        categoryIcon: r.category_icon,
        sourceKind: r.source_kind,
        status: r.status,
        trustScore: r.trust_score,
        title: r.title,
        occurredAt: r.occurred_at,
      },
    })),
  };
}

export async function listIncidentsGeoJSON(bbox?: [number, number, number, number]) {
  const rows = bbox
    ? await db.execute<IncidentRow>(sql`
        ${SELECT_FEATURES}
        WHERE i.location && ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326)::geography
        ORDER BY i.occurred_at DESC
        LIMIT 1000
      `)
    : await db.execute<IncidentRow>(sql`
        ${SELECT_FEATURES}
        ORDER BY i.occurred_at DESC
        LIMIT 1000
      `);
  return toFeatureCollection(rows);
}

export interface RecentIncident {
  id: string;
  refCode: string;
  title: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  sourceKind: string;
  status: string;
  trustScore: number;
  occurredAt: string;
}

export async function recentIncidents(limit = 20): Promise<RecentIncident[]> {
  const rows = await db.execute<IncidentRow>(sql`
    ${SELECT_FEATURES}
    ORDER BY i.occurred_at DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    id: r.id,
    refCode: r.ref_code,
    title: r.title,
    category: r.category_slug,
    categoryLabel: r.category_label,
    categoryColor: r.category_color,
    sourceKind: r.source_kind,
    status: r.status,
    trustScore: Number(r.trust_score),
    occurredAt: r.occurred_at,
  }));
}

export async function createIncident(input: CreateIncidentInput) {
  getCategory(input.categorySlug); // validates slug (throws if invalid)
  const trustScore = computeTrustScore({
    sourceKind: 'COMMUNITY',
    confirms: 0,
    disputes: 0,
    authorReputation: 0,
    hasPhoto: false,
    hasVideo: false,
    recurrenceCount: 0,
  });
  const refCode = generateRefCode();
  const point = sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)`;
  const [row] = await db
    .insert(incidents)
    .values({
      refCode,
      categorySlug: input.categorySlug,
      sourceId: input.sourceId,
      authorId: input.authorId,
      title: input.title,
      description: input.description,
      location: sql`${point}::geography`,
      // Atribui o bairro por ponto-em-poligono (mantem o risk score funcional).
      neighborhoodId: sql`(SELECT id FROM neighborhoods WHERE ST_Contains(geom, ${point}) LIMIT 1)`,
      occurredAt: input.occurredAt,
      trustScore,
    })
    .returning();
  return row;
}
