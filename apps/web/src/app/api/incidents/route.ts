import { NextResponse } from 'next/server';
import { listIncidentsGeoJSON, createIncident } from '@/lib/incidents';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bboxParam = searchParams.get('bbox');
  let bbox: [number, number, number, number] | undefined;
  if (bboxParam) {
    const parts = bboxParam.split(',').map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      bbox = parts as [number, number, number, number];
    }
  }
  return NextResponse.json(await listIncidentsGeoJSON(bbox));
}

export async function POST(req: Request) {
  const body = await req.json();

  // Validate required string fields
  if (
    !body.categorySlug ||
    typeof body.categorySlug !== 'string' ||
    body.categorySlug.trim() === ''
  ) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 422 });
  }
  if (!body.sourceId || typeof body.sourceId !== 'string' || body.sourceId.trim() === '') {
    return NextResponse.json({ error: 'Campo sourceId é obrigatório' }, { status: 422 });
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return NextResponse.json({ error: 'Campo title é obrigatório' }, { status: 422 });
  }

  // Validate coordinates
  const lng = Number(body.lng);
  const lat = Number(body.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 422 });
  }

  try {
    const incident = await createIncident({
      categorySlug: body.categorySlug,
      sourceId: body.sourceId,
      authorId: body.authorId,
      title: body.title,
      description: body.description,
      lng,
      lat,
      occurredAt: new Date(body.occurredAt ?? Date.now()),
    });
    return NextResponse.json(incident, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Categoria desconhecida')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[POST /api/incidents]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
