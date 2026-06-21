# Conta + Privacidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar contas (Google + e-mail/senha com verificação por código via Resend), exigir login para todo dado, e servir o mapa como tiles PNG renderizados no servidor (cliente nunca recebe o dataset bruto); detalhe só por clique, logado, rate-limited e auditado.

**Architecture:** Auth.js (NextAuth v5) com sessão JWT, providers Google + Credentials. Dados de incidente nunca trafegam como registros ao cliente: o mapa usa fonte **raster** apontando para `/api/tiles/{z}/{x}/{y}.png` (heatmap desenhado no servidor com `@napi-rs/canvas`, cache Redis). Detalhe via `/api/incidents/near` (1 por clique, rate-limit + auditoria). Gating por `middleware.ts`.

**Tech Stack:** Next.js 15, Auth.js v5, Drizzle + PostGIS, Redis (ioredis), bcryptjs, resend, @napi-rs/canvas, Vitest.

## Global Constraints

- TypeScript strict; pt-BR na UI (acentuação correta); inglês no código.
- Sessão **JWT** (`session.strategy = 'jwt'`). Senha mínima **8** caracteres.
- Código de verificação: **6 dígitos**, expira em **15 min**, **máx. 5 tentativas**, reenvio cooldown **60s**.
- Rate-limits (excesso → HTTP `429`): tiles **240/min**, near/detail **30/min**, list **30/min**, report **10/min**, register **5/15min**, verify/resend **5/15min**.
- Tiles: cache Redis TTL **300s**; resposta `image/png`; tamanho **256×256**.
- **Nunca** enviar dataset bruto ao cliente; **não** existe endpoint GeoJSON em massa.
- `authorId` sempre da sessão (ignorar payload). `anonymous=true` oculta o autor em qualquer resposta.
- Commits Conventional; corpo termina com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Ambiente Windows: usar PowerShell; pnpm via corepack; Postgres/Redis via `docker compose up -d postgres redis`; `apps/web/.env.local` com `DATABASE_URL`/`REDIS_URL` em `localhost`.
- Migrações são **incrementais** (drizzle-kit `generate` diffa o snapshot; não recria colunas `geography`).

## File Structure

```
apps/web/src/
├─ auth.ts                         # Google + Credentials + JWT (modificar)
├─ middleware.ts                   # gating (criar)
├─ lib/
│  ├─ password.ts                  # hash/verify senha (criar)
│  ├─ verification.ts              # código: gerar, expirar, constantes (criar)
│  ├─ email.ts                     # Resend + dev fallback (criar)
│  ├─ rate-limit.ts                # token-bucket Redis (criar)
│  ├─ audit.ts                     # grava access_logs (criar)
│  ├─ tiles.ts                     # bbox slippy + render heatmap (criar)
│  ├─ redis.ts                     # client ioredis compartilhado (criar)
│  ├─ incidents.ts                 # POST autenticado + near (modificar; remover GeoJSON em massa)
│  └─ session.ts                   # helper requireSession() (criar)
├─ app/
│  ├─ (auth)/entrar/page.tsx       # login (criar)
│  ├─ (auth)/cadastrar/page.tsx    # cadastro (criar)
│  ├─ (auth)/verificar/page.tsx    # código (criar)
│  ├─ api/register/route.ts        # criar
│  ├─ api/verify-email/route.ts    # criar
│  ├─ api/verify-email/resend/route.ts  # criar
│  ├─ api/tiles/[z]/[x]/[y]/route.ts    # criar
│  └─ api/incidents/near/route.ts  # criar
└─ components/
   └─ SessionMenu.tsx              # avatar/sair (criar)
packages/db/src/schema.ts          # passwordHash, anonymous, email_verifications, access_logs (modificar)
```

---

# PR1 — Auth base

## Task 1: Dependências + variáveis de ambiente

**Files:**

- Modify: `apps/web/package.json`, `.env.example`, `apps/web/.env.local` (local, não versionado)

**Interfaces:**

- Produces: deps `bcryptjs`, `resend`, `ioredis`, `@napi-rs/canvas`, `@types/bcryptjs`; envs novas.

- [ ] **Step 1: Add deps to `apps/web/package.json`** (em `dependencies`)

```jsonc
"bcryptjs": "^2.4.3",
"resend": "^4.0.0",
"ioredis": "^5.4.1",
"@napi-rs/canvas": "^0.1.65"
```

e em `devDependencies`: `"@types/bcryptjs": "^2.4.6"`.

- [ ] **Step 2: Install**

Run: `corepack prepare pnpm@9.12.0 --activate; pnpm install`
Expected: instala sem erro; lockfile atualizado.

- [ ] **Step 3: Append env keys to `.env.example`**

```bash
# Auth providers
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
# Resend (e-mail). Sem a key, em dev o código é logado no console.
RESEND_API_KEY=
EMAIL_FROM="Radar Urbano <no-reply@radarurbano.org>"
# Tiles
TILE_CACHE_TTL=300
```

Também adicione as mesmas chaves (vazias) em `apps/web/.env.local`, garantindo `AUTH_SECRET` presente lá (ex.: `AUTH_SECRET=dev-secret-please-change-32bytes-min`) e `REDIS_URL=redis://localhost:6379`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml .env.example
git commit -m "chore(web): add auth/email/redis/canvas deps and env keys"
```

---

## Task 2: Schema 0001 (passwordHash, anonymous, email_verifications, access_logs)

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create: migration em `packages/db/migrations/`

**Interfaces:**

- Produces: colunas `users.passwordHash`, `incidents.anonymous`; tabelas `emailVerifications`, `accessLogs` (exports drizzle).

- [ ] **Step 1: Edit `packages/db/src/schema.ts`** — adicionar import `jsonb` e `boolean` (se faltar) e:

No `users` (adicionar coluna):

```ts
passwordHash: text('password_hash'),
```

No `incidents` (adicionar coluna, antes de `createdAt`):

```ts
anonymous: boolean('anonymous').notNull().default(false),
```

Ao fim do arquivo, novas tabelas:

```ts
export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ emailIdx: index('email_verifications_email_idx').on(t.email) }),
);

export const accessLogs = pgTable(
  'access_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    meta: jsonb('meta'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index('access_logs_user_idx').on(t.userId, t.createdAt) }),
);
```

(Garanta que `jsonb` está importado de `drizzle-orm/pg-core`.)

- [ ] **Step 2: Generate migration**

Run: `$env:DATABASE_URL='postgresql://radar:radar@localhost:5432/radar_urbano'; pnpm --filter @radar-urbano/db generate`
Expected: novo `0001_*.sql` contendo `ALTER TABLE "users" ADD COLUMN "password_hash"`, `ALTER TABLE "incidents" ADD COLUMN "anonymous"`, `CREATE TABLE ... "email_verifications"`, `CREATE TABLE ... "access_logs"`. **Confirme que NÃO há `CREATE TABLE` recriando incidents nem `geography` citado** (é incremental).

- [ ] **Step 3: Apply migration (DB local de pé)**

Run: `docker compose up -d postgres; pnpm db:migrate`
Expected: "Migrações aplicadas." sem erro.

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm --filter @radar-urbano/db typecheck`
Expected: PASS.

```bash
git add packages/db
git commit -m "feat(db): add passwordHash, anonymous, email_verifications, access_logs"
```

---

## Task 3: Lib de senha (`password.ts`, TDD)

**Files:**

- Test: `apps/web/src/lib/password.test.ts`
- Create: `apps/web/src/lib/password.ts`

**Interfaces:**

- Produces: `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('segredo123');
    expect(hash).not.toBe('segredo123');
    expect(await verifyPassword('segredo123', hash)).toBe(true);
  });
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('segredo123');
    expect(await verifyPassword('errado', hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @radar-urbano/web test`
Expected: FAIL ("Cannot find module './password.js'").

- [ ] **Step 3: Implement `apps/web/src/lib/password.ts`**

```ts
import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @radar-urbano/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/password.ts apps/web/src/lib/password.test.ts
git commit -m "feat(web): add password hashing helpers"
```

---

## Task 4: Lib de código de verificação (`verification.ts`, TDD)

**Files:**

- Test: `apps/web/src/lib/verification.test.ts`
- Create: `apps/web/src/lib/verification.ts`

**Interfaces:**

- Consumes: `hashPassword`/`verifyPassword` (Task 3) reusados p/ o código.
- Produces: `generateCode(): string`, `CODE_TTL_MS`, `MAX_ATTEMPTS`, `RESEND_COOLDOWN_MS`, `isExpired(expiresAt: Date, now?: Date): boolean`, `hashCode(code): Promise<string>`, `verifyCode(code, hash): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  generateCode,
  isExpired,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  hashCode,
  verifyCode,
} from './verification.js';

describe('verification', () => {
  it('generates a 6-digit numeric code', () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });
  it('detects expiry against a reference time', () => {
    const now = new Date('2026-06-21T12:00:00Z');
    expect(isExpired(new Date('2026-06-21T11:59:00Z'), now)).toBe(true);
    expect(isExpired(new Date('2026-06-21T12:05:00Z'), now)).toBe(false);
  });
  it('exposes sane constants', () => {
    expect(CODE_TTL_MS).toBe(15 * 60_000);
    expect(MAX_ATTEMPTS).toBe(5);
  });
  it('hashes and verifies a code', async () => {
    const h = await hashCode('123456');
    expect(await verifyCode('123456', h)).toBe(true);
    expect(await verifyCode('000000', h)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @radar-urbano/web test`
Expected: FAIL ("Cannot find module './verification.js'").

- [ ] **Step 3: Implement `apps/web/src/lib/verification.ts`**

```ts
import { hashPassword, verifyPassword } from './password.js';

export const CODE_TTL_MS = 15 * 60_000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60_000;

export function generateCode(): string {
  // 6 dígitos, 000000–999999
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function hashCode(code: string): Promise<string> {
  return hashPassword(code);
}

export function verifyCode(code: string, hash: string): Promise<boolean> {
  return verifyPassword(code, hash);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @radar-urbano/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/verification.ts apps/web/src/lib/verification.test.ts
git commit -m "feat(web): add email verification code helpers"
```

---

## Task 5: Lib de e-mail (`email.ts`, Resend + dev fallback)

**Files:**

- Create: `apps/web/src/lib/email.ts`

**Interfaces:**

- Produces: `sendVerificationCode(email: string, code: string): Promise<void>`.

- [ ] **Step 1: Implement `apps/web/src/lib/email.ts`**

```ts
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? 'Radar Urbano <no-reply@radarurbano.org>';

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  if (!apiKey) {
    // Dev fallback: sem chave, NUNCA envia; loga p/ o time testar localmente.
    console.log(`[dev] código de verificação para ${email}: ${code}`);
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: email,
    subject: 'Seu código de verificação — Radar Urbano',
    text: `Seu código é ${code}. Ele expira em 15 minutos.`,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @radar-urbano/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/email.ts
git commit -m "feat(web): add Resend email sender with dev fallback"
```

---

## Task 6: Auth.js — Google + Credentials + JWT (`auth.ts`)

**Files:**

- Modify: `apps/web/src/auth.ts`
- Create: `apps/web/src/lib/session.ts`

**Interfaces:**

- Consumes: `verifyPassword` (Task 3), `db`, `users`.
- Produces: `auth`, `handlers`, `signIn`, `signOut`; `requireSession()` em `session.ts`.

- [ ] **Step 1: Rewrite `apps/web/src/auth.ts`**

```ts
import NextAuth, { type NextAuthConfig, type NextAuthResult } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@radar-urbano/db';
import { accounts, sessions, users, verificationTokens } from '@radar-urbano/db/schema';
import { verifyPassword } from '@/lib/password';

const config: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '').toLowerCase();
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) throw new Error('E-mail não verificado');
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = String(token.uid);
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut }: NextAuthResult = NextAuth(config);
```

- [ ] **Step 2: Create `apps/web/src/lib/session.ts`**

```ts
import { auth } from '@/auth';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}
```

- [ ] **Step 3: Add `id` to the session type — create `apps/web/src/types/next-auth.d.ts`**

```ts
import type { DefaultSession } from 'next-auth';
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}
```

- [ ] **Step 4: Typecheck/build**

Run: `pnpm --filter @radar-urbano/web build`
Expected: compila (usa as envs placeholder do Dockerfile/`.env.local`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/auth.ts apps/web/src/lib/session.ts apps/web/src/types/next-auth.d.ts
git commit -m "feat(web): Google + Credentials auth with JWT sessions"
```

---

## Task 7: Rotas de cadastro e verificação

**Files:**

- Create: `apps/web/src/app/api/register/route.ts`, `apps/web/src/app/api/verify-email/route.ts`, `apps/web/src/app/api/verify-email/resend/route.ts`

**Interfaces:**

- Consumes: `db`, `users`, `emailVerifications`, `hashPassword`, `generateCode`, `hashCode`, `verifyCode`, `isExpired`, `CODE_TTL_MS`, `MAX_ATTEMPTS`, `RESEND_COOLDOWN_MS`, `sendVerificationCode`.

- [ ] **Step 1: `api/register/route.ts`**

```ts
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
```

- [ ] **Step 2: `api/verify-email/route.ts`**

```ts
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
  if (!rec) return NextResponse.json({ error: 'Código inexistente.' }, { status: 400 });
  if (isExpired(rec.expiresAt))
    return NextResponse.json({ error: 'Código expirado.' }, { status: 400 });
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
```

- [ ] **Step 3: `api/verify-email/resend/route.ts`**

```ts
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
```

- [ ] **Step 4: Build + manual smoke**

Run: `pnpm --filter @radar-urbano/web build` → PASS.
Smoke (dev, postgres up): `POST /api/register` com `{name,email,password}` → 201 e código no console; `POST /api/verify-email` com o código → `{ok:true}`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/register apps/web/src/app/api/verify-email
git commit -m "feat(web): register + email verification (code) endpoints"
```

---

## Task 8: Telas de entrar/cadastrar/verificar + sessão no header

**Files:**

- Create: `apps/web/src/app/(auth)/entrar/page.tsx`, `apps/web/src/app/(auth)/cadastrar/page.tsx`, `apps/web/src/app/(auth)/verificar/page.tsx`, `apps/web/src/components/SessionMenu.tsx`
- Modify: `apps/web/src/app/layout.tsx` (montar `SessionProvider` + `SessionMenu`)

**Interfaces:**

- Consumes: `signIn` (next-auth/react), `/api/register`, `/api/verify-email`.

- [ ] **Step 1: `entrar/page.tsx`** (client component, design Radar Urbano)

```tsx
'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function EntrarPage() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/mapa';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.error) setErro('E-mail/senha inválidos ou e-mail não verificado.');
    else router.push(next);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-serif text-3xl text-petroleo-600">Entrar</h1>
      <button
        onClick={() => signIn('google', { callbackUrl: next })}
        className="rounded border border-linha bg-superficie p-3 font-medium"
      >
        Entrar com Google
      </button>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          className="rounded border border-linha p-3"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border border-linha p-3"
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {erro && <p className="text-sm text-risco-critico">{erro}</p>}
        <button className="rounded bg-petroleo-600 p-3 font-semibold text-white">Entrar</button>
      </form>
      <a className="text-sm text-petroleo-600" href="/cadastrar">
        Criar conta
      </a>
    </main>
  );
}
```

- [ ] **Step 2: `cadastrar/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastrarPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [erro, setErro] = useState('');

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push(`/verificar?email=${encodeURIComponent(form.email)}`);
    else setErro((await res.json()).error ?? 'Erro ao cadastrar.');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-serif text-3xl text-petroleo-600">Criar conta</h1>
      <form onSubmit={cadastrar} className="flex flex-col gap-3">
        <input
          className="rounded border border-linha p-3"
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="rounded border border-linha p-3"
          type="email"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="rounded border border-linha p-3"
          type="password"
          placeholder="Senha (mín. 8)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={8}
        />
        {erro && <p className="text-sm text-risco-critico">{erro}</p>}
        <button className="rounded bg-petroleo-600 p-3 font-semibold text-white">Cadastrar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: `verificar/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerificarPage() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (res.ok) router.push('/entrar');
    else setMsg((await res.json()).error ?? 'Código inválido.');
  }
  async function reenviar() {
    const res = await fetch('/api/verify-email/resend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setMsg(res.ok ? 'Novo código enviado.' : ((await res.json()).error ?? 'Erro.'));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-serif text-3xl text-petroleo-600">Verificar e-mail</h1>
      <p className="text-sm text-ardosia">Enviamos um código de 6 dígitos para {email}.</p>
      <form onSubmit={verificar} className="flex flex-col gap-3">
        <input
          className="rounded border border-linha p-3 text-center font-mono text-xl tracking-widest"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {msg && <p className="text-sm text-ardosia">{msg}</p>}
        <button className="rounded bg-petroleo-600 p-3 font-semibold text-white">Verificar</button>
      </form>
      <button onClick={reenviar} className="text-sm text-petroleo-600">
        Reenviar código
      </button>
    </main>
  );
}
```

- [ ] **Step 4: `components/SessionMenu.tsx`**

```tsx
'use client';
import { signOut, useSession } from 'next-auth/react';

export function SessionMenu() {
  const { data } = useSession();
  if (!data?.user)
    return (
      <a href="/entrar" className="text-sm text-petroleo-600">
        Entrar
      </a>
    );
  const initials = (data.user.name ?? 'U').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-petroleo-600 text-xs text-white">
        {initials}
      </span>
      <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-ardosia">
        Sair
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Wrap app with `SessionProvider` in `layout.tsx`**

Importar e envolver `{children}`:

```tsx
import { SessionProvider } from 'next-auth/react';
// ...
<body className="font-sans">
  <SessionProvider>{children}</SessionProvider>
</body>;
```

- [ ] **Step 6: Build + manual flow**

Run: `pnpm --filter @radar-urbano/web build` → PASS.
Smoke (dev): cadastrar → pegar código no console → verificar → entrar → header mostra avatar/sair.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): login/register/verify pages and session menu"
```

> **Fim do PR1.** Abrir PR `feat/auth-conta` → `main` (2 reviews + CI). Continuar PR2 na mesma branch ou em branch nova `feat/auth-gating` a partir da `main` após merge.

---

# PR2 — Gating + relato autenticado + rate-limit/auditoria

## Task 9: Redis client + rate-limit (`redis.ts`, `rate-limit.ts`, TDD)

**Files:**

- Create: `apps/web/src/lib/redis.ts`, `apps/web/src/lib/rate-limit.ts`
- Test: `apps/web/src/lib/rate-limit.test.ts`

**Interfaces:**

- Produces: `redis` (ioredis singleton); `rateLimit(key: string, limit: number, windowSec: number): Promise<boolean>` (true = permitido).

- [ ] **Step 1: Write the failing test** (usa um fake redis injetável)

```ts
import { describe, it, expect } from 'vitest';
import { allow } from './rate-limit.js';

describe('allow (pure decision)', () => {
  it('permite até o limite e bloqueia depois', () => {
    expect(allow(1, 3)).toBe(true); // count após incremento = 1
    expect(allow(3, 3)).toBe(true); // = limite
    expect(allow(4, 3)).toBe(false); // > limite
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @radar-urbano/web test`
Expected: FAIL (módulo ausente).

- [ ] **Step 3: Implement `redis.ts`**

```ts
import IORedis from 'ioredis';
export const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});
```

- [ ] **Step 4: Implement `rate-limit.ts`**

```ts
import { redis } from './redis.js';

/** Decisão pura: o contador (já incrementado) está dentro do limite? */
export function allow(count: number, limit: number): boolean {
  return count <= limit;
}

/** Janela fixa por chave. Retorna true se a requisição é permitida. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSec);
  return allow(count, limit);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @radar-urbano/web test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/redis.ts apps/web/src/lib/rate-limit.ts apps/web/src/lib/rate-limit.test.ts
git commit -m "feat(web): redis client and fixed-window rate limiter"
```

---

## Task 10: Auditoria (`audit.ts`)

**Files:**

- Create: `apps/web/src/lib/audit.ts`

**Interfaces:**

- Consumes: `db`, `accessLogs`.
- Produces: `logAccess(action: string, opts: { userId?: string; meta?: unknown; ip?: string }): Promise<void>`.

- [ ] **Step 1: Implement `apps/web/src/lib/audit.ts`**

```ts
import { db, accessLogs } from '@radar-urbano/db';

export async function logAccess(
  action: string,
  opts: { userId?: string; meta?: unknown; ip?: string } = {},
): Promise<void> {
  await db.insert(accessLogs).values({
    action,
    userId: opts.userId ?? null,
    meta: (opts.meta as object) ?? null,
    ip: opts.ip ?? null,
  });
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @radar-urbano/web typecheck` → PASS.

```bash
git add apps/web/src/lib/audit.ts
git commit -m "feat(web): access audit logger"
```

---

## Task 11: Middleware de gating (`middleware.ts`)

**Files:**

- Create: `apps/web/src/middleware.ts`

**Interfaces:**

- Consumes: `auth` (Task 6).

- [ ] **Step 1: Implement `apps/web/src/middleware.ts`**

```ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const PROTECTED = [/^\/mapa/, /^\/painel/, /^\/reportar/, /^\/api\/(tiles|incidents|risk)/];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();
  if (req.auth?.user) return NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const url = new URL('/entrar', req.nextUrl);
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ['/mapa/:path*', '/painel/:path*', '/reportar/:path*', '/api/:path*'],
};
```

> Nota: o matcher cobre `/api/:path*`, mas a função só bloqueia os prefixos em `PROTECTED`; `/api/auth`, `/api/register`, `/api/verify-email` passam.

- [ ] **Step 2: Build + manual**

Run: `pnpm --filter @radar-urbano/web build` → PASS.
Smoke: deslogado em `/painel` → redireciona p/ `/entrar?next=/painel`; `GET /api/incidents/near` deslogado → 401.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(web): auth gating middleware for data routes"
```

---

## Task 12: POST /api/incidents autenticado + flag anônimo + rate-limit/audit

**Files:**

- Modify: `apps/web/src/lib/incidents.ts`, `apps/web/src/app/api/incidents/route.ts`

**Interfaces:**

- Consumes: `requireSession`, `rateLimit`, `logAccess`.
- Produces: `createIncident` aceita `anonymous: boolean` e `authorId` obrigatório.

- [ ] **Step 1: Update `createIncident` in `lib/incidents.ts`**

Adicionar `anonymous` ao input e à inserção:

```ts
export interface CreateIncidentInput {
  categorySlug: CategorySlug;
  sourceId: string;
  authorId: string;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
  anonymous: boolean;
}
```

No `.values({...})` incluir `anonymous: input.anonymous,` e manter `authorId: input.authorId`.
**Remover** a função `listIncidentsGeoJSON` e `recentIncidents` (não enviaremos registros em massa) — serão substituídas pelo tile/near no PR3. Se algo importar, ajustar no PR3.

- [ ] **Step 2: Rewrite `api/incidents/route.ts`** (somente POST; sem GET em massa)

```ts
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
```

> Resposta NÃO inclui `authorId`. Removido o `GET` em massa.

- [ ] **Step 3: Build + smoke**

Run: `pnpm --filter @radar-urbano/web build` → PASS.
Smoke: `POST /api/incidents` deslogado → 401; logado com `sourceId` válido → 201 (sem authorId na resposta); 11ª chamada em 1 min → 429.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): authenticated incident creation with anonymous flag, rate-limit and audit"
```

> **Fim do PR2.**

---

# PR3 — Tiles renderizados no servidor + detalhe por clique

## Task 13: Matemática de tiles (`tiles.ts` bbox, TDD)

**Files:**

- Create: `apps/web/src/lib/tiles.ts`
- Test: `apps/web/src/lib/tiles.test.ts`

**Interfaces:**

- Produces: `tileToBBox(z: number, x: number, y: number): { west: number; south: number; east: number; north: number }`, `lngLatToTilePixel(...)` (para posicionar pontos no tile).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { tileToBBox } from './tiles.js';

describe('tileToBBox', () => {
  it('tile 0/0/0 cobre o mundo', () => {
    const b = tileToBBox(0, 0, 0);
    expect(b.west).toBeCloseTo(-180, 5);
    expect(b.east).toBeCloseTo(180, 5);
    expect(b.north).toBeCloseTo(85.0511, 3);
    expect(b.south).toBeCloseTo(-85.0511, 3);
  });
  it('tile 1/0/0 é o quadrante noroeste', () => {
    const b = tileToBBox(1, 0, 0);
    expect(b.west).toBeCloseTo(-180, 5);
    expect(b.east).toBeCloseTo(0, 5);
    expect(b.north).toBeCloseTo(85.0511, 3);
    expect(b.south).toBeCloseTo(0, 5);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @radar-urbano/web test`
Expected: FAIL (módulo ausente).

- [ ] **Step 3: Implement `tiles.ts`**

```ts
const TILE_SIZE = 256;

function lonOfTileX(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}
function latOfTileY(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function tileToBBox(z: number, x: number, y: number) {
  return {
    west: lonOfTileX(x, z),
    east: lonOfTileX(x + 1, z),
    north: latOfTileY(y, z),
    south: latOfTileY(y + 1, z),
  };
}

/** Converte lng/lat para pixel (0..256) dentro do tile z/x/y. */
export function lngLatToTilePixel(lng: number, lat: number, z: number, x: number, y: number) {
  const n = 2 ** z;
  const px = ((lng + 180) / 360) * n - x;
  const latRad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n - y;
  return { px: px * TILE_SIZE, py: py * TILE_SIZE };
}

export const TILE_SIZE_PX = TILE_SIZE;
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @radar-urbano/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/tiles.ts apps/web/src/lib/tiles.test.ts
git commit -m "feat(web): slippy-map tile math (bbox + pixel projection)"
```

---

## Task 14: Endpoint de tiles raster (`/api/tiles/[z]/[x]/[y]`)

**Files:**

- Create: `apps/web/src/app/api/tiles/[z]/[x]/[y]/route.ts`

**Interfaces:**

- Consumes: `tileToBBox`, `lngLatToTilePixel`, `TILE_SIZE_PX`, `db` (PostGIS), `redis`, `rateLimit`, `requireSession`.

- [ ] **Step 1: Implement the route**

```ts
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
  if (cached) return new NextResponse(cached, { headers: { 'content-type': 'image/png' } });

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
    const color = RAMP[Math.min(RAMP.length - 1, Math.floor(weight * RAMP.length))];
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
  return new NextResponse(png, { headers: { 'content-type': 'image/png' } });
}

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
```

- [ ] **Step 2: Build + manual**

Run: `pnpm --filter @radar-urbano/web build` → PASS.
Smoke (logado via cookie): `GET /api/tiles/11/1206/1075.png` → `image/png` (200); deslogado → 401. (Cobre o Rio em z=11.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/tiles
git commit -m "feat(web): server-rendered raster heatmap tiles with redis cache"
```

---

## Task 15: Detalhe por clique (`/api/incidents/near`)

**Files:**

- Create: `apps/web/src/app/api/incidents/near/route.ts`

**Interfaces:**

- Consumes: `requireSession`, `rateLimit`, `logAccess`, `db`.

- [ ] **Step 1: Implement the route**

```ts
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
  description: string | null;
  category_label: string;
  category_color: string;
  status: string;
  trust_score: number;
  occurred_at: string;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!(await rateLimit(`near:${session.user.id}`, 30, 60))) {
    return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const lng = Number(searchParams.get('lng'));
  const lat = Number(searchParams.get('lat'));
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: 'Coordenadas inválidas.' }, { status: 422 });
  }
  const [row] = await db.execute<Row>(sql`
    SELECT i.id, i.ref_code, i.title, i.description, i.status, i.trust_score,
           to_char(i.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at,
           c.label AS category_label, c.color AS category_color
    FROM incidents i JOIN incident_categories c ON c.slug = i.category_slug
    ORDER BY i.location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    LIMIT 1
  `);
  await logAccess('near', { userId: session.user.id, meta: { lng, lat, id: row?.id } });
  if (!row) return NextResponse.json({ incident: null });
  // Nunca retorna authorId/fonte; identidade do autor jamais sai daqui.
  return NextResponse.json({
    incident: {
      id: row.id,
      refCode: row.ref_code,
      title: row.title,
      description: row.description,
      categoryLabel: row.category_label,
      categoryColor: row.category_color,
      status: row.status,
      trustScore: Number(row.trust_score),
      occurredAt: row.occurred_at,
    },
  });
}
```

- [ ] **Step 2: Build + smoke**

Run: `pnpm --filter @radar-urbano/web build` → PASS.
Smoke (logado): `GET /api/incidents/near?lng=-43.18&lat=-22.91` → 1 incidente; deslogado → 401; 31 chamadas/min → 429.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/incidents/near
git commit -m "feat(web): click-to-detail near endpoint (gated, rate-limited, audited)"
```

---

## Task 16: Map.tsx usa tiles raster + clique abre detalhe

**Files:**

- Modify: `apps/web/src/components/Map.tsx`
- Modify: `apps/web/src/app/mapa/page.tsx` and panel (remover dependência de `/api/incidents` GeoJSON e `recentIncidents`)

**Interfaces:**

- Consumes: `/api/tiles/{z}/{x}/{y}.png`, `/api/incidents/near`.

- [ ] **Step 1: Replace data source in `Map.tsx`** com fonte raster + clique

```tsx
'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const RIO: [number, number] = [-43.1789, -22.9068];

export function Map() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL!,
      center: RIO,
      zoom: 11,
    });
    map.on('load', () => {
      map.addSource('heat', {
        type: 'raster',
        tiles: [`${location.origin}/api/tiles/{z}/{x}/{y}.png`],
        tileSize: 256,
      });
      map.addLayer({
        id: 'heat',
        type: 'raster',
        source: 'heat',
        paint: { 'raster-opacity': 0.85 },
      });
    });
    const popup = new maplibregl.Popup({ closeButton: true });
    map.on('click', async (e) => {
      const r = await fetch(`/api/incidents/near?lng=${e.lngLat.lng}&lat=${e.lngLat.lat}`);
      if (!r.ok) return;
      const { incident } = await r.json();
      if (!incident) return;
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>${incident.title}</strong><br/>${incident.categoryLabel} · ${incident.status}<br/>` +
            `<span style="font-family:monospace">${incident.refCode}</span> · confiança ${incident.trustScore}`,
        )
        .addTo(map);
    });
    return () => map.remove();
  }, []);
  return <div ref={ref} className="h-screen w-full" />;
}
```

- [ ] **Step 2: Remove o painel de "ocorrências recentes"** (ou trocar por contadores agregados). Em `mapa/page.tsx` e no shell, remover qualquer `fetch('/api/incidents')` e import de `recentIncidents`/`listIncidentsGeoJSON`. Se o painel ficar vazio, manter só a legenda e os filtros visuais.

- [ ] **Step 3: Build + manual**

Run: `pnpm --filter @radar-urbano/web build` → PASS.
Smoke (logado): `/mapa` mostra o calor via tiles (Network só com `*.png`, sem JSON de incidentes); clicar abre o popup do incidente mais próximo. Confirmar no DevTools → Network que **não há** resposta com a lista de incidentes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): map consumes raster tiles and click-to-detail (no bulk data on client)"
```

> **Fim do PR3.**

---

## Self-Review (do autor do plano)

**Cobertura do spec:**

- §4 Auth (Google+Credentials+JWT) → Task 6. §5 Cadastro/verificação/Resend → Tasks 5,7,8. §3 Schema → Task 2.
- §6 Tiles → Tasks 13,14; near → Task 15; remoção do GeoJSON → Tasks 12,16. §7 Relato autenticado/anônimo → Task 12.
- §8 Rate-limit/audit → Tasks 9,10 (usados em 12,14,15). §9 Gating → Task 11. §10 UI → Task 8 + Task 16.
- §11 Testes → testes nas Tasks 3,4,9,13 + smokes manuais nas rotas.

**Placeholders:** nenhum — todo passo com lógica traz código completo.

**Consistência de tipos:** `requireSession()` (Task 6) usado em 12,14,15. `rateLimit(key,limit,windowSec)` (Task 9) chamado consistentemente. `tileToBBox`/`lngLatToTilePixel`/`TILE_SIZE_PX` (Task 13) usados na 14. `createIncident` ganha `authorId`+`anonymous` (Task 12) e a resposta nunca expõe autor.

**Notas:** PR1→PR2→PR3 em sequência; cada PR abre contra `main` com 2 reviews + CI. O schema completo (`0001`) entra já no PR1 (colunas/tabelas extras ficam inertes até PR2/PR3). Remoções de `listIncidentsGeoJSON`/`recentIncidents` acontecem no PR2/PR3 — qualquer import remanescente deve ser ajustado nessas tasks (o build acusa).
