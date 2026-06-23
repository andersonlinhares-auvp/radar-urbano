// apps/web/src/app/api/incidents/recent/route.ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { logAccess } from '@/lib/audit';
import { parseBbox } from '@/lib/bbox';

export const dynamic = 'force-dynamic';

interface Row extends Record<string, unknown> {
  id: string;
  ref_code: string;
  title: string;
  status: string;
  trust_score: number;
  occurred_at: string;
  category_label: string;
  category_color: string;
  lng: number;
  lat: number;
  neighborhood: string | null;
  confirmations: number;
  source_name: string | null;
  source_url: string | null;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (!(await rateLimit(`recent:${session.user.id}`, 60, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const bbox = parseBbox(searchParams.get('bbox'));
  if (!bbox) {
    return NextResponse.json({ error: 'bbox inválido. Use ?bbox=w,s,e,n' }, { status: 422 });
  }
  const [w, s, e, n] = bbox;

  try {
    const rows = await db.execute<Row>(sql`
      SELECT
        i.id,
        i.ref_code,
        i.title,
        i.status,
        i.trust_score,
        to_char(i.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at,
        c.label  AS category_label,
        c.color  AS category_color,
        ST_X(i.location::geometry) AS lng,
        ST_Y(i.location::geometry) AS lat,
        nb.name  AS neighborhood,
        i.source_name AS source_name,
        i.source_url  AS source_url,
        (
          SELECT count(*)
          FROM verifications v
          WHERE v.incident_id = i.id AND v.kind = 'CONFIRM'
        ) AS confirmations
      FROM incidents i
      JOIN incident_categories c ON c.slug = i.category_slug
      LEFT JOIN neighborhoods nb ON nb.id = i.neighborhood_id
      WHERE i.location && ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)::geography
      ORDER BY i.occurred_at DESC
      LIMIT 10
    `);

    void logAccess('list', {
      userId: session.user.id,
      meta: { bbox },
    }).catch((err) => console.error('[recent] audit error:', err));

    const incidents = rows.map((row) => ({
      id: row.id,
      refCode: row.ref_code,
      title: row.title,
      categoryLabel: row.category_label,
      categoryColor: row.category_color,
      status: row.status,
      trustScore: Number(row.trust_score),
      occurredAt: row.occurred_at,
      lng: Number(row.lng),
      lat: Number(row.lat),
      neighborhood: row.neighborhood ?? null,
      confirmations: Number(row.confirmations),
      sourceName: (row.source_name as string | null) ?? null,
      sourceUrl: (row.source_url as string | null) ?? null,
    }));

    return NextResponse.json({ incidents });
  } catch (err) {
    console.error('[recent] db error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
