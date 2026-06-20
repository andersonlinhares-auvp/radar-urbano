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

export async function listIncidentsGeoJSON() {
  const rows = await db.execute(sql`
    SELECT id, ref_code, category_slug, status, trust_score,
           ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
    FROM incidents
    ORDER BY occurred_at DESC
    LIMIT 1000
  `);
  return {
    type: 'FeatureCollection' as const,
    features: rows.map((r) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(r.lng), Number(r.lat)] },
      properties: {
        id: r.id,
        refCode: r.ref_code,
        category: r.category_slug,
        status: r.status,
        trustScore: r.trust_score,
      },
    })),
  };
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
  const [row] = await db
    .insert(incidents)
    .values({
      refCode,
      categorySlug: input.categorySlug,
      sourceId: input.sourceId,
      authorId: input.authorId,
      title: input.title,
      description: input.description,
      location: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`,
      occurredAt: input.occurredAt,
      trustScore,
    })
    .returning();
  return row;
}
