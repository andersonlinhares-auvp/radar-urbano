import { sql } from 'drizzle-orm';
import { db, incidents } from '@radar-urbano/db';
import { computeTrustScore, getCategory, type CategorySlug } from '@radar-urbano/core';
import { generateRefCode } from './ref-code.js';

export type RecurrenceHint = 'UNKNOWN' | 'LIKELY' | 'CERTAIN';

export interface CreateIncidentInput {
  categorySlug: CategorySlug;
  authorId: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
  anonymous: boolean;
  recurrenceHint?: RecurrenceHint;
}

export interface CreateIncidentResult {
  id: string;
  refCode: string;
  neighborhood: string | null;
}

interface NeighborhoodRow extends Record<string, unknown> {
  name: string;
}

interface ReputationRow extends Record<string, unknown> {
  reputation: number | null;
}

interface SourceRow extends Record<string, unknown> {
  id: string;
}

export async function createIncident(input: CreateIncidentInput): Promise<CreateIncidentResult> {
  const category = getCategory(input.categorySlug); // valida slug (lança se inválido)

  const point = sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)`;

  // Resolve a source COMMUNITY internamente (o chamador não envia mais sourceId).
  const [source] = await db.execute<SourceRow>(
    sql`SELECT id FROM sources WHERE kind = 'COMMUNITY' LIMIT 1`,
  );
  if (!source) {
    throw new Error('Fonte COMMUNITY não encontrada. Rode o seed de sources.');
  }

  // Bairro por ponto-em-polígono (usado no título e devolvido ao cliente).
  const [nb] = await db.execute<NeighborhoodRow>(
    sql`SELECT name FROM neighborhoods WHERE ST_Contains(geom, ${point}) LIMIT 1`,
  );
  const neighborhood = nb?.name ?? null;

  // Reputação real do autor (coluna pode ser null → trata como 0).
  const [rep] = await db.execute<ReputationRow>(
    sql`SELECT reputation FROM users WHERE id = ${input.authorId} LIMIT 1`,
  );
  const authorReputation = rep?.reputation ?? 0;

  // Título gerado automaticamente a partir da categoria + bairro.
  const title = neighborhood
    ? `${category.label} em ${neighborhood}`
    : `${category.label} no Rio de Janeiro`;

  const trustScore = computeTrustScore({
    sourceKind: 'COMMUNITY',
    confirms: 0,
    disputes: 0,
    authorReputation,
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
      sourceId: source.id,
      authorId: input.authorId,
      title,
      description: input.description,
      location: sql`${point}::geography`,
      // Atribui o bairro por ponto-em-polígono (mantém o risk score funcional).
      neighborhoodId: sql`(SELECT id FROM neighborhoods WHERE ST_Contains(geom, ${point}) LIMIT 1)`,
      occurredAt: input.occurredAt,
      trustScore,
      anonymous: input.anonymous,
      recurrenceHint: input.recurrenceHint ?? 'UNKNOWN',
    })
    .returning();

  return { id: row!.id, refCode: row!.refCode, neighborhood };
}
