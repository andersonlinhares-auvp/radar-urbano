import { NextResponse } from 'next/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, users, emailVerifications } from '@radar-urbano/db';
import { verifyCode, isExpired, MAX_ATTEMPTS } from '@/lib/verification';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  const code = String(body?.code ?? '').trim();
  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 422 });
  }
  const [rec] = await db
    .select()
    .from(emailVerifications)
    .where(and(eq(emailVerifications.email, email), isNull(emailVerifications.consumedAt)))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);
  if (!rec) return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 });
  if (isExpired(rec.expiresAt))
    return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 });
  if (rec.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Tentativas excedidas.' }, { status: 429 });
  }
  const ok = await verifyCode(code, rec.codeHash);
  if (!ok) {
    await db
      .update(emailVerifications)
      .set({ attempts: rec.attempts + 1 })
      .where(eq(emailVerifications.id, rec.id));
    return NextResponse.json({ error: 'Código incorreto.' }, { status: 400 });
  }
  await db
    .update(emailVerifications)
    .set({ consumedAt: new Date() })
    .where(eq(emailVerifications.id, rec.id));
  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.email, email));
  return NextResponse.json({ ok: true });
}
