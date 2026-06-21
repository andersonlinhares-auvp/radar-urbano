import { sql } from 'drizzle-orm';
import { db, incidents } from '@radar-urbano/db';
import { computeTrustScore, getCategory, type CategorySlug } from '@radar-urbano/core';
import { generateRefCode } from './ref-code.js';

export interface CreateIncidentInput {
  categorySlug: CategorySlug;
  sourceId: string;
  authorId: string;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
  anonymous: boolean;
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
      anonymous: input.anonymous,
    })
    .returning();
  return row;
}
