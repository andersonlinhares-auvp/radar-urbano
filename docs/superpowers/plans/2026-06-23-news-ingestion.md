# News Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coletar ocorrências de fontes externas (Fogo Cruzado via API + jornais e Facebook via scraping) e exibi-las no mapa como incidentes, sempre mostrando a fonte (nome + link) no detalhe do pin.

**Architecture:** Reaproveita o pipeline `runIngestion` (apps/worker). Adapters puros em `packages/data-ingestion` produzem `NormalizedIncident`. Como notícias não têm lat/lng, o worker injeta um _gazetteer_ de bairros (nome + ponto-na-superfície) nos `params` do `fetch`; os adapters de texto casam bairro+categoria por funções puras e usam o centroide. O worker persiste `source_name`/`source_url` e define o status (Fogo Cruzado=CONFIRMED, demais=PENDING).

**Tech Stack:** TypeScript (ESM, strict, `noUncheckedIndexedAccess`), Node 22 `fetch` global, `node:crypto`, Drizzle/PostGIS, BullMQ/ioredis, Next.js 15, vitest.

## Global Constraints

- **SEM dependências novas.** pnpm local está quebrado → adicionar pacote quebra `--frozen-lockfile` no Docker. Use `fetch` global, regex e `node:crypto`. Proibido `cheerio`/`axios`/`fast-xml-parser`/etc.
- **ESM:** todo import interno usa sufixo `.js` (ex.: `import { x } from './text-utils.js'`). `type: module`.
- **TypeScript strict + noUncheckedIndexedAccess:** acesso por índice é `T | undefined` — trate ou use `!` quando garantido.
- **Falha silenciosa:** adapter nunca derruba o worker; em erro retorna `[]` (no fetch) e o `runIngestion` registra `ingest_logs` ERROR.
- **Coleta educada:** header `User-Agent: RadarUrbanoBot/1.0 (+https://github.com/andersonlinhares-auvp/radar-urbano)`; respeitar `robots.txt`; teto de 50 itens por execução.
- **Janela temporal:** só do ano corrente para frente; `INGESTION_SINCE` (ISO date, default `${anoAtual}-01-01`).
- **Opt-in:** agendamento só com `INGESTION_ENABLED=true`; Facebook só com `INGESTION_FACEBOOK=true`.
- **Verificação de testes:** o pnpm local não roda; cada passo "rodar teste" é validado no **build do Docker** (typecheck do `next build` / `tsc` do worker) e/ou no CI (`vitest`). Escreva os testes mesmo assim — eles são a especificação.
- **Branch:** `feat/auth-ui`. Não trocar de branch.

---

## File Structure

**Criar:**

- `packages/data-ingestion/src/text-utils.ts` — normalização de texto (acentos, caixa, espaços).
- `packages/data-ingestion/src/text-utils.test.ts`
- `packages/data-ingestion/src/classifier.ts` — `classifyCategory(text) → CategorySlug | null`.
- `packages/data-ingestion/src/classifier.test.ts`
- `packages/data-ingestion/src/neighborhood-matcher.ts` — `matchNeighborhood(text, gazetteer) → NeighborhoodRef | null`.
- `packages/data-ingestion/src/neighborhood-matcher.test.ts`
- `packages/data-ingestion/src/http.ts` — `politeFetch`, `isAllowedByRobots`, `USER_AGENT`.
- `packages/data-ingestion/src/http.test.ts`
- `packages/data-ingestion/src/adapters/fogo-cruzado.ts`
- `packages/data-ingestion/src/adapters/news.ts` — fábrica de adapters de notícia (RSS) + G1/O Dia/Extra.
- `packages/data-ingestion/src/adapters/news.test.ts`
- `packages/data-ingestion/src/adapters/facebook.ts` — OTT + Rio de Nojeira (best-effort).
- `packages/db/migrations/0004_source_fields.sql`

**Modificar:**

- `packages/data-ingestion/src/types.ts` — adicionar `NeighborhoodRef` + `status?` em `NormalizedIncident`.
- `packages/data-ingestion/src/index.ts` — registrar/exportar os novos adapters e utils.
- `packages/db/src/schema.ts` — `sourceName`, `sourceUrl` em `incidents`.
- `apps/worker/src/jobs/ingest.ts` — injetar gazetteer; persistir source_name/url + status.
- `apps/worker/src/index.ts` — repeatable jobs + flags de env.
- `apps/web/src/app/api/incidents/recent/route.ts` — retornar source_name/url.
- `apps/web/src/app/api/incidents/near/route.ts` — retornar source_name/url.
- `apps/web/src/components/Map.tsx` — `RecentIncident` + `buildPopupHTML` mostram a fonte.

---

## Task 1: Migration 0004 + schema (source_name, source_url, PARTNER source)

**Files:**

- Create: `packages/db/migrations/0004_source_fields.sql`
- Modify: `packages/db/src/schema.ts` (tabela `incidents`)

**Interfaces:**

- Produces: colunas `incidents.source_name text`, `incidents.source_url text`; linha `sources(kind='PARTNER', name='Fogo Cruzado')`.

- [ ] **Step 1: Criar a migration**

`packages/db/migrations/0004_source_fields.sql`:

```sql
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "source_name" text;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "source_url" text;--> statement-breakpoint
INSERT INTO "sources" ("kind", "name")
SELECT 'PARTNER', 'Fogo Cruzado'
WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE "kind" = 'PARTNER');
```

- [ ] **Step 2: Atualizar o schema Drizzle**

Em `packages/db/src/schema.ts`, dentro de `incidents = pgTable('incidents', { ... })`, logo após `externalId: text('external_id'),` adicione:

```ts
    sourceName: text('source_name'),
    sourceUrl: text('source_url'),
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/0004_source_fields.sql packages/db/src/schema.ts
git commit -m "feat(db): colunas source_name/source_url e source PARTNER (Fogo Cruzado)"
```

---

## Task 2: Util de normalização de texto

**Files:**

- Create: `packages/data-ingestion/src/text-utils.ts`, `packages/data-ingestion/src/text-utils.test.ts`

**Interfaces:**

- Produces: `normalizeText(input: string): string` (minúsculas, sem acentos/diacríticos, pontuação→espaço, espaços colapsados, trim); `containsPhrase(haystackNormalized: string, needleNormalized: string): boolean` (match com fronteira de não-letra).

- [ ] **Step 1: Escrever o teste falhando**

`packages/data-ingestion/src/text-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeText, containsPhrase } from './text-utils.js';

describe('normalizeText', () => {
  it('remove acentos e baixa caixa', () => {
    expect(normalizeText('Glória, Centro!')).toBe('gloria centro');
  });
  it('colapsa espaços', () => {
    expect(normalizeText('  São   João  ')).toBe('sao joao');
  });
});

describe('containsPhrase', () => {
  it('casa frase com fronteira', () => {
    expect(containsPhrase('tiroteio no rio comprido hoje', 'rio comprido')).toBe(true);
  });
  it('não casa substring parcial de palavra', () => {
    expect(containsPhrase('centroavulso aqui', 'centro')).toBe(false);
  });
  it('casa no início e fim', () => {
    expect(containsPhrase('centro', 'centro')).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `Run: pnpm --filter @radar-urbano/data-ingestion test` (ou via Docker/CI). Esperado: FAIL "normalizeText is not a function".

- [ ] **Step 3: Implementar**

`packages/data-ingestion/src/text-utils.ts`:

```ts
/** Minúsculas, sem acentos, pontuação→espaço, espaços colapsados. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** True se needle aparece em haystack com fronteira de não-letra (ambos já normalizados). */
export function containsPhrase(haystackNormalized: string, needleNormalized: string): boolean {
  if (!needleNormalized) return false;
  const i = haystackNormalized.indexOf(needleNormalized);
  if (i === -1) return false;
  const before = i === 0 ? ' ' : haystackNormalized[i - 1]!;
  const afterIdx = i + needleNormalized.length;
  const after = afterIdx >= haystackNormalized.length ? ' ' : haystackNormalized[afterIdx]!;
  const isLetter = (c: string) => /[a-z0-9]/.test(c);
  return !isLetter(before) && !isLetter(after);
}
```

- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-ingestion/src/text-utils.ts packages/data-ingestion/src/text-utils.test.ts
git commit -m "feat(ingestion): util de normalizacao de texto"
```

---

## Task 3: Classificador de categoria

**Files:**

- Create: `packages/data-ingestion/src/classifier.ts`, `packages/data-ingestion/src/classifier.test.ts`

**Interfaces:**

- Consumes: `normalizeText` (Task 2); `CategorySlug` de `@radar-urbano/core`.
- Produces: `classifyCategory(text: string): CategorySlug | null` (retorna a primeira regra que casar, ordem de prioridade definida; `null` se nada casar).

- [ ] **Step 1: Escrever o teste falhando**

`packages/data-ingestion/src/classifier.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyCategory } from './classifier.js';

describe('classifyCategory', () => {
  it('tiroteio → disparo-arma', () => {
    expect(classifyCategory('Tiroteio deixa feridos na Maré')).toBe('disparo-arma');
  });
  it('operação policial → confronto-policial', () => {
    expect(classifyCategory('Operação policial no Alemão termina com confronto')).toBe(
      'confronto-policial',
    );
  });
  it('roubo de celular → roubo-celular', () => {
    expect(classifyCategory('Bandido rouba celular de pedestre em Copacabana')).toBe(
      'roubo-celular',
    );
  });
  it('alagamento → area-alagada', () => {
    expect(classifyCategory('Chuva forte causa alagamento na Tijuca')).toBe('area-alagada');
  });
  it('sem termo conhecido → null', () => {
    expect(classifyCategory('Inauguração de praça no Méier')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.** Esperado: FAIL.

- [ ] **Step 3: Implementar**

`packages/data-ingestion/src/classifier.ts`:

```ts
import type { CategorySlug } from '@radar-urbano/core';
import { normalizeText } from './text-utils.js';

// Regras em ORDEM DE PRIORIDADE: a primeira cujo termo aparecer vence.
// Termos já normalizados (sem acento, minúsculos).
const RULES: ReadonlyArray<{ slug: CategorySlug; terms: readonly string[] }> = [
  {
    slug: 'confronto-policial',
    terms: ['operacao policial', 'confronto', 'tropa', 'bope', 'incursao'],
  },
  { slug: 'tiroteio', terms: ['tiroteio', 'intenso tiroteio', 'troca de tiros'] },
  {
    slug: 'disparo-arma',
    terms: ['disparo', 'disparos', 'bala perdida', 'baleado', 'baleada', 'tiros', 'tiro'],
  },
  { slug: 'arrastao', terms: ['arrastao'] },
  { slug: 'sequestro-relampago', terms: ['sequestro relampago', 'sequestro-relampago'] },
  {
    slug: 'roubo-veiculo',
    terms: ['roubo de carro', 'roubo de veiculo', 'roubo de moto', 'carro roubado', 'moto roubada'],
  },
  { slug: 'roubo-carga', terms: ['roubo de carga', 'carga roubada'] },
  { slug: 'roubo-celular', terms: ['roubo de celular', 'celular roubado', 'rouba celular'] },
  { slug: 'assalto-mao-armada', terms: ['assalto a mao armada', 'mao armada', 'assalto', 'roubo'] },
  { slug: 'tentativa-assalto', terms: ['tentativa de assalto', 'tentativa de roubo'] },
  { slug: 'furto-veiculo', terms: ['furto de carro', 'furto de veiculo', 'furto de moto'] },
  { slug: 'furto-celular', terms: ['furto de celular', 'furto'] },
  { slug: 'golpe', terms: ['golpe', 'estelionato', 'fraude'] },
  { slug: 'area-alagada', terms: ['alagamento', 'enchente', 'alagada', 'inundacao'] },
  {
    slug: 'via-interditada',
    terms: ['interdicao', 'via interditada', 'bloqueio de via', 'pista bloqueada', 'interditada'],
  },
  { slug: 'vandalismo', terms: ['vandalismo', 'depredacao', 'pichacao'] },
];

export function classifyCategory(text: string): CategorySlug | null {
  const t = normalizeText(text);
  for (const rule of RULES) {
    for (const term of rule.terms) {
      if (t.includes(term)) return rule.slug;
    }
  }
  return null;
}
```

> Nota: confira em `packages/core/src/categories.ts` que todos esses slugs existem; ajuste qualquer um que difira (o conjunto foi conferido no design, mas valide).

- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-ingestion/src/classifier.ts packages/data-ingestion/src/classifier.test.ts
git commit -m "feat(ingestion): classificador de categoria por palavras-chave"
```

---

## Task 4: Matcher de bairro (gazetteer)

**Files:**

- Create: `packages/data-ingestion/src/neighborhood-matcher.ts`, `packages/data-ingestion/src/neighborhood-matcher.test.ts`
- Modify: `packages/data-ingestion/src/types.ts` (adicionar `NeighborhoodRef`)

**Interfaces:**

- Consumes: `normalizeText`, `containsPhrase` (Task 2).
- Produces: `interface NeighborhoodRef { id: string; name: string; lng: number; lat: number }`; `matchNeighborhood(text: string, gazetteer: readonly NeighborhoodRef[]): NeighborhoodRef | null` (nome normalizado mais longo que casar vence).

- [ ] **Step 1: Adicionar o tipo em `types.ts`**

No fim de `packages/data-ingestion/src/types.ts`:

```ts
export interface NeighborhoodRef {
  id: string;
  name: string;
  lng: number;
  lat: number;
}
```

- [ ] **Step 2: Escrever o teste falhando**

`packages/data-ingestion/src/neighborhood-matcher.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { matchNeighborhood } from './neighborhood-matcher.js';
import type { NeighborhoodRef } from './types.js';

const GAZ: NeighborhoodRef[] = [
  { id: '1', name: 'Centro', lng: -43.18, lat: -22.9 },
  { id: '2', name: 'Rio Comprido', lng: -43.21, lat: -22.92 },
  { id: '3', name: 'Copacabana', lng: -43.18, lat: -22.97 },
];

describe('matchNeighborhood', () => {
  it('casa bairro por nome', () => {
    expect(matchNeighborhood('Assalto em Copacabana', GAZ)?.id).toBe('3');
  });
  it('nome mais longo vence (Rio Comprido, não Centro)', () => {
    expect(matchNeighborhood('Tiroteio no Rio Comprido', GAZ)?.id).toBe('2');
  });
  it('ignora acento e caixa', () => {
    expect(matchNeighborhood('fato no CENTRO da cidade', GAZ)?.id).toBe('1');
  });
  it('sem bairro → null', () => {
    expect(matchNeighborhood('Notícia sem bairro', GAZ)).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar.** Esperado: FAIL.

- [ ] **Step 4: Implementar**

`packages/data-ingestion/src/neighborhood-matcher.ts`:

```ts
import { normalizeText, containsPhrase } from './text-utils.js';
import type { NeighborhoodRef } from './types.js';

interface Indexed {
  ref: NeighborhoodRef;
  norm: string;
}

let cachedRaw: readonly NeighborhoodRef[] | null = null;
let cachedIndex: Indexed[] = [];

function buildIndex(gazetteer: readonly NeighborhoodRef[]): Indexed[] {
  if (cachedRaw === gazetteer) return cachedIndex;
  cachedRaw = gazetteer;
  cachedIndex = gazetteer
    .map((ref) => ({ ref, norm: normalizeText(ref.name) }))
    .filter((x) => x.norm.length >= 3)
    .sort((a, b) => b.norm.length - a.norm.length); // nome mais longo primeiro
  return cachedIndex;
}

/** Retorna o bairro cujo nome (normalizado, mais longo) aparece no texto, ou null. */
export function matchNeighborhood(
  text: string,
  gazetteer: readonly NeighborhoodRef[],
): NeighborhoodRef | null {
  const haystack = normalizeText(text);
  const index = buildIndex(gazetteer);
  for (const { ref, norm } of index) {
    if (containsPhrase(haystack, norm)) return ref;
  }
  return null;
}
```

- [ ] **Step 5: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/data-ingestion/src/neighborhood-matcher.ts packages/data-ingestion/src/neighborhood-matcher.test.ts packages/data-ingestion/src/types.ts
git commit -m "feat(ingestion): matcher de bairro por gazetteer"
```

---

## Task 5: Util HTTP educado (User-Agent, robots.txt)

**Files:**

- Create: `packages/data-ingestion/src/http.ts`, `packages/data-ingestion/src/http.test.ts`

**Interfaces:**

- Produces: `const USER_AGENT: string`; `parseRobots(txt: string, path: string, ua?: string): boolean` (true = permitido); `politeFetch(url: string, opts?: { accept?: string }): Promise<string>` (GET com UA, lança em status≥400); `isAllowedByRobots(url: string): Promise<boolean>` (busca /robots.txt, fail-open: erro → true).

- [ ] **Step 1: Escrever o teste falhando (parser de robots, sem rede)**

`packages/data-ingestion/src/http.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRobots, USER_AGENT } from './http.js';

const ROBOTS = `User-agent: *
Disallow: /admin
Disallow: /private
Allow: /`;

describe('parseRobots', () => {
  it('permite caminho liberado', () => {
    expect(parseRobots(ROBOTS, '/rss/rio')).toBe(true);
  });
  it('bloqueia caminho proibido', () => {
    expect(parseRobots(ROBOTS, '/admin/x')).toBe(false);
  });
  it('robots vazio → permite', () => {
    expect(parseRobots('', '/qualquer')).toBe(true);
  });
});

it('UA identifica o bot', () => {
  expect(USER_AGENT).toMatch(/RadarUrbanoBot/);
});
```

- [ ] **Step 2: Rodar e ver falhar.** Esperado: FAIL.

- [ ] **Step 3: Implementar**

`packages/data-ingestion/src/http.ts`:

```ts
export const USER_AGENT =
  'RadarUrbanoBot/1.0 (+https://github.com/andersonlinhares-auvp/radar-urbano)';

/**
 * Avalia robots.txt para o nosso UA (grupo '*'): true = permitido.
 * Implementação simples: considera o grupo User-agent: * e regras Disallow por prefixo.
 */
export function parseRobots(txt: string, path: string): boolean {
  if (!txt.trim()) return true;
  const lines = txt.split(/\r?\n/);
  let inStar = false;
  const disallows: string[] = [];
  for (const raw of lines) {
    const line = raw.split('#')[0]!.trim();
    if (!line) continue;
    const [field, ...rest] = line.split(':');
    const key = (field ?? '').trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      inStar = value === '*';
    } else if (inStar && key === 'disallow') {
      if (value) disallows.push(value);
    }
  }
  return !disallows.some((d) => path.startsWith(d));
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const res = await fetch(`${u.origin}/robots.txt`, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return true; // fail-open
    const txt = await res.text();
    return parseRobots(txt, u.pathname);
  } catch {
    return true;
  }
}

/** GET texto com UA. Lança se status ≥ 400. (timeout/retry ficam no runIngestion.) */
export async function politeFetch(url: string, opts?: { accept?: string }): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: opts?.accept ?? 'text/html,application/xhtml+xml,application/xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.text();
}
```

- [ ] **Step 4: Rodar e ver passar.** Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-ingestion/src/http.ts packages/data-ingestion/src/http.test.ts
git commit -m "feat(ingestion): util http educado (user-agent, robots)"
```

---

## Task 6: Adapter Fogo Cruzado (API)

**Files:**

- Create: `packages/data-ingestion/src/adapters/fogo-cruzado.ts`
- Modify: `packages/data-ingestion/src/types.ts` (adicionar `status?` em `NormalizedIncident`)

**Interfaces:**

- Consumes: `SourceAdapter`, `NormalizedIncident`, `RawRecord`, `NeighborhoodRef` de `../types.js`; `USER_AGENT` de `../http.js`.
- Produces: `export const fogoCruzadoAdapter: SourceAdapter`.

**Detalhes da API (verificados na doc):** base `https://api-service.fogocruzado.org.br/api/v2`. `POST /auth/login` body `{ email, password }` → `{ data: { accessToken, expiresIn } }` (trate também `{ accessToken }` na raiz). `GET /states` → lista `{ id, name }` (achar "Rio de Janeiro"). `GET /occurrences?idState=&initialDate=&take=&page=` com header `Authorization: Bearer <token>`. Cada ocorrência: `{ id, address, latitude, longitude, neighborhood: { name } | string, date, contextInfo?, policeAction? }`.

- [ ] **Step 1: Adicionar `status?` em `NormalizedIncident`**

Em `packages/data-ingestion/src/types.ts`, dentro de `NormalizedIncident`, adicione:

```ts
  status?: 'PENDING' | 'CONFIRMED';
```

- [ ] **Step 2: Implementar o adapter**

`packages/data-ingestion/src/adapters/fogo-cruzado.ts`:

```ts
import type { CategorySlug } from '@radar-urbano/core';
import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';
import { USER_AGENT } from '../http.js';

const BASE = 'https://api-service.fogocruzado.org.br/api/v2';
const MAX_ITEMS = 50;

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function login(): Promise<string | null> {
  const email = process.env.FOGOCRUZADO_EMAIL;
  const password = process.env.FOGOCRUZADO_PASSWORD;
  if (!email || !password) {
    throw new Error('FOGOCRUZADO_EMAIL/PASSWORD ausentes.');
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Fogo Cruzado login HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { accessToken?: string; expiresIn?: number };
    accessToken?: string;
    expiresIn?: number;
  };
  const token = json.data?.accessToken ?? json.accessToken ?? null;
  const expiresIn = json.data?.expiresIn ?? json.expiresIn ?? 3600;
  if (!token) throw new Error('Fogo Cruzado: token ausente na resposta de login.');
  tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

async function authedGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Fogo Cruzado GET ${path} HTTP ${res.status}`);
  return res.json();
}

function sinceDate(): string {
  const fromEnv = process.env.INGESTION_SINCE;
  if (fromEnv && /^\d{4}-\d{2}-\d{2}/.test(fromEnv)) return fromEnv.slice(0, 10);
  const year = new Date().getUTCFullYear();
  return `${year}-01-01`;
}

export const fogoCruzadoAdapter: SourceAdapter = {
  id: 'fogo-cruzado',
  sourceKind: 'PARTNER',
  async fetch() {
    const token = await login();
    if (!token) return [];
    // Descobre o idState do Rio de Janeiro.
    const statesJson = (await authedGet('/states', token)) as {
      data?: Array<{ id: string; name: string }>;
    };
    const states = statesJson.data ?? [];
    const rj = states.find((s) => /rio de janeiro/i.test(s.name));
    if (!rj) throw new Error('Fogo Cruzado: estado RJ não encontrado.');
    const initialDate = sinceDate();
    const url = `/occurrences?idState=${rj.id}&initialDate=${initialDate}&take=${MAX_ITEMS}&page=1&order=DESC`;
    const occJson = (await authedGet(url, token)) as { data?: RawRecord[] };
    return occJson.data ?? [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    const lat = Number((raw as { latitude?: unknown }).latitude);
    const lng = Number((raw as { longitude?: unknown }).longitude);
    const nbRaw = (raw as { neighborhood?: unknown }).neighborhood;
    const neighborhood =
      typeof nbRaw === 'string' ? nbRaw : ((nbRaw as { name?: string } | null)?.name ?? '');
    const address = String((raw as { address?: unknown }).address ?? '');
    const policeAction = Boolean((raw as { policeAction?: unknown }).policeAction);
    const category: CategorySlug = policeAction ? 'confronto-policial' : 'disparo-arma';
    const id = String((raw as { id?: unknown }).id ?? '');
    const dateStr = String((raw as { date?: unknown }).date ?? Date.now());
    return {
      externalId: `fogocruzado:${id}`,
      categorySlug: category,
      title: `Disparo de arma de fogo${neighborhood ? ` em ${neighborhood}` : ''}`,
      description: address || undefined,
      lng,
      lat,
      occurredAt: new Date(dateStr),
      trustScore: 0.9,
      sourceLabel: 'Fogo Cruzado',
      rawUrl: `https://fogocruzado.org.br/`,
      needsReview: false,
      status: 'CONFIRMED',
    };
  },
};
```

> Nota: o `rawUrl` do Fogo Cruzado aponta para o site do instituto (não há URL por ocorrência pública); mantenha assim. Se a doc expuser um deep-link por `id`, troque.

- [ ] **Step 3: Verificar build (typecheck)** — será validado no build do Docker do worker (Task 11). Localmente, revise tipos.

- [ ] **Step 4: Commit**

```bash
git add packages/data-ingestion/src/adapters/fogo-cruzado.ts packages/data-ingestion/src/types.ts
git commit -m "feat(ingestion): adapter Fogo Cruzado (API com token)"
```

---

## Task 7: Adapters de notícia (G1, O Dia, Extra) via RSS

**Files:**

- Create: `packages/data-ingestion/src/adapters/news.ts`, `packages/data-ingestion/src/adapters/news.test.ts`

**Interfaces:**

- Consumes: `SourceAdapter`, `NormalizedIncident`, `RawRecord`, `NeighborhoodRef` de `../types.js`; `politeFetch`, `isAllowedByRobots` de `../http.js`; `classifyCategory`; `matchNeighborhood`.
- Produces: `parseRss(xml: string): Array<{ title: string; link: string; description: string; pubDate?: string }>`; `makeNewsAdapter(cfg)`; `g1RioAdapter`, `oDiaAdapter`, `extraAdapter`.

**Como passa o gazetteer:** o `runIngestion` chama `adapter.fetch({ neighborhoods })`. O adapter de notícia lê `params.neighborhoods` (array `NeighborhoodRef`), classifica e casa o bairro, e **já devolve raws com `lng`/`lat` do bairro** + `categorySlug` + metadados. O `normalize` apenas mapeia.

- [ ] **Step 1: Escrever o teste falhando (parser de RSS, sem rede)**

`packages/data-ingestion/src/adapters/news.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRss } from './news.js';

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Tiroteio em Copacabana</title><link>https://g1.example/a</link>
<description><![CDATA[Disparos na orla]]></description><pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate></item>
<item><title>Inauguração no Méier</title><link>https://g1.example/b</link>
<description>festa</description></item>
</channel></rss>`;

describe('parseRss', () => {
  it('extrai itens (title/link/description)', () => {
    const items = parseRss(RSS);
    expect(items.length).toBe(2);
    expect(items[0]!.title).toBe('Tiroteio em Copacabana');
    expect(items[0]!.link).toBe('https://g1.example/a');
    expect(items[0]!.description).toContain('Disparos');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.** Esperado: FAIL.

- [ ] **Step 3: Implementar**

`packages/data-ingestion/src/adapters/news.ts`:

```ts
import type { NormalizedIncident, RawRecord, SourceAdapter, NeighborhoodRef } from '../types.js';
import { politeFetch, isAllowedByRobots } from '../http.js';
import { classifyCategory } from '../classifier.js';
import { matchNeighborhood } from '../neighborhood-matcher.js';

const MAX_ITEMS = 50;

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(m[1]!) : '';
}

/** Parser de RSS simples por regex (sem dependência). */
export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = pick(block, 'title');
    const link = pick(block, 'link');
    if (!title || !link) continue;
    items.push({
      title,
      link,
      description: pick(block, 'description'),
      pubDate: pick(block, 'pubDate') || undefined,
    });
  }
  return items;
}

interface NewsConfig {
  id: string;
  sourceLabel: string;
  rssUrl: string;
}

export function makeNewsAdapter(cfg: NewsConfig): SourceAdapter {
  return {
    id: cfg.id,
    sourceKind: 'NEWS',
    async fetch(params?: Record<string, unknown>) {
      const gazetteer = (params?.neighborhoods as NeighborhoodRef[] | undefined) ?? [];
      if (gazetteer.length === 0) return [];
      if (!(await isAllowedByRobots(cfg.rssUrl))) return [];
      const xml = await politeFetch(cfg.rssUrl, { accept: 'application/rss+xml, application/xml' });
      const items = parseRss(xml).slice(0, MAX_ITEMS);
      const out: RawRecord[] = [];
      for (const item of items) {
        const text = `${item.title} ${item.description}`;
        const category = classifyCategory(text);
        if (!category) continue;
        const nb = matchNeighborhood(text, gazetteer);
        if (!nb) continue;
        out.push({
          link: item.link,
          title: item.title,
          description: item.description,
          pubDate: item.pubDate ?? null,
          category,
          lng: nb.lng,
          lat: nb.lat,
          sourceLabel: cfg.sourceLabel,
        });
      }
      return out;
    },
    normalize(raw: RawRecord): NormalizedIncident {
      const link = String(raw.link);
      const pubDate = raw.pubDate ? new Date(String(raw.pubDate)) : new Date();
      const occurredAt = Number.isNaN(pubDate.getTime()) ? new Date() : pubDate;
      return {
        externalId: `${cfg.id}:${link}`,
        categorySlug: raw.category as NormalizedIncident['categorySlug'],
        title: String(raw.title),
        description: String(raw.description) || undefined,
        lng: Number(raw.lng),
        lat: Number(raw.lat),
        occurredAt,
        trustScore: 0.5,
        sourceLabel: String(raw.sourceLabel),
        rawUrl: link,
        needsReview: true,
        status: 'PENDING',
      };
    },
  };
}

export const g1RioAdapter = makeNewsAdapter({
  id: 'g1-rio',
  sourceLabel: 'G1 Rio',
  rssUrl: 'https://g1.globo.com/rss/g1/rio-de-janeiro/',
});
export const oDiaAdapter = makeNewsAdapter({
  id: 'o-dia',
  sourceLabel: 'O Dia',
  rssUrl: 'https://odia.ig.com.br/rss/rio-de-janeiro.xml',
});
export const extraAdapter = makeNewsAdapter({
  id: 'extra',
  sourceLabel: 'Extra',
  rssUrl: 'https://extra.globo.com/rss/casos-de-policia/',
});
```

> Nota: confirme as URLs de RSS reais de cada veículo no Task 11 (homologação); se um feed retornar 404, ajuste a URL ou troque por outra seção. `externalId` usa a URL (dedup por matéria).

- [ ] **Step 4: Rodar e ver passar (parseRss).** Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-ingestion/src/adapters/news.ts packages/data-ingestion/src/adapters/news.test.ts
git commit -m "feat(ingestion): adapters de noticia G1/O Dia/Extra via RSS"
```

---

## Task 8: Adapters de Facebook (OTT, Rio de Nojeira) — best-effort

**Files:**

- Create: `packages/data-ingestion/src/adapters/facebook.ts`

**Interfaces:**

- Consumes: igual ao Task 7 + `politeFetch`.
- Produces: `ottFacebookAdapter`, `rioDeNojeiraAdapter`.

- [ ] **Step 1: Implementar (parser tolerante; HTML vazio → `[]`)**

`packages/data-ingestion/src/adapters/facebook.ts`:

```ts
import type { NormalizedIncident, RawRecord, SourceAdapter, NeighborhoodRef } from '../types.js';
import { politeFetch } from '../http.js';
import { classifyCategory } from '../classifier.js';
import { matchNeighborhood } from '../neighborhood-matcher.js';

const MAX_ITEMS = 50;

/** Extrai textos de posts do HTML público (best-effort). Facebook costuma bloquear/vazar pouco. */
function extractPosts(html: string): string[] {
  const texts: string[] = [];
  // mbasic/basic costuma usar <p> dentro de divs de post; pegamos blocos de texto plausíveis.
  const matches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  for (const m of matches) {
    const txt = m
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (txt.length >= 20) texts.push(txt);
  }
  return texts.slice(0, MAX_ITEMS);
}

interface FbConfig {
  id: string;
  sourceLabel: string;
  pageUrl: string;
}

function makeFacebookAdapter(cfg: FbConfig): SourceAdapter {
  return {
    id: cfg.id,
    sourceKind: 'NEWS',
    async fetch(params?: Record<string, unknown>) {
      const gazetteer = (params?.neighborhoods as NeighborhoodRef[] | undefined) ?? [];
      if (gazetteer.length === 0) return [];
      let html: string;
      try {
        html = await politeFetch(cfg.pageUrl, { accept: 'text/html' });
      } catch {
        return []; // bloqueio/muro de login → falha silenciosa
      }
      const posts = extractPosts(html);
      const out: RawRecord[] = [];
      let i = 0;
      for (const text of posts) {
        const category = classifyCategory(text);
        if (!category) continue;
        const nb = matchNeighborhood(text, gazetteer);
        if (!nb) continue;
        out.push({
          // sem URL por post confiável → dedup por hash do texto (gerado no normalize)
          text,
          index: i++,
          category,
          lng: nb.lng,
          lat: nb.lat,
          sourceLabel: cfg.sourceLabel,
          pageUrl: cfg.pageUrl,
        });
      }
      return out;
    },
    normalize(raw: RawRecord): NormalizedIncident {
      const text = String(raw.text);
      // external_id estável por conteúdo (sem URL por post).
      // djb2 hash simples (sem dependência).
      let h = 5381;
      for (let k = 0; k < text.length; k++) h = ((h << 5) + h + text.charCodeAt(k)) >>> 0;
      return {
        externalId: `${cfg.id}:${h}`,
        categorySlug: raw.category as NormalizedIncident['categorySlug'],
        title: text.slice(0, 120),
        description: text.slice(0, 500),
        lng: Number(raw.lng),
        lat: Number(raw.lat),
        occurredAt: new Date(),
        trustScore: 0.35,
        sourceLabel: String(raw.sourceLabel),
        rawUrl: String(raw.pageUrl),
        needsReview: true,
        status: 'PENDING',
      };
    },
  };
}

export const ottFacebookAdapter = makeFacebookAdapter({
  id: 'ott-facebook',
  sourceLabel: 'OTT (Facebook)',
  pageUrl: 'https://www.facebook.com/ott.ondetemtiroteio',
});
export const rioDeNojeiraAdapter = makeFacebookAdapter({
  id: 'rio-de-nojeira',
  sourceLabel: 'Rio de Nojeira',
  pageUrl: 'https://www.facebook.com/RiodeNojeira',
});
```

> Nota: confirme as URLs reais das páginas no Task 11. É esperado que o Facebook retorne HTML sem posts (muro de login) — nesse caso `extractPosts` devolve `[]` e a execução fica OK com 0 upserts. Comportamento documentado e aceito.

- [ ] **Step 2: Commit**

```bash
git add packages/data-ingestion/src/adapters/facebook.ts
git commit -m "feat(ingestion): adapters Facebook OTT/Rio de Nojeira (best-effort)"
```

---

## Task 9: Registrar adapters + worker (gazetteer, persistência, agendamento)

**Files:**

- Modify: `packages/data-ingestion/src/index.ts`
- Modify: `apps/worker/src/jobs/ingest.ts`
- Modify: `apps/worker/src/index.ts`

**Interfaces:**

- Consumes: todos os adapters; `runIngestion`.
- Produces: registro dos adapters; `runIngestion` injeta `params.neighborhoods` e grava `source_name`/`source_url`/`status`.

- [ ] **Step 1: Registrar e exportar os adapters**

Em `packages/data-ingestion/src/index.ts`, adicione os imports e registros (junto aos existentes):

```ts
import { fogoCruzadoAdapter } from './adapters/fogo-cruzado.js';
import { g1RioAdapter, oDiaAdapter, extraAdapter } from './adapters/news.js';
import { ottFacebookAdapter, rioDeNojeiraAdapter } from './adapters/facebook.js';

export {
  fogoCruzadoAdapter,
  g1RioAdapter,
  oDiaAdapter,
  extraAdapter,
  ottFacebookAdapter,
  rioDeNojeiraAdapter,
};

registerAdapter(fogoCruzadoAdapter);
registerAdapter(g1RioAdapter);
registerAdapter(oDiaAdapter);
registerAdapter(extraAdapter);
registerAdapter(ottFacebookAdapter);
registerAdapter(rioDeNojeiraAdapter);
```

Também exporte os utils para reuso/teste:

```ts
export * from './text-utils.js';
export * from './classifier.js';
export * from './neighborhood-matcher.js';
export * from './http.js';
```

- [ ] **Step 2: `runIngestion` — carregar gazetteer e injetar nos params**

Em `apps/worker/src/jobs/ingest.ts`, logo após resolver `sourceId` (depois do bloco `if (!sourceId) {...}`), adicione o carregamento do gazetteer e passe-o ao fetch. **Atenção:** mover a chamada `adapter.fetch` para depois disso, OU carregar o gazetteer antes do fetch. Estrutura final do trecho de fetch:

Substitua o bloco que hoje faz `raws = await withRetry(() => withTimeout(adapter.fetch(params), ...))` por:

```ts
// Gazetteer de bairros (nome + ponto interno garantido) para adapters de texto.
const gazetteer = await db.execute<{ id: string; name: string; lng: number; lat: number }>(sql`
      SELECT id, name,
             ST_X(ST_PointOnSurface(geom)) AS lng,
             ST_Y(ST_PointOnSurface(geom)) AS lat
      FROM neighborhoods
    `);
const fetchParams = { ...(params ?? {}), neighborhoods: gazetteer };

let raws: RawRecord[];
try {
  raws = await withRetry(
    () => withTimeout(adapter.fetch(fetchParams), FETCH_TIMEOUT_MS, `fetch ${adapterId}`),
    MAX_RETRIES,
    `fetch ${adapterId}`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Ingestão ${adapterId} falhou no fetch: ${message}`);
  await markError(message);
  return { fetched: 0, upserted: 0 };
}
```

> O `sourceId` é resolvido ANTES do fetch hoje; se preferir, carregue o gazetteer junto da resolução do source. O importante: `adapter.fetch` recebe `neighborhoods`.

- [ ] **Step 3: `runIngestion` — status por fonte + persistir source_name/url**

Ainda em `ingest.ts`, no laço por `raw`:

(a) Troque a linha do status fixo:

```ts
const status = 'PENDING';
```

por:

```ts
const status = normalized.status ?? (normalized.needsReview === false ? 'CONFIRMED' : 'PENDING');
```

(b) No `INSERT ... VALUES` adicione as colunas `source_name`, `source_url`. Substitua o INSERT inteiro por:

```ts
await db.execute(sql`
        INSERT INTO incidents
          (ref_code, external_id, category_slug, source_id, title, description,
           location, neighborhood_id, occurred_at, status, trust_score, source_name, source_url)
        VALUES (
          ${refCode}, ${normalized.externalId}, ${normalized.categorySlug}, ${sourceId},
          ${normalized.title}, ${normalized.description ?? null},
          ${point},
          (SELECT id FROM neighborhoods WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)) LIMIT 1),
          ${normalized.occurredAt.toISOString()}, ${status}, ${trustScore},
          ${normalized.sourceLabel ?? null}, ${normalized.rawUrl ?? null}
        )
        ON CONFLICT (external_id) DO UPDATE SET
          title = EXCLUDED.title,
          trust_score = EXCLUDED.trust_score,
          occurred_at = EXCLUDED.occurred_at,
          neighborhood_id = EXCLUDED.neighborhood_id,
          status = EXCLUDED.status,
          source_name = EXCLUDED.source_name,
          source_url = EXCLUDED.source_url
      `);
```

- [ ] **Step 4: Worker — agendamento opt-in**

Em `apps/worker/src/index.ts`, substitua o bloco atual de agendamento (`Ingestão agendada desativada...`) por:

```ts
import { ingestionQueue } from './queues.js';

if (process.env.INGESTION_ENABLED === 'true') {
  const every = (min: number) => ({ repeat: { every: min * 60_000 } });
  await ingestionQueue.add('fogo-cruzado', { adapterId: 'fogo-cruzado' }, every(20));
  await ingestionQueue.add('g1-rio', { adapterId: 'g1-rio' }, every(60));
  await ingestionQueue.add('o-dia', { adapterId: 'o-dia' }, every(60));
  await ingestionQueue.add('extra', { adapterId: 'extra' }, every(60));
  if (process.env.INGESTION_FACEBOOK === 'true') {
    await ingestionQueue.add('ott-facebook', { adapterId: 'ott-facebook' }, every(60));
    await ingestionQueue.add('rio-de-nojeira', { adapterId: 'rio-de-nojeira' }, every(60));
  }
  console.log('Ingestão agendada ativada.');
} else {
  console.log('Ingestão agendada desativada (defina INGESTION_ENABLED=true para ativar).');
}
```

Garanta que o `Worker('ingestion')` chame `runIngestion(job.data.adapterId, job.data.params)` (já deve estar assim; confirme).

- [ ] **Step 5: Commit**

```bash
git add packages/data-ingestion/src/index.ts apps/worker/src/jobs/ingest.ts apps/worker/src/index.ts
git commit -m "feat(worker): injeta gazetteer, persiste fonte e agenda ingestao opt-in"
```

---

## Task 10: Exibir a fonte nos detalhes (APIs + popup)

**Files:**

- Modify: `apps/web/src/app/api/incidents/recent/route.ts`
- Modify: `apps/web/src/app/api/incidents/near/route.ts`
- Modify: `apps/web/src/components/Map.tsx`

**Interfaces:**

- Produces: `recent`/`near` retornam `sourceName: string | null` e `sourceUrl: string | null`; `RecentIncident` ganha esses campos; `buildPopupHTML` mostra "Fonte: … ver matéria ↗".

- [ ] **Step 1: `recent` — SELECT + mapeamento**

Em `apps/web/src/app/api/incidents/recent/route.ts`:
(a) Na interface `Row`, adicione:

```ts
source_name: string | null;
source_url: string | null;
```

(b) No SELECT, após `nb.name AS neighborhood,` adicione:

```sql
        i.source_name AS source_name,
        i.source_url  AS source_url,
```

(c) No `incidents.map(...)`, adicione ao objeto:

```ts
      sourceName: (row.source_name as string | null) ?? null,
      sourceUrl: (row.source_url as string | null) ?? null,
```

- [ ] **Step 2: `near` — SELECT + retorno**

Em `apps/web/src/app/api/incidents/near/route.ts`:
(a) Na interface `Row`, adicione `source_name: string | null;` e `source_url: string | null;`.
(b) No SELECT, troque `SELECT i.id, i.ref_code, i.title, i.description, i.status, i.trust_score,` por incluir as colunas — adicione após `i.trust_score,`:

```sql
             i.source_name, i.source_url,
```

(c) No objeto `incident:` retornado, adicione:

```ts
        sourceName: row.source_name ?? null,
        sourceUrl: row.source_url ?? null,
```

- [ ] **Step 3: `Map.tsx` — tipo + popup**

Em `apps/web/src/components/Map.tsx`:
(a) No type `RecentIncident`, adicione:

```ts
  sourceName?: string | null;
  sourceUrl?: string | null;
```

(b) Em `buildPopupHTML`, antes do fechamento `</div></div>` final (depois da linha do selo de confiança/trust), adicione o bloco de fonte:

```ts
const sourceBlock = item.sourceName
  ? `<div style="margin-top:6px;font-size:11px;color:#5a6470;">Fonte: ${escapeHtml(item.sourceName)}` +
    (item.sourceUrl && /^https?:\/\//.test(item.sourceUrl)
      ? ` · <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="color:#0e5c63;">ver matéria ↗</a>`
      : '') +
    `</div>`
  : '';
```

e inclua `sourceBlock` na string retornada, logo após o `<div>` do selo de confiança e antes de `</div></div>`. (Insira `+ sourceBlock +` na concatenação final.)

- [ ] **Step 4: Verificar build** — validado no build do Docker do web (Task 11).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/incidents/recent/route.ts apps/web/src/app/api/incidents/near/route.ts apps/web/src/components/Map.tsx
git commit -m "feat(web): exibe a fonte (nome + link) nos detalhes do incidente"
```

---

## Task 11: Homologação (migration, build, ligar ingestão, verificar)

**Files:** nenhum de código (operacional). Executar pelo orquestrador no host.

- [ ] **Step 1: Aplicar a migration 0004 no banco em execução**

```bash
docker compose exec -T postgres psql -U radar -d radar_urbano -c "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source_name text; ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source_url text; INSERT INTO sources (kind,name) SELECT 'PARTNER','Fogo Cruzado' WHERE NOT EXISTS (SELECT 1 FROM sources WHERE kind='PARTNER');"
```

- [ ] **Step 2: Build web + worker (typecheck real)**

```bash
docker compose build web worker
```

Esperado: ambos `exit 0`. Corrigir qualquer erro de tipo/lint que aparecer.

- [ ] **Step 3: Configurar env e subir**
      Adicionar ao `.env` (ou compose) as variáveis: `INGESTION_ENABLED=true`, `INGESTION_SINCE=2026-01-01`, e, se houver conta, `FOGOCRUZADO_EMAIL`/`FOGOCRUZADO_PASSWORD`. (Facebook fica off; ligar só com `INGESTION_FACEBOOK=true`.)

```bash
docker compose up -d web worker
```

- [ ] **Step 4: Disparar manualmente uma coleta de jornal e checar**

```bash
docker compose exec -T --workdir /app/apps/worker worker pnpm exec tsx -e "import('./src/queues.js').then(async (m)=>{await m.ingestionQueue.add('manual',{adapterId:'g1-rio'});await new Promise(r=>setTimeout(r,8000));process.exit(0)})"
docker compose exec -T postgres psql -U radar -d radar_urbano -c "SELECT adapter_id,status,records_fetched,records_upserted,error FROM ingest_logs ORDER BY started_at DESC LIMIT 5;"
docker compose exec -T postgres psql -U radar -d radar_urbano -c "SELECT title, source_name, left(source_url,40) FROM incidents WHERE source_name IS NOT NULL ORDER BY occurred_at DESC LIMIT 5;"
```

Esperado: `ingest_logs` com OK; se o RSS do G1 trouxer matérias com bairro+categoria, aparecem incidentes com `source_name='G1 Rio'`. Validar no mapa (`http://localhost:3000` → /mapa, logado) que o pin abre o popup com "Fonte: G1 Rio · ver matéria ↗".

- [ ] **Step 5: Commit final (se houve ajustes de URL/typos na homologação)**

```bash
git add -A && git commit -m "fix(ingestion): ajustes de homologacao do pipeline de noticias"
```

---

## Self-Review (preenchido)

- **Cobertura do spec:** fontes (Tasks 6,7,8) · matcher (4) · classifier (3) · source nos detalhes (10) · modelo de dados/migration (1) · agendamento opt-in + janela (9) · coleta educada (5) · status por fonte (9). ✔
- **Sem placeholders:** todo passo tem código real. ✔
- **Consistência de tipos:** `NeighborhoodRef` (Task 4) usado em 7/8/9; `NormalizedIncident.status` (Task 6) lido em 9; `sourceLabel`/`rawUrl`/`needsReview` já existem em `types.ts`. ✔
- **Riscos conhecidos:** URLs de RSS e páginas de Facebook precisam de confirmação na homologação (Task 11); endpoint exato do Fogo Cruzado validado na doc mas a forma da resposta é tratada defensivamente.
