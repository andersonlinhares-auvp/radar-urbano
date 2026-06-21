import { NextResponse } from 'next/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, emailVerifications } from '@radar-urbano/db';
import { generateCode, hashCode, CODE_TTL_MS, RESEND_COOLDOWN_MS } from '@/lib/verification';
import { sendVerificationCode } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 422 });

  const [last] = await db
    .select()
    .from(emailVerifications)
    .where(and(eq(emailVerifications.email, email), isNull(emailVerifications.consumedAt)))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return NextResponse.json({ error: 'Aguarde antes de reenviar.' }, { status: 429 });
  }
  const code = generateCode();
  await db.insert(emailVerifications).values({
    email,
    codeHash: await hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  await sendVerificationCode(email, code);
  return NextResponse.json({ ok: true });
}
