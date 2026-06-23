import { NextResponse } from 'next/server';
import { CATEGORY_BY_SLUG, type CategorySlug } from '@radar-urbano/core';
import { createIncident, type RecurrenceHint } from '@/lib/incidents';
import { requireSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { logAccess } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Limites do Rio de Janeiro (área coberta no MVP).
const RJ_LAT_MIN = -23.1;
const RJ_LAT_MAX = -22.6;
const RJ_LNG_MIN = -43.8;
const RJ_LNG_MAX = -43.0;
const OUT_OF_AREA =
  'Localização fora da área coberta. O Radar Urbano funciona no Rio de Janeiro por enquanto.';

const RECURRENCE_HINTS: readonly RecurrenceHint[] = ['UNKNOWN', 'LIKELY', 'CERTAIN'];
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Remove tags HTML simples e URLs, normaliza espaços e corta em 500 chars. */
function sanitizeDescription(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw
    .replace(/<[^>]*>/g, ' ') // tags HTML
    .replace(/\bhttps?:\/\/\S+/gi, ' ') // URLs http(s)
    .replace(/\bwww\.\S+/gi, ' ') // URLs www
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  return cleaned.length > 0 ? cleaned : undefined;
}

function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === 'string' && value in CATEGORY_BY_SLUG;
}

function isRecurrenceHint(value: unknown): value is RecurrenceHint {
  return typeof value === 'string' && (RECURRENCE_HINTS as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!(await rateLimit(`report:${session.user.id}`, 10, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  // categorySlug
  if (!isCategorySlug(body?.categorySlug)) {
    return NextResponse.json({ error: 'Categoria inválida.' }, { status: 422 });
  }
  const categorySlug = body.categorySlug;

  // Coordenadas finitas e dentro do RJ.
  const lng = Number(body?.lng);
  const lat = Number(body?.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: 'Coordenadas inválidas.' }, { status: 422 });
  }
  if (lat < RJ_LAT_MIN || lat > RJ_LAT_MAX || lng < RJ_LNG_MIN || lng > RJ_LNG_MAX) {
    return NextResponse.json({ error: OUT_OF_AREA }, { status: 422 });
  }

  // occurredAt ≤ agora e > agora-365d.
  const now = Date.now();
  const occurredAt = new Date(body?.occurredAt ?? now);
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: 'Data da ocorrência inválida.' }, { status: 422 });
  }
  const occurredMs = occurredAt.getTime();
  if (occurredMs > now || occurredMs <= now - ONE_YEAR_MS) {
    return NextResponse.json({ error: 'Data da ocorrência inválida.' }, { status: 422 });
  }

  // anonymous boolean.
  if (typeof body?.anonymous !== 'boolean') {
    return NextResponse.json({ error: 'Campo "anonymous" inválido.' }, { status: 422 });
  }
  const anonymous: boolean = body.anonymous;

  // recurrenceHint enum (opcional).
  const recurrenceHint: RecurrenceHint = isRecurrenceHint(body?.recurrenceHint)
    ? body.recurrenceHint
    : 'UNKNOWN';
  if (body?.recurrenceHint !== undefined && !isRecurrenceHint(body.recurrenceHint)) {
    return NextResponse.json({ error: 'Campo "recurrenceHint" inválido.' }, { status: 422 });
  }

  const description = sanitizeDescription(body?.description);

  try {
    const incident = await createIncident({
      categorySlug,
      authorId: session.user.id,
      description,
      lng,
      lat,
      occurredAt,
      anonymous,
      recurrenceHint,
    });
    await logAccess('report', { userId: session.user.id, meta: { id: incident.id } });
    return NextResponse.json({ id: incident.id, refCode: incident.refCode }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Categoria desconhecida')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[POST /api/incidents]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
