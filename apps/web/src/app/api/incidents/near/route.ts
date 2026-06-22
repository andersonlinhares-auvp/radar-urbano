import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { logAccess } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface Row extends Record<string, unknown> {
  id: string;
  ref_code: string;
  title: string;
  description: string | null;
  category_label: string;
  category_color: string;
  status: string;
  trust_score: number;
  occurred_at: string;
  neighborhood: string | null;
  confirmations: number;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!(await rateLimit(`near:${session.user.id}`, 30, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const lng = Number(searchParams.get('lng'));
  const lat = Number(searchParams.get('lat'));
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: 'Coordenadas inválidas.' }, { status: 422 });
  }
  try {
    const [row] = await db.execute<Row>(sql`
      SELECT i.id, i.ref_code, i.title, i.description, i.status, i.trust_score,
             to_char(i.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at,
             c.label AS category_label, c.color AS category_color,
             nb.name AS neighborhood,
             (
               SELECT count(*)
               FROM verifications v
               WHERE v.incident_id = i.id AND v.kind = 'CONFIRM'
             ) AS confirmations
      FROM incidents i
      JOIN incident_categories c ON c.slug = i.category_slug
      LEFT JOIN neighborhoods nb ON nb.id = i.neighborhood_id
      WHERE ST_DWithin(i.location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 1500)
      ORDER BY i.location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      LIMIT 1
    `);
    void logAccess('near', { userId: session.user.id, meta: { lng, lat, id: row?.id } }).catch(
      (err) => console.error('[near] audit error:', err),
    );
    if (!row) return NextResponse.json({ incident: null });
    // Nunca retorna authorId/fonte; identidade do autor jamais sai daqui.
    return NextResponse.json({
      incident: {
        id: row.id,
        refCode: row.ref_code,
        title: row.title,
        description: row.description,
        categoryLabel: row.category_label,
        categoryColor: row.category_color,
        status: row.status,
        trustScore: Number(row.trust_score),
        occurredAt: row.occurred_at,
        neighborhood: row.neighborhood ?? null,
        confirmations: Number(row.confirmations),
      },
    });
  } catch (err) {
    console.error('[near] db error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
