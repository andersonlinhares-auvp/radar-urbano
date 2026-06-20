import { NextResponse } from 'next/server';
import { listIncidentsGeoJSON, createIncident } from '@/lib/incidents';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await listIncidentsGeoJSON());
}

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const incident = await createIncident({
      categorySlug: body.categorySlug,
      sourceId: body.sourceId,
      authorId: body.authorId,
      title: body.title,
      description: body.description,
      lng: Number(body.lng),
      lat: Number(body.lat),
      occurredAt: new Date(body.occurredAt ?? Date.now()),
    });
    return NextResponse.json(incident, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
