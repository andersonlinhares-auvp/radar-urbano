import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface Row extends Record<string, unknown> {
  name: string;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!(await rateLimit(`nbpoint:${session.user.id}`, 60, 60))) {
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
      SELECT name
      FROM neighborhoods
      WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      LIMIT 1
    `);
    return NextResponse.json({ neighborhood: row?.name ?? null });
  } catch (err) {
    console.error('[neighborhoods/point] db error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
