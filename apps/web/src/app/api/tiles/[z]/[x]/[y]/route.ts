import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { createCanvas } from '@napi-rs/canvas';
import { db } from '@radar-urbano/db';
import { tileToBBox, lngLatToTilePixel, TILE_SIZE_PX } from '@/lib/tiles';
import { redis } from '@/lib/redis';
import { rateLimit } from '@/lib/rate-limit';
import { requireSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TTL = Number(process.env.TILE_CACHE_TTL ?? 300);
const RAMP = ['#3fb6a8', '#a9cf7e', '#e0a93b', '#d2702f', '#a8332f'];

interface Row extends Record<string, unknown> {
  lng: number;
  lat: number;
  trust_score: number;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!(await rateLimit(`tiles:${session.user.id}`, 240, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }
  const { z: zs, x: xs, y: ys } = await ctx.params;
  const z = Number(zs),
    x = Number(xs),
    y = Number(ys.replace('.png', ''));
  if (![z, x, y].every(Number.isFinite))
    return NextResponse.json({ error: 'Tile inválido.' }, { status: 400 });

  const cacheKey = `tile:${z}:${x}:${y}`;
  const cached = await redis.getBuffer(cacheKey);
  if (cached)
    return new NextResponse(new Uint8Array(cached), { headers: { 'content-type': 'image/png' } });

  const b = tileToBBox(z, x, y);
  const rows = await db.execute<Row>(sql`
    SELECT ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat, trust_score
    FROM incidents
    WHERE location && ST_MakeEnvelope(${b.west}, ${b.south}, ${b.east}, ${b.north}, 4326)::geography
    LIMIT 2000
  `);

  const canvas = createCanvas(TILE_SIZE_PX, TILE_SIZE_PX);
  const cx = canvas.getContext('2d');
  for (const r of rows) {
    const { px, py } = lngLatToTilePixel(Number(r.lng), Number(r.lat), z, x, y);
    const weight = Math.max(0.2, Number(r.trust_score) / 100);
    const radius = 18 + 22 * weight;
    const color = RAMP[Math.min(RAMP.length - 1, Math.floor(weight * RAMP.length))] ?? RAMP[0]!;
    const grad = cx.createRadialGradient(px, py, 0, px, py, radius);
    grad.addColorStop(0, hexToRgba(color, 0.55 * weight));
    grad.addColorStop(1, hexToRgba(color, 0));
    cx.fillStyle = grad;
    cx.beginPath();
    cx.arc(px, py, radius, 0, Math.PI * 2);
    cx.fill();
  }
  const png = canvas.toBuffer('image/png');
  await redis.set(cacheKey, png, 'EX', TTL);
  return new NextResponse(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
}

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
