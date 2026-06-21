import { NextResponse } from 'next/server';
import { createIncident } from '@/lib/incidents';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { logAccess } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!(await rateLimit(`report:${session.user.id}`, 10, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const categorySlug = body?.categorySlug;
  const sourceId = body?.sourceId;
  const title = String(body?.title ?? '').trim();
  const lng = Number(body?.lng);
  const lat = Number(body?.lat);
  if (!categorySlug || !sourceId || !title) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 422 });
  }
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: 'Coordenadas inválidas.' }, { status: 422 });
  }
  try {
    const incident = await createIncident({
      categorySlug,
      sourceId,
      authorId: session.user.id,
      title,
      description: body?.description,
      lng,
      lat,
      occurredAt: new Date(body?.occurredAt ?? Date.now()),
      anonymous: Boolean(body?.anonymous),
    });
    await logAccess('report', { userId: session.user.id, meta: { id: incident?.id } });
    return NextResponse.json({ id: incident?.id, refCode: incident?.refCode }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Categoria desconhecida')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[POST /api/incidents]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
