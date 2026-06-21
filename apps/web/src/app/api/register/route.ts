import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users, emailVerifications } from '@radar-urbano/db';
import { hashPassword } from '@/lib/password';
import { generateCode, hashCode, CODE_TTL_MS } from '@/lib/verification';
import { sendVerificationCode } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? '');
  if (!name || !email || password.length < 8) {
    return NextResponse.json({ error: 'Dados inválidos (senha mínima 8).' }, { status: 422 });
  }
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ name, email, passwordHash });

  const code = generateCode();
  await db.insert(emailVerifications).values({
    email,
    codeHash: await hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  await sendVerificationCode(email, code);
  return NextResponse.json({ ok: true }, { status: 201 });
}
