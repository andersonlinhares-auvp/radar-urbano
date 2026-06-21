// apps/web/src/app/api/incidents/recent/route.ts
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
  status: string;
  trust_score: number;
  occurred_at: string;
  category_label: string;
  category_color: string;
  lng: number;
  lat: number;
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
  const parts = (searchParams.get('bbox') ?? '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ error: 'bbox inválido. Use ?bbox=w,s,e,n' }, { status: 422 });
  }
  const [w, s, e, n] = parts;

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
      ST_Y(i.location::geometry) AS lat
    FROM incidents i
    JOIN incident_categories c ON c.slug = i.category_slug
    WHERE i.location && ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)::geography
    ORDER BY i.occurred_at DESC
    LIMIT 10
  `);

  await logAccess('list', {
    userId: session.user.id,
    meta: { bbox: [w, s, e, n] },
  });

  // Nunca retorna authorId/fonte; identidade do autor jamais sai daqui.
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
  }));

  return NextResponse.json({ incidents });
}
