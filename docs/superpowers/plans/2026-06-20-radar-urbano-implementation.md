# Radar Urbano — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o conceito StreetSignal numa plataforma open source de inteligência urbana (Radar Urbano), do zero, com Postgres+PostGIS, Next.js 15, MapLibre e domínio brasileiro.

**Architecture:** Monorepo pnpm (monolito modular). `packages/core` contém domínio puro testável (categorias, trust-score, risk-score); `packages/db` é a única fronteira com PostGIS (Drizzle); `packages/data-ingestion` provê adapters extensíveis; `apps/web` é o Next.js (UI + API + Auth.js); `apps/worker` roda jobs BullMQ. Tudo sobe com um `docker compose up`.

**Tech Stack:** pnpm · TypeScript 5 · Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Drizzle ORM · PostgreSQL 16 + PostGIS 3.4 · Redis 7 · BullMQ · Auth.js (NextAuth v5) · MapLibre GL JS · Vitest · ESLint 9 + Prettier · Husky + lint-staged · GitHub Actions.

## Global Constraints

- **Node** ≥ 20.11 (LTS). **pnpm** ≥ 9. Especificar `packageManager` no root `package.json`.
- **TypeScript strict** em todos os pacotes (`"strict": true`). Tipagem forte obrigatória; sem `any` implícito.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`, `refactor:`). Cada um termina com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **SRID 4326** (WGS84) em todas as colunas geoespaciais. Índices **GiST**.
- **Idioma do produto:** pt-BR. **Idioma do código/identificadores:** inglês.
- **Design tokens** (verbatim do spec §9): Petróleo `#0E5C63` (primária), sinal `#3FB6A8`; Tinta `#11181F`, Papel `#ECE8DF`, Superfície `#FBFAF6`, Linha `#DAD5C9`, Ardósia `#5A6470`, Névoa `#9AA4AE`. Status: Verificado `#0E5C63`, Comunidade `#5A6470`, Atenção `#E0A93B`, Crítico `#A8332F`, Resolvido `#3E8E7E`. Heatmap: `#3FB6A8 → #A9CF7E → #E0A93B → #D2702F → #A8332F`. Risco: BAIXO `#3E8E7E`, MÉDIO `#E0A93B`, ALTO `#D2702F`, CRÍTICO `#A8332F`. Fontes: IBM Plex Sans/Mono/Serif.
- **Prefixo de incidente:** `RU-` (ex.: `RU-4471`).
- **Acessibilidade:** cor sempre acompanhada de rótulo + ícone; contraste mínimo 4.5:1; base 16px.
- **Sem scraping agressivo:** ingestão é apenas arquitetura extensível + adapters stub.

---

## File Structure

```
radar-urbano/
├─ package.json                      # root, workspaces, scripts agregados
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ .editorconfig .prettierrc .prettierignore .gitignore .nvmrc
├─ eslint.config.mjs                 # flat config raiz
├─ .husky/pre-commit
├─ docker-compose.yml  .env.example  Dockerfile (web) Dockerfile.worker
├─ packages/
│  ├─ config/        # tsconfig presets, tailwind preset, tokens.css
│  ├─ core/          # domínio puro: categories, trust-score, risk-score, types
│  ├─ db/            # drizzle schema, client, migrations, seed
│  └─ data-ingestion/# SourceAdapter + adapters stub
├─ apps/
│  ├─ web/           # Next.js 15
│  └─ worker/        # BullMQ workers
├─ .github/          # ISSUE_TEMPLATE, PR template, CODEOWNERS, workflows
└─ docs/             # architecture, domain, setup, development, devops
```

---

## Task 1: Monorepo bootstrap (pnpm + TS base + lint/format)

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.editorconfig`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.nvmrc`, `eslint.config.mjs`, `packages/config/package.json`, `packages/config/tsconfig.json`

**Interfaces:**

- Produces: workspace raiz com scripts `lint`, `format`, `typecheck`, `test`, `build`; preset TS em `packages/config/tsconfig.json` (extendido pelos demais pacotes via `@radar-urbano/config/tsconfig.json`).

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "radar-urbano",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.11" },
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "db:migrate": "pnpm --filter @radar-urbano/db migrate",
    "db:seed": "pnpm --filter @radar-urbano/db seed",
    "prepare": "husky"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "eslint": "^9.13.0",
    "typescript-eslint": "^8.11.0",
    "prettier": "^3.3.3",
    "typescript": "^5.6.3",
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10"
  },
  "lint-staged": {
    "*.{ts,tsx,js,mjs,json,md,css}": "prettier --write",
    "*.{ts,tsx}": "eslint --fix"
  }
}
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "composite": false
  }
}
```

- [ ] **Step 4: Create `packages/config/package.json` and `packages/config/tsconfig.json`**

`packages/config/package.json`:

```json
{
  "name": "@radar-urbano/config",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tsconfig.json": "./tsconfig.json",
    "./tokens.css": "./tokens.css",
    "./tailwind-preset": "./tailwind-preset.mjs"
  },
  "scripts": { "typecheck": "tsc --noEmit -p tsconfig.json" }
}
```

`packages/config/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "noEmit": true } }
```

- [ ] **Step 5: Create lint/format/meta files**

`.editorconfig`:

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
[*.md]
trim_trailing_whitespace = false
```

`.prettierrc`:

```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

`.prettierignore`:

```
pnpm-lock.yaml
**/.next
**/dist
**/drizzle
docs/design/*.html
```

`.nvmrc`:

```
20.11
```

`.gitignore`:

```
node_modules
.next
dist
.env
.env.local
coverage
*.log
.DS_Store
```

`eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', '**/.next', '**/drizzle', 'docs/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install`
Expected: lockfile criado, sem erros.
Run: `pnpm format:check || pnpm format`
Expected: formatação aplicada.

- [ ] **Step 7: Setup Husky + lint-staged**

Run: `pnpm exec husky init`
Then create `.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: bootstrap pnpm monorepo with TS, eslint, prettier, husky

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Design tokens & Tailwind preset (`packages/config`)

**Files:**

- Create: `packages/config/tokens.css`, `packages/config/tailwind-preset.mjs`

**Interfaces:**

- Produces: CSS vars `--ru-*` e preset Tailwind `radarUrbanoPreset` consumido por `apps/web`.

- [ ] **Step 1: Create `packages/config/tokens.css`** (tokens verbatim do spec §9)

```css
:root {
  --ru-petroleo-900: #072e32;
  --ru-petroleo-600: #0e5c63; /* primária */
  --ru-petroleo-500: #11787f;
  --ru-petroleo-400: #3fb6a8;
  --ru-petroleo-200: #b8e0d9;
  --ru-petroleo-100: #e6f2ef;
  --ru-tinta: #11181f;
  --ru-grafite: #2b343d;
  --ru-ardosia: #5a6470;
  --ru-nevoa: #9aa4ae;
  --ru-linha: #dad5c9;
  --ru-papel: #ece8df;
  --ru-superficie: #fbfaf6;
  --ru-status-verificado: #0e5c63;
  --ru-status-comunidade: #5a6470;
  --ru-status-atencao: #e0a93b;
  --ru-status-critico: #a8332f;
  --ru-status-resolvido: #3e8e7e;
  --ru-risco-baixo: #3e8e7e;
  --ru-risco-medio: #e0a93b;
  --ru-risco-alto: #d2702f;
  --ru-risco-critico: #a8332f;
}
```

- [ ] **Step 2: Create `packages/config/tailwind-preset.mjs`**

```js
/** @type {import('tailwindcss').Config} */
export const radarUrbanoPreset = {
  theme: {
    extend: {
      colors: {
        petroleo: {
          100: '#e6f2ef',
          200: '#b8e0d9',
          400: '#3fb6a8',
          500: '#11787f',
          600: '#0e5c63',
          900: '#072e32',
        },
        tinta: '#11181f',
        grafite: '#2b343d',
        ardosia: '#5a6470',
        nevoa: '#9aa4ae',
        linha: '#dad5c9',
        papel: '#ece8df',
        superficie: '#fbfaf6',
        risco: { baixo: '#3e8e7e', medio: '#e0a93b', alto: '#d2702f', critico: '#a8332f' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        serif: ['"IBM Plex Serif"', 'serif'],
      },
      borderRadius: { DEFAULT: '8px' },
    },
  },
};
export default radarUrbanoPreset;
```

- [ ] **Step 3: Verify & commit**

Run: `pnpm --filter @radar-urbano/config typecheck`
Expected: PASS (sem TS no preset; comando termina sem erro).

```bash
git add packages/config
git commit -m "feat(config): add Radar Urbano design tokens and tailwind preset

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `packages/core` scaffold + domain types

**Files:**

- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`, `packages/core/src/types.ts`, `packages/core/src/index.ts`

**Interfaces:**

- Produces: tipos `SourceKind`, `IncidentStatus`, `CategorySlug`, `IncidentCategory`, `RiskBand`, `TrustInput`, `RiskInput`. Pacote exporta tudo via `src/index.ts`.

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@radar-urbano/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "build": "tsc -p tsconfig.json --outDir dist"
  },
  "devDependencies": { "vitest": "^2.1.3", "typescript": "^5.6.3" }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json` and `vitest.config.ts`**

`tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, environment: 'node' } });
```

- [ ] **Step 3: Create `packages/core/src/types.ts`**

```ts
export type SourceKind = 'OFFICIAL' | 'COMMUNITY' | 'NEWS' | 'PARTNER';

export type IncidentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'RESOLVED';

export type CategoryGroup = 'pessoa' | 'patrimonio' | 'violencia_armada' | 'mobilidade' | 'outros';

export type CategorySlug =
  | 'roubo-celular'
  | 'furto-celular'
  | 'assalto-mao-armada'
  | 'tentativa-assalto'
  | 'arrastao'
  | 'roubo-veiculo'
  | 'furto-veiculo'
  | 'roubo-carga'
  | 'golpe'
  | 'disparo-arma'
  | 'tiroteio'
  | 'confronto-policial'
  | 'sequestro-relampago'
  | 'violencia-contra-mulher'
  | 'assedio'
  | 'vandalismo'
  | 'area-alagada'
  | 'via-interditada'
  | 'outro';

export interface IncidentCategory {
  slug: CategorySlug;
  label: string;
  group: CategoryGroup;
  icon: string; // nome de ícone (lucide)
  color: string; // hex
  riskWeight: number; // 0..1
  description: string;
}

export type RiskBand = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface TrustInput {
  sourceKind: SourceKind;
  confirms: number;
  disputes: number;
  authorReputation: number; // 0..REP_MAX
  hasPhoto: boolean;
  hasVideo: boolean;
  recurrenceCount: number; // similares no raio/janela
}

export interface RiskInput {
  categoryWeight: number; // 0..1
  trustScore: number; // 0..100
  ageDays: number;
}
```

- [ ] **Step 4: Create `packages/core/src/index.ts`**

```ts
export * from './types.js';
export * from './categories.js';
export * from './trust-score.js';
export * from './risk-score.js';
```

> Nota: os módulos `categories`, `trust-score`, `risk-score` são criados nas Tasks 4–6. Até lá, comente as três últimas linhas para o typecheck passar, ou execute a Task 3 junto com a 4.

- [ ] **Step 5: Install, typecheck (com index temporário só de types), commit**

Temporariamente, `src/index.ts` exporta só `./types.js`.
Run: `pnpm install && pnpm --filter @radar-urbano/core typecheck`
Expected: PASS.

```bash
git add packages/core
git commit -m "feat(core): scaffold domain package with shared types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Categorias brasileiras (`core`, TDD)

**Files:**

- Test: `packages/core/src/categories.test.ts`
- Create: `packages/core/src/categories.ts`

**Interfaces:**

- Consumes: `IncidentCategory`, `CategorySlug` (Task 3).
- Produces: `CATEGORIES: readonly IncidentCategory[]`, `getCategory(slug): IncidentCategory`, `CATEGORY_BY_SLUG: Record<CategorySlug, IncidentCategory>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { CATEGORIES, getCategory } from './categories.js';

describe('categories', () => {
  it('has the 19 Brazilian categories', () => {
    expect(CATEGORIES).toHaveLength(19);
  });
  it('every category has icon, color, weight in [0,1] and description', () => {
    for (const c of CATEGORIES) {
      expect(c.icon).toBeTruthy();
      expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.riskWeight).toBeGreaterThanOrEqual(0);
      expect(c.riskWeight).toBeLessThanOrEqual(1);
      expect(c.description.length).toBeGreaterThan(5);
    }
  });
  it('slugs are unique', () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it('getCategory returns the matching category', () => {
    expect(getCategory('tiroteio').label).toBe('Tiroteio');
  });
  it('getCategory throws on unknown slug', () => {
    // @ts-expect-error testing runtime guard
    expect(() => getCategory('inexistente')).toThrow();
  });
  it('armed-violence categories carry the highest weights', () => {
    expect(getCategory('tiroteio').riskWeight).toBeGreaterThanOrEqual(0.9);
    expect(getCategory('outro').riskWeight).toBeLessThanOrEqual(0.3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @radar-urbano/core test`
Expected: FAIL ("Cannot find module './categories.js'").

- [ ] **Step 3: Write `packages/core/src/categories.ts`**

```ts
import type { CategorySlug, IncidentCategory } from './types.js';

export const CATEGORIES: readonly IncidentCategory[] = [
  {
    slug: 'roubo-celular',
    label: 'Roubo de celular',
    group: 'patrimonio',
    icon: 'smartphone',
    color: '#D2702F',
    riskWeight: 0.6,
    description: 'Subtração de celular com violência ou grave ameaça.',
  },
  {
    slug: 'furto-celular',
    label: 'Furto de celular',
    group: 'patrimonio',
    icon: 'smartphone',
    color: '#E0A93B',
    riskWeight: 0.4,
    description: 'Subtração de celular sem violência (ex.: descuido).',
  },
  {
    slug: 'assalto-mao-armada',
    label: 'Assalto à mão armada',
    group: 'patrimonio',
    icon: 'shield-alert',
    color: '#A8332F',
    riskWeight: 0.85,
    description: 'Roubo mediante uso de arma.',
  },
  {
    slug: 'tentativa-assalto',
    label: 'Tentativa de assalto',
    group: 'patrimonio',
    icon: 'shield',
    color: '#D2702F',
    riskWeight: 0.6,
    description: 'Tentativa de roubo não consumada.',
  },
  {
    slug: 'arrastao',
    label: 'Arrastão',
    group: 'patrimonio',
    icon: 'users',
    color: '#A8332F',
    riskWeight: 0.8,
    description: 'Ação coletiva de roubo a múltiplas vítimas.',
  },
  {
    slug: 'roubo-veiculo',
    label: 'Roubo de veículo',
    group: 'patrimonio',
    icon: 'car',
    color: '#A8332F',
    riskWeight: 0.8,
    description: 'Subtração de veículo com violência ou ameaça.',
  },
  {
    slug: 'furto-veiculo',
    label: 'Furto de veículo',
    group: 'patrimonio',
    icon: 'car',
    color: '#E0A93B',
    riskWeight: 0.55,
    description: 'Subtração de veículo sem violência.',
  },
  {
    slug: 'roubo-carga',
    label: 'Roubo de carga',
    group: 'patrimonio',
    icon: 'truck',
    color: '#A8332F',
    riskWeight: 0.8,
    description: 'Subtração de carga transportada.',
  },
  {
    slug: 'golpe',
    label: 'Golpe',
    group: 'patrimonio',
    icon: 'alert-triangle',
    color: '#E0A93B',
    riskWeight: 0.4,
    description: 'Fraude ou estelionato (presencial ou digital).',
  },
  {
    slug: 'disparo-arma',
    label: 'Disparo de arma de fogo',
    group: 'violencia_armada',
    icon: 'crosshair',
    color: '#A8332F',
    riskWeight: 0.9,
    description: 'Disparo de arma de fogo registrado.',
  },
  {
    slug: 'tiroteio',
    label: 'Tiroteio',
    group: 'violencia_armada',
    icon: 'crosshair',
    color: '#A8332F',
    riskWeight: 0.95,
    description: 'Troca de tiros em via ou área pública.',
  },
  {
    slug: 'confronto-policial',
    label: 'Confronto policial',
    group: 'violencia_armada',
    icon: 'siren',
    color: '#A8332F',
    riskWeight: 0.9,
    description: 'Operação ou confronto envolvendo forças de segurança.',
  },
  {
    slug: 'sequestro-relampago',
    label: 'Sequestro relâmpago',
    group: 'pessoa',
    icon: 'user-x',
    color: '#A8332F',
    riskWeight: 0.9,
    description: 'Privação de liberdade de curta duração para extorsão.',
  },
  {
    slug: 'violencia-contra-mulher',
    label: 'Violência contra mulher',
    group: 'pessoa',
    icon: 'heart-crack',
    color: '#A8332F',
    riskWeight: 0.85,
    description: 'Agressão física, psicológica ou sexual contra mulher.',
  },
  {
    slug: 'assedio',
    label: 'Assédio',
    group: 'pessoa',
    icon: 'user-minus',
    color: '#D2702F',
    riskWeight: 0.5,
    description: 'Assédio moral ou sexual em espaço público.',
  },
  {
    slug: 'vandalismo',
    label: 'Vandalismo',
    group: 'mobilidade',
    icon: 'spray-can',
    color: '#E0A93B',
    riskWeight: 0.35,
    description: 'Dano a patrimônio público ou privado.',
  },
  {
    slug: 'area-alagada',
    label: 'Área alagada',
    group: 'mobilidade',
    icon: 'waves',
    color: '#E0A93B',
    riskWeight: 0.45,
    description: 'Alagamento que afeta circulação ou imóveis.',
  },
  {
    slug: 'via-interditada',
    label: 'Via interditada',
    group: 'mobilidade',
    icon: 'construction',
    color: '#E0A93B',
    riskWeight: 0.3,
    description: 'Bloqueio ou interdição de via.',
  },
  {
    slug: 'outro',
    label: 'Outro',
    group: 'outros',
    icon: 'help-circle',
    color: '#5A6470',
    riskWeight: 0.2,
    description: 'Ocorrência não classificada nas demais categorias.',
  },
];

export const CATEGORY_BY_SLUG: Record<CategorySlug, IncidentCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
) as Record<CategorySlug, IncidentCategory>;

export function getCategory(slug: CategorySlug): IncidentCategory {
  const category = CATEGORY_BY_SLUG[slug];
  if (!category) throw new Error(`Categoria desconhecida: ${slug}`);
  return category;
}
```

- [ ] **Step 4: Uncomment `./categories.js` export in `src/index.ts` and run tests**

Run: `pnpm --filter @radar-urbano/core test`
Expected: PASS (todos os testes de categorias).

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): add 19 Brazilian incident categories with weights

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Trust score (`core`, TDD)

**Files:**

- Test: `packages/core/src/trust-score.test.ts`
- Create: `packages/core/src/trust-score.ts`

**Interfaces:**

- Consumes: `TrustInput`, `SourceKind` (Task 3).
- Produces: `REP_MAX = 100`, `SOURCE_FACTOR: Record<SourceKind, number>`, `computeTrustScore(input: TrustInput): number` (0..100), `nextReputation(current: number, outcome: 'CONFIRMED' | 'REJECTED'): number`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeTrustScore, nextReputation, REP_MAX } from './trust-score.js';
import type { TrustInput } from './types.js';

const base: TrustInput = {
  sourceKind: 'COMMUNITY',
  confirms: 0,
  disputes: 0,
  authorReputation: 0,
  hasPhoto: false,
  hasVideo: false,
  recurrenceCount: 0,
};

describe('computeTrustScore', () => {
  it('returns a value within [0,100]', () => {
    const s = computeTrustScore(base);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
  it('official sources score higher than community, all else equal', () => {
    const community = computeTrustScore({ ...base, sourceKind: 'COMMUNITY' });
    const official = computeTrustScore({ ...base, sourceKind: 'OFFICIAL' });
    expect(official).toBeGreaterThan(community);
  });
  it('confirmations increase the score with diminishing returns', () => {
    const one = computeTrustScore({ ...base, confirms: 1 });
    const five = computeTrustScore({ ...base, confirms: 5 });
    const ten = computeTrustScore({ ...base, confirms: 10 });
    expect(five).toBeGreaterThan(one);
    expect(ten - five).toBeLessThan(five - one);
  });
  it('disputes offset confirmations', () => {
    const net = computeTrustScore({ ...base, confirms: 5, disputes: 5 });
    const positive = computeTrustScore({ ...base, confirms: 5, disputes: 0 });
    expect(net).toBeLessThan(positive);
  });
  it('evidence raises the score', () => {
    const none = computeTrustScore(base);
    const photo = computeTrustScore({ ...base, hasPhoto: true });
    const both = computeTrustScore({ ...base, hasPhoto: true, hasVideo: true });
    expect(photo).toBeGreaterThan(none);
    expect(both).toBeGreaterThan(photo);
  });
  it('a fully-corroborated official report approaches 100', () => {
    const s = computeTrustScore({
      sourceKind: 'OFFICIAL',
      confirms: 20,
      disputes: 0,
      authorReputation: REP_MAX,
      hasPhoto: true,
      hasVideo: true,
      recurrenceCount: 10,
    });
    expect(s).toBeGreaterThan(90);
  });
});

describe('nextReputation', () => {
  it('rewards confirmed reports and penalizes rejected ones', () => {
    expect(nextReputation(50, 'CONFIRMED')).toBeGreaterThan(50);
    expect(nextReputation(50, 'REJECTED')).toBeLessThan(50);
  });
  it('clamps within [0, REP_MAX]', () => {
    expect(nextReputation(REP_MAX, 'CONFIRMED')).toBeLessThanOrEqual(REP_MAX);
    expect(nextReputation(0, 'REJECTED')).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @radar-urbano/core test`
Expected: FAIL ("Cannot find module './trust-score.js'").

- [ ] **Step 3: Write `packages/core/src/trust-score.ts`**

```ts
import type { SourceKind, TrustInput } from './types.js';

export const REP_MAX = 100;

export const SOURCE_FACTOR: Record<SourceKind, number> = {
  OFFICIAL: 1.0,
  PARTNER: 0.8,
  NEWS: 0.6,
  COMMUNITY: 0.4,
};

const WEIGHTS = { confirm: 0.3, source: 0.25, author: 0.15, evidence: 0.15, recurrence: 0.15 };
const K_CONFIRM = 0.5;
const K_RECUR = 0.5;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const saturating = (x: number, k: number) => 1 - Math.exp(-k * Math.max(0, x));

export function computeTrustScore(input: TrustInput): number {
  const C = saturating(input.confirms - input.disputes, K_CONFIRM);
  const S = SOURCE_FACTOR[input.sourceKind];
  const A = clamp(input.authorReputation / REP_MAX, 0, 1);
  const E = clamp((input.hasPhoto ? 0.5 : 0) + (input.hasVideo ? 0.5 : 0), 0, 1);
  const R = saturating(input.recurrenceCount, K_RECUR);

  const score =
    WEIGHTS.confirm * C +
    WEIGHTS.source * S +
    WEIGHTS.author * A +
    WEIGHTS.evidence * E +
    WEIGHTS.recurrence * R;

  return Math.round(clamp(score, 0, 1) * 100);
}

export function nextReputation(current: number, outcome: 'CONFIRMED' | 'REJECTED'): number {
  const baseDelta = 6;
  const damping = 1 / (1 + Math.abs(current - 50) / 50);
  const delta = baseDelta * damping * (outcome === 'CONFIRMED' ? 1 : -1.5);
  return clamp(Math.round(current + delta), 0, REP_MAX);
}
```

- [ ] **Step 4: Uncomment `./trust-score.js` export in `index.ts`, run tests**

Run: `pnpm --filter @radar-urbano/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): add incident trust score and author reputation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Risk score (`core`, TDD)

**Files:**

- Test: `packages/core/src/risk-score.test.ts`
- Create: `packages/core/src/risk-score.ts`

**Interfaces:**

- Consumes: `RiskInput`, `RiskBand` (Task 3).
- Produces: `RISK_DECAY_LAMBDA = 0.05`, `riskContribution(input: RiskInput): number`, `aggregateRisk(items: RiskInput[], areaFactor: number): number`, `normalizeRisk(raw: number, cityMax: number): number` (0..100), `riskBand(score: number): RiskBand`, `RISK_BAND_COLOR: Record<RiskBand, string>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  riskContribution,
  aggregateRisk,
  normalizeRisk,
  riskBand,
  RISK_BAND_COLOR,
} from './risk-score.js';
import type { RiskInput } from './types.js';

const fresh: RiskInput = { categoryWeight: 1, trustScore: 100, ageDays: 0 };

describe('riskContribution', () => {
  it('is maximal for a fresh, fully-trusted, max-weight incident', () => {
    expect(riskContribution(fresh)).toBeCloseTo(1, 5);
  });
  it('decays with age', () => {
    const old = riskContribution({ ...fresh, ageDays: 30 });
    expect(old).toBeLessThan(riskContribution(fresh));
  });
  it('scales with trust score', () => {
    const low = riskContribution({ ...fresh, trustScore: 20 });
    expect(low).toBeLessThan(riskContribution(fresh));
  });
});

describe('aggregateRisk', () => {
  it('sums contributions divided by area factor', () => {
    const raw = aggregateRisk([fresh, fresh], 2);
    expect(raw).toBeCloseTo(1, 5);
  });
  it('returns 0 for no incidents', () => {
    expect(aggregateRisk([], 1)).toBe(0);
  });
});

describe('normalizeRisk', () => {
  it('maps to 0..100 against city max', () => {
    expect(normalizeRisk(5, 10)).toBe(50);
    expect(normalizeRisk(20, 10)).toBe(100);
    expect(normalizeRisk(0, 10)).toBe(0);
  });
});

describe('riskBand', () => {
  it('classifies scores into bands', () => {
    expect(riskBand(10)).toBe('BAIXO');
    expect(riskBand(45)).toBe('MEDIO');
    expect(riskBand(70)).toBe('ALTO');
    expect(riskBand(90)).toBe('CRITICO');
  });
  it('maps bands to design colors', () => {
    expect(RISK_BAND_COLOR.BAIXO).toBe('#3e8e7e');
    expect(RISK_BAND_COLOR.CRITICO).toBe('#a8332f');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @radar-urbano/core test`
Expected: FAIL ("Cannot find module './risk-score.js'").

- [ ] **Step 3: Write `packages/core/src/risk-score.ts`**

```ts
import type { RiskBand, RiskInput } from './types.js';

export const RISK_DECAY_LAMBDA = 0.05;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function riskContribution(input: RiskInput): number {
  const decay = Math.exp(-RISK_DECAY_LAMBDA * Math.max(0, input.ageDays));
  return input.categoryWeight * (input.trustScore / 100) * decay;
}

export function aggregateRisk(items: RiskInput[], areaFactor: number): number {
  if (items.length === 0) return 0;
  const factor = areaFactor <= 0 ? 1 : areaFactor;
  return items.reduce((sum, i) => sum + riskContribution(i), 0) / factor;
}

export function normalizeRisk(raw: number, cityMax: number): number {
  if (cityMax <= 0) return 0;
  return Math.round(clamp(raw / cityMax, 0, 1) * 100);
}

export function riskBand(score: number): RiskBand {
  if (score < 33) return 'BAIXO';
  if (score < 60) return 'MEDIO';
  if (score < 80) return 'ALTO';
  return 'CRITICO';
}

export const RISK_BAND_COLOR: Record<RiskBand, string> = {
  BAIXO: '#3e8e7e',
  MEDIO: '#e0a93b',
  ALTO: '#d2702f',
  CRITICO: '#a8332f',
};
```

- [ ] **Step 4: Uncomment `./risk-score.js` export in `index.ts`, run all core tests**

Run: `pnpm --filter @radar-urbano/core test`
Expected: PASS (categorias + trust + risk).

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): add risk score aggregation, normalization and bands

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `packages/db` — Drizzle schema + PostGIS + client

**Files:**

- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/src/client.ts`, `packages/db/src/schema.ts`, `packages/db/src/index.ts`, `packages/db/migrations/0000_init.sql`

**Interfaces:**

- Consumes: `DATABASE_URL` (env).
- Produces: `db` (Drizzle client), e tabelas `users`, `accounts`, `sessions`, `verificationTokens`, `sources`, `incidentCategories`, `incidents`, `verifications`, `votes`, `comments`, `evidenceAssets`, `regions`, `neighborhoods`, `riskScores`, `alertSubscriptions`, `notifications`.

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@radar-urbano/db",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts", "./schema": "./src/schema.ts" },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "tsx src/migrate.ts",
    "seed": "tsx src/seed.ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@radar-urbano/core": "workspace:*",
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.4"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json` and `drizzle.config.ts`**

`tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
```

- [ ] **Step 3: Create `packages/db/src/schema.ts`**

```ts
import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  pgEnum,
  customType,
  index,
} from 'drizzle-orm/pg-core';

// PostGIS geography(Point,4326) e geometry(MultiPolygon,4326) via customType
const geographyPoint = customType<{ data: string }>({
  dataType: () => 'geography(Point,4326)',
});
const geometryMultiPolygon = customType<{ data: string }>({
  dataType: () => 'geometry(MultiPolygon,4326)',
});

export const sourceKind = pgEnum('source_kind', ['OFFICIAL', 'COMMUNITY', 'NEWS', 'PARTNER']);
export const incidentStatus = pgEnum('incident_status', [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'RESOLVED',
]);
export const userRole = pgEnum('user_role', ['USER', 'MODERATOR', 'ADMIN']);
export const verificationKind = pgEnum('verification_kind', ['CONFIRM', 'DISPUTE']);
export const evidenceKind = pgEnum('evidence_kind', ['IMAGE', 'VIDEO']);
export const riskScope = pgEnum('risk_scope', ['STREET', 'NEIGHBORHOOD', 'REGION']);
export const notificationKind = pgEnum('notification_kind', [
  'CRITICAL',
  'ATTENTION',
  'VERIFIED',
  'CONFIRMATION',
  'DIGEST',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  role: userRole('role').notNull().default('USER'),
  reputation: integer('reputation').notNull().default(50),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: sourceKind('kind').notNull(),
  name: text('name').notNull(),
  baseTrust: doublePrecision('base_trust').notNull().default(0.4),
  url: text('url'),
});

export const incidentCategories = pgTable('incident_categories', {
  slug: text('slug').primaryKey(),
  label: text('label').notNull(),
  group: text('group').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  riskWeight: doublePrecision('risk_weight').notNull(),
  description: text('description').notNull(),
});

export const regions = pgTable(
  'regions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    geom: geometryMultiPolygon('geom'),
  },
  (t) => ({ geomIdx: index('regions_geom_idx').using('gist', t.geom) }),
);

export const neighborhoods = pgTable(
  'neighborhoods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    regionId: uuid('region_id').references(() => regions.id),
    name: text('name').notNull(),
    geom: geometryMultiPolygon('geom'),
  },
  (t) => ({ geomIdx: index('neighborhoods_geom_idx').using('gist', t.geom) }),
);

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    refCode: text('ref_code').notNull().unique(),
    categorySlug: text('category_slug')
      .notNull()
      .references(() => incidentCategories.slug),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    authorId: uuid('author_id').references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    location: geographyPoint('location').notNull(),
    neighborhoodId: uuid('neighborhood_id').references(() => neighborhoods.id),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    status: incidentStatus('status').notNull().default('PENDING'),
    trustScore: integer('trust_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ locIdx: index('incidents_location_idx').using('gist', t.location) }),
);

export const verifications = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  kind: verificationKind('kind').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  value: integer('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const evidenceAssets = pgTable('evidence_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  kind: evidenceKind('kind').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const riskScores = pgTable('risk_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  scope: riskScope('scope').notNull(),
  refId: text('ref_id').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  score: integer('score').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alertSubscriptions = pgTable(
  'alert_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    center: geographyPoint('center').notNull(),
    radiusKm: doublePrecision('radius_km').notNull().default(2),
    categories: text('categories').array(),
    minSeverity: text('min_severity').notNull().default('ATTENTION'),
    channels: text('channels').array().notNull().default(['IN_APP']),
    active: boolean('active').notNull().default(true),
  },
  (t) => ({ centerIdx: index('alert_center_idx').using('gist', t.center) }),
);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: notificationKind('kind').notNull(),
  incidentId: uuid('incident_id').references(() => incidents.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  body: text('body'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Create `packages/db/src/client.ts` and `index.ts`**

`client.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL não definido');

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
```

`index.ts`:

```ts
export * from './schema.js';
export { db } from './client.js';
export type { Database } from './client.js';
```

- [ ] **Step 5: Create PostGIS bootstrap migration `packages/db/migrations/0000_init.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

- [ ] **Step 6: Generate Drizzle migrations**

Run: `pnpm install`
Run: `pnpm --filter @radar-urbano/db generate`
Expected: arquivos SQL gerados em `packages/db/migrations/`.

- [ ] **Step 7: Typecheck & commit**

Run: `pnpm --filter @radar-urbano/db typecheck`
Expected: PASS.

```bash
git add packages/db
git commit -m "feat(db): add Drizzle schema with PostGIS entities

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: `packages/db` — migrate runner + seed

**Files:**

- Create: `packages/db/src/migrate.ts`, `packages/db/src/seed.ts`

**Interfaces:**

- Consumes: `db`, schema (Task 7), `CATEGORIES` (Task 4).
- Produces: comandos `pnpm db:migrate` e `pnpm db:seed` funcionais.

- [ ] **Step 1: Create `packages/db/src/migrate.ts`**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definido');

const migrationClient = postgres(url, { max: 1 });
const db = drizzle(migrationClient);

await db.execute('CREATE EXTENSION IF NOT EXISTS postgis;');
await migrate(db, { migrationsFolder: './migrations' });
await migrationClient.end();
console.log('Migrações aplicadas.');
```

- [ ] **Step 2: Create `packages/db/src/seed.ts`** (categorias + fontes base)

```ts
import { CATEGORIES } from '@radar-urbano/core';
import { db } from './client.js';
import { incidentCategories, sources } from './schema.js';

await db
  .insert(incidentCategories)
  .values(
    CATEGORIES.map((c) => ({
      slug: c.slug,
      label: c.label,
      group: c.group,
      icon: c.icon,
      color: c.color,
      riskWeight: c.riskWeight,
      description: c.description,
    })),
  )
  .onConflictDoNothing();

await db
  .insert(sources)
  .values([
    { kind: 'COMMUNITY', name: 'Comunidade', baseTrust: 0.4 },
    { kind: 'OFFICIAL', name: 'ISP-RJ', baseTrust: 1.0, url: 'https://www.isp.rj.gov.br' },
    { kind: 'NEWS', name: 'Imprensa', baseTrust: 0.6 },
  ])
  .onConflictDoNothing();

console.log('Seed concluído.');
process.exit(0);
```

- [ ] **Step 3: Commit** (execução real ocorre na Task 10, após Docker)

```bash
git add packages/db
git commit -m "feat(db): add migrate runner and seed for categories and sources

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Ambiente Docker (compose + .env.example + Dockerfiles)

**Files:**

- Create: `docker-compose.yml`, `.env.example`, `Dockerfile`, `Dockerfile.worker`, `.dockerignore`

**Interfaces:**

- Produces: serviços `postgres` (PostGIS), `redis`, `web`, `worker`, `adminer`; subida com `docker compose up`.

- [ ] **Step 1: Create `.env.example`**

```bash
# Banco
POSTGRES_USER=radar
POSTGRES_PASSWORD=radar
POSTGRES_DB=radar_urbano
DATABASE_URL=postgresql://radar:radar@postgres:5432/radar_urbano

# Redis
REDIS_URL=redis://redis:6379

# Auth.js
AUTH_SECRET=troque-por-uma-string-aleatoria-de-32-bytes
AUTH_URL=http://localhost:3000
# OAuth opcional
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# App
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  web:
    build: { context: ., dockerfile: Dockerfile }
    env_file: .env
    ports: ['3000:3000']
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }

  worker:
    build: { context: ., dockerfile: Dockerfile.worker }
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }

  adminer:
    image: adminer:4
    ports: ['8080:8080']
    depends_on:
      postgres: { condition: service_healthy }

volumes:
  pgdata:
```

- [ ] **Step 3: Create `Dockerfile` (web) and `Dockerfile.worker`**

`Dockerfile`:

```dockerfile
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @radar-urbano/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@radar-urbano/web", "start"]
```

`Dockerfile.worker`:

```dockerfile
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "--filter", "@radar-urbano/worker", "start"]
```

`.dockerignore`:

```
node_modules
**/node_modules
**/.next
**/dist
.git
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example Dockerfile Dockerfile.worker .dockerignore
git commit -m "feat(infra): containerized stack with postgis, redis, web, worker

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: `apps/web` — Next.js scaffold + Auth.js + tokens

**Files:**

- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**

- Consumes: `@radar-urbano/db`, `@radar-urbano/core`, `@radar-urbano/config`.
- Produces: app Next.js rodando em `:3000`, com Auth.js configurado (Drizzle adapter), fontes IBM Plex e tokens aplicados.

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@radar-urbano/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@radar-urbano/core": "workspace:*",
    "@radar-urbano/db": "workspace:*",
    "@auth/drizzle-adapter": "^1.7.2",
    "next": "^15.0.2",
    "next-auth": "5.0.0-beta.25",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "maplibre-gl": "^4.7.1"
  },
  "devDependencies": {
    "@radar-urbano/config": "workspace:*",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
  }
}
```

- [ ] **Step 2: Create config files**

`tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] },
    "noEmit": true
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"]
}
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@radar-urbano/core', '@radar-urbano/db'] };
export default config;
```

`postcss.config.mjs`:

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';
import { radarUrbanoPreset } from '@radar-urbano/config/tailwind-preset';
const config: Config = {
  presets: [radarUrbanoPreset],
  content: ['./src/**/*.{ts,tsx}'],
};
export default config;
```

- [ ] **Step 3: Create `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@import '@radar-urbano/config/tokens.css';

body {
  background: var(--ru-papel);
  color: var(--ru-tinta);
}
```

- [ ] **Step 4: Create `src/auth.ts` and route handler**

`src/auth.ts`:

```ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@radar-urbano/db';
import { accounts, sessions, users, verificationTokens } from '@radar-urbano/db/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  session: { strategy: 'database' },
});
```

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

- [ ] **Step 5: Create `layout.tsx` and `page.tsx`**

`src/app/layout.tsx`:

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Radar Urbano', description: 'Inteligência urbana colaborativa' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Serif:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-12">
      <h1 className="font-serif text-5xl text-petroleo-600">Radar Urbano</h1>
      <p className="mt-4 text-ardosia">Inteligência urbana colaborativa, aberta e geoespacial.</p>
    </main>
  );
}
```

- [ ] **Step 6: Bring stack up, migrate, seed, verify**

Run: `cp .env.example .env`
Run: `docker compose up -d postgres redis`
Run: `pnpm install && pnpm db:migrate && pnpm db:seed`
Expected: "Migrações aplicadas." e "Seed concluído.".
Run: `pnpm --filter @radar-urbano/web dev` then open `http://localhost:3000`
Expected: título "Radar Urbano" renderizado com a cor Petróleo.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js app with Auth.js and design tokens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: `apps/web` — API de incidentes + criação de relato

**Files:**

- Create: `apps/web/src/lib/incidents.ts`, `apps/web/src/lib/ref-code.ts`, `apps/web/src/lib/ref-code.test.ts`, `apps/web/src/app/api/incidents/route.ts`

**Interfaces:**

- Consumes: `db`, schema, `getCategory`, `computeTrustScore`.
- Produces: `GET /api/incidents` (lista GeoJSON com bbox opcional), `POST /api/incidents` (cria relato comunidade), `generateRefCode(): string` (`RU-XXXX`).

- [ ] **Step 1: Write the failing test for ref-code**

`apps/web/src/lib/ref-code.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateRefCode } from './ref-code.js';

describe('generateRefCode', () => {
  it('matches RU-XXXX with 4 uppercase alphanumerics', () => {
    expect(generateRefCode()).toMatch(/^RU-[A-Z0-9]{4}$/);
  });
  it('is reasonably unique across many calls', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateRefCode()));
    expect(codes.size).toBeGreaterThan(480);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @radar-urbano/web test`
Expected: FAIL ("Cannot find module './ref-code.js'").

- [ ] **Step 3: Implement `src/lib/ref-code.ts`**

```ts
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateRefCode(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `RU-${suffix}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @radar-urbano/web test`
Expected: PASS.

- [ ] **Step 5: Implement `src/lib/incidents.ts`** (consultas com PostGIS)

```ts
import { sql } from 'drizzle-orm';
import { db, incidents } from '@radar-urbano/db';
import { computeTrustScore, getCategory, type CategorySlug } from '@radar-urbano/core';
import { generateRefCode } from './ref-code.js';

export interface CreateIncidentInput {
  categorySlug: CategorySlug;
  sourceId: string;
  authorId?: string;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
}

export async function listIncidentsGeoJSON() {
  const rows = await db.execute(sql`
    SELECT id, ref_code, category_slug, status, trust_score,
           ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
    FROM incidents
    ORDER BY occurred_at DESC
    LIMIT 1000
  `);
  return {
    type: 'FeatureCollection' as const,
    features: rows.map((r) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(r.lng), Number(r.lat)] },
      properties: {
        id: r.id,
        refCode: r.ref_code,
        category: r.category_slug,
        status: r.status,
        trustScore: r.trust_score,
      },
    })),
  };
}

export async function createIncident(input: CreateIncidentInput) {
  getCategory(input.categorySlug); // valida slug (lança se inválido)
  const trustScore = computeTrustScore({
    sourceKind: 'COMMUNITY',
    confirms: 0,
    disputes: 0,
    authorReputation: 0,
    hasPhoto: false,
    hasVideo: false,
    recurrenceCount: 0,
  });
  const refCode = generateRefCode();
  const [row] = await db
    .insert(incidents)
    .values({
      refCode,
      categorySlug: input.categorySlug,
      sourceId: input.sourceId,
      authorId: input.authorId,
      title: input.title,
      description: input.description,
      location: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`,
      occurredAt: input.occurredAt,
      trustScore,
    })
    .returning();
  return row;
}
```

- [ ] **Step 6: Implement `src/app/api/incidents/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { listIncidentsGeoJSON, createIncident } from '@/lib/incidents';

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
```

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): incidents API with PostGIS GeoJSON and report creation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: `apps/web` — Mapa MapLibre + heatmap + marcadores

**Files:**

- Create: `apps/web/src/components/Map.tsx`, `apps/web/src/app/mapa/page.tsx`

**Interfaces:**

- Consumes: `GET /api/incidents`, `NEXT_PUBLIC_MAP_STYLE_URL`.
- Produces: tela `/mapa` com MapLibre, camada de heatmap e camada de pontos por categoria (cor do design).

- [ ] **Step 1: Implement `src/components/Map.tsx`** (client component)

```tsx
'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const RIO: [number, number] = [-43.1729, -22.9068];

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
    map.on('load', async () => {
      const data = await fetch('/api/incidents').then((r) => r.json());
      map.addSource('incidents', { type: 'geojson', data });
      map.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'incidents',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'trustScore'], 0, 0, 100, 1],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(63,182,168,0)',
            0.2,
            '#3fb6a8',
            0.4,
            '#a9cf7e',
            0.6,
            '#e0a93b',
            0.8,
            '#d2702f',
            1,
            '#a8332f',
          ],
          'heatmap-radius': 30,
        },
      });
      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'incidents',
        minzoom: 13,
        paint: {
          'circle-radius': 6,
          'circle-color': '#0e5c63',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fbfaf6',
        },
      });
    });
    return () => map.remove();
  }, []);
  return <div ref={ref} className="h-screen w-full" />;
}
```

- [ ] **Step 2: Implement `src/app/mapa/page.tsx`**

```tsx
import { Map } from '@/components/Map';
export default function MapaPage() {
  return <Map />;
}
```

- [ ] **Step 3: Manual verify**

Run: garantir `web` rodando e ter ≥1 incidente (via `POST /api/incidents`).
Open: `http://localhost:3000/mapa`
Expected: mapa centrado no Rio; heatmap/pontos aparecem.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): MapLibre map with heatmap and incident points

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: `packages/data-ingestion` — SourceAdapter + adapters stub (TDD)

**Files:**

- Create: `packages/data-ingestion/package.json`, `packages/data-ingestion/tsconfig.json`, `packages/data-ingestion/vitest.config.ts`, `packages/data-ingestion/src/types.ts`, `packages/data-ingestion/src/registry.ts`, `packages/data-ingestion/src/adapters/{isp-rj,csv,geojson,public-api}.ts`, `packages/data-ingestion/src/index.ts`
- Test: `packages/data-ingestion/src/registry.test.ts`, `packages/data-ingestion/src/adapters/geojson.test.ts`

**Interfaces:**

- Consumes: `NormalizedIncident` deriva de `@radar-urbano/core` types.
- Produces: `interface SourceAdapter`, `registerAdapter`, `getAdapter`, `listAdapters`, e 4 adapters stub.

- [ ] **Step 1: Create package files (`package.json`, `tsconfig.json`, `vitest.config.ts`)**

`package.json`:

```json
{
  "name": "@radar-urbano/data-ingestion",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit -p tsconfig.json" },
  "dependencies": { "@radar-urbano/core": "workspace:*" },
  "devDependencies": { "vitest": "^2.1.3", "typescript": "^5.6.3" }
}
```

`tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "include": ["src"] }`
`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, environment: 'node' } });
```

- [ ] **Step 2: Create `src/types.ts`**

```ts
import type { CategorySlug, SourceKind } from '@radar-urbano/core';

export interface NormalizedIncident {
  externalId: string;
  categorySlug: CategorySlug;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
}

export interface RawRecord {
  [key: string]: unknown;
}

export interface SourceAdapter {
  id: string;
  sourceKind: SourceKind;
  fetch(params?: Record<string, unknown>): Promise<RawRecord[]>;
  normalize(raw: RawRecord): NormalizedIncident;
}
```

- [ ] **Step 3: Write failing tests**

`src/registry.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registerAdapter, getAdapter, listAdapters, _resetRegistry } from './registry.js';
import type { SourceAdapter } from './types.js';

const fake: SourceAdapter = {
  id: 'fake',
  sourceKind: 'COMMUNITY',
  async fetch() {
    return [];
  },
  normalize() {
    throw new Error('noop');
  },
};

describe('adapter registry', () => {
  beforeEach(() => _resetRegistry());
  it('registers and retrieves an adapter', () => {
    registerAdapter(fake);
    expect(getAdapter('fake')).toBe(fake);
  });
  it('lists registered adapters', () => {
    registerAdapter(fake);
    expect(listAdapters().map((a) => a.id)).toContain('fake');
  });
  it('throws on unknown adapter', () => {
    expect(() => getAdapter('nope')).toThrow();
  });
});
```

`src/adapters/geojson.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { geoJsonAdapter } from './geojson.js';

describe('geoJsonAdapter.normalize', () => {
  it('maps a GeoJSON feature to a NormalizedIncident', () => {
    const result = geoJsonAdapter.normalize({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-43.17, -22.9] },
      properties: {
        externalId: 'x1',
        category: 'outro',
        title: 'Teste',
        occurredAt: '2026-06-01T12:00:00Z',
      },
    });
    expect(result.lng).toBe(-43.17);
    expect(result.lat).toBe(-22.9);
    expect(result.categorySlug).toBe('outro');
    expect(result.occurredAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm install && pnpm --filter @radar-urbano/data-ingestion test`
Expected: FAIL (módulos ausentes).

- [ ] **Step 5: Implement `src/registry.ts`**

```ts
import type { SourceAdapter } from './types.js';

let registry = new Map<string, SourceAdapter>();

export function registerAdapter(adapter: SourceAdapter): void {
  registry.set(adapter.id, adapter);
}
export function getAdapter(id: string): SourceAdapter {
  const adapter = registry.get(id);
  if (!adapter) throw new Error(`Adapter desconhecido: ${id}`);
  return adapter;
}
export function listAdapters(): SourceAdapter[] {
  return [...registry.values()];
}
export function _resetRegistry(): void {
  registry = new Map();
}
```

- [ ] **Step 6: Implement adapters**

`src/adapters/geojson.ts`:

```ts
import type { CategorySlug } from '@radar-urbano/core';
import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

export const geoJsonAdapter: SourceAdapter = {
  id: 'geojson',
  sourceKind: 'PARTNER',
  async fetch() {
    // Stub: ingestão real lê um arquivo/URL GeoJSON. Sem scraping agressivo.
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    const f = raw as {
      geometry: { coordinates: [number, number] };
      properties: Record<string, unknown>;
    };
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties;
    return {
      externalId: String(p.externalId),
      categorySlug: (p.category as CategorySlug) ?? 'outro',
      title: String(p.title ?? 'Ocorrência'),
      description: p.description ? String(p.description) : undefined,
      lng,
      lat,
      occurredAt: new Date(String(p.occurredAt)),
    };
  },
};
```

`src/adapters/csv.ts`:

```ts
import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

export const csvAdapter: SourceAdapter = {
  id: 'csv',
  sourceKind: 'PARTNER',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.id),
      categorySlug: 'outro',
      title: String(raw.titulo ?? 'Ocorrência'),
      lng: Number(raw.lng),
      lat: Number(raw.lat),
      occurredAt: new Date(String(raw.data)),
    };
  },
};
```

`src/adapters/isp-rj.ts`:

```ts
import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

// Stub: prepara a arquitetura para ingestão futura de microdados do ISP-RJ.
// Não realiza scraping; espera arquivos oficiais já baixados.
export const ispRjAdapter: SourceAdapter = {
  id: 'isp-rj',
  sourceKind: 'OFFICIAL',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.fato_id),
      categorySlug: 'outro',
      title: String(raw.titulo_do_delito ?? 'Ocorrência oficial'),
      lng: Number(raw.longitude),
      lat: Number(raw.latitude),
      occurredAt: new Date(String(raw.data_fato)),
    };
  },
};
```

`src/adapters/public-api.ts`:

```ts
import type { NormalizedIncident, RawRecord, SourceAdapter } from '../types.js';

export const publicApiAdapter: SourceAdapter = {
  id: 'public-api',
  sourceKind: 'PARTNER',
  async fetch() {
    return [];
  },
  normalize(raw: RawRecord): NormalizedIncident {
    return {
      externalId: String(raw.id),
      categorySlug: 'outro',
      title: String(raw.title ?? 'Ocorrência'),
      lng: Number(raw.lng),
      lat: Number(raw.lat),
      occurredAt: new Date(String(raw.timestamp)),
    };
  },
};
```

- [ ] **Step 7: Implement `src/index.ts`** (registra os adapters padrão)

```ts
export * from './types.js';
export * from './registry.js';
import { registerAdapter } from './registry.js';
import { ispRjAdapter } from './adapters/isp-rj.js';
import { csvAdapter } from './adapters/csv.js';
import { geoJsonAdapter } from './adapters/geojson.js';
import { publicApiAdapter } from './adapters/public-api.js';

export { ispRjAdapter, csvAdapter, geoJsonAdapter, publicApiAdapter };

registerAdapter(ispRjAdapter);
registerAdapter(csvAdapter);
registerAdapter(geoJsonAdapter);
registerAdapter(publicApiAdapter);
```

- [ ] **Step 8: Run tests & commit**

Run: `pnpm --filter @radar-urbano/data-ingestion test`
Expected: PASS.

```bash
git add packages/data-ingestion
git commit -m "feat(ingestion): extensible SourceAdapter registry with stub adapters

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 14: `apps/worker` — BullMQ + jobs de score e ingestão

**Files:**

- Create: `apps/worker/package.json`, `apps/worker/tsconfig.json`, `apps/worker/src/queues.ts`, `apps/worker/src/index.ts`, `apps/worker/src/jobs/recompute-risk.ts`

**Interfaces:**

- Consumes: `REDIS_URL`, `db`, `aggregateRisk`, `normalizeRisk`, `listAdapters`.
- Produces: worker que processa fila `risk` (recálculo de risk score por bairro) e `ingestion` (executa adapters).

- [ ] **Step 1: Create `apps/worker/package.json`**

```json
{
  "name": "@radar-urbano/worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@radar-urbano/core": "workspace:*",
    "@radar-urbano/db": "workspace:*",
    "@radar-urbano/data-ingestion": "workspace:*",
    "bullmq": "^5.21.2",
    "ioredis": "^5.4.1"
  },
  "devDependencies": { "tsx": "^4.19.1", "typescript": "^5.6.3" }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

- [ ] **Step 3: Create `src/queues.ts`**

```ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
export const riskQueue = new Queue('risk', { connection });
export const ingestionQueue = new Queue('ingestion', { connection });
```

- [ ] **Step 4: Create `src/jobs/recompute-risk.ts`**

```ts
import { sql } from 'drizzle-orm';
import { db, riskScores } from '@radar-urbano/db';
import { aggregateRisk, normalizeRisk, type RiskInput } from '@radar-urbano/core';

export async function recomputeNeighborhoodRisk(windowDays = 30): Promise<number> {
  const rows = await db.execute(sql`
    SELECT n.id AS neighborhood_id,
           c.risk_weight AS category_weight,
           i.trust_score AS trust_score,
           EXTRACT(EPOCH FROM (now() - i.occurred_at)) / 86400 AS age_days
    FROM incidents i
    JOIN incident_categories c ON c.slug = i.category_slug
    JOIN neighborhoods n ON n.id = i.neighborhood_id
    WHERE i.occurred_at > now() - (${windowDays} || ' days')::interval
  `);

  const byNeighborhood = new Map<string, RiskInput[]>();
  for (const r of rows) {
    const key = String(r.neighborhood_id);
    const list = byNeighborhood.get(key) ?? [];
    list.push({
      categoryWeight: Number(r.category_weight),
      trustScore: Number(r.trust_score),
      ageDays: Number(r.age_days),
    });
    byNeighborhood.set(key, list);
  }

  const raw = [...byNeighborhood.entries()].map(([id, items]) => ({
    id,
    value: aggregateRisk(items, 1),
  }));
  const cityMax = Math.max(1, ...raw.map((r) => r.value));
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 86400_000);

  for (const r of raw) {
    await db.insert(riskScores).values({
      scope: 'NEIGHBORHOOD',
      refId: r.id,
      windowStart,
      windowEnd: now,
      score: normalizeRisk(r.value, cityMax),
    });
  }
  return raw.length;
}
```

- [ ] **Step 5: Create `src/index.ts`** (workers + agendamento)

```ts
import { Worker } from 'bullmq';
import { connection, riskQueue } from './queues.js';
import { recomputeNeighborhoodRisk } from './jobs/recompute-risk.js';
import { listAdapters } from '@radar-urbano/data-ingestion';

new Worker(
  'risk',
  async () => {
    const count = await recomputeNeighborhoodRisk();
    console.log(`Risk recomputado para ${count} bairros.`);
  },
  { connection },
);

new Worker(
  'ingestion',
  async (job) => {
    const adapters = listAdapters();
    console.log(
      `Ingestão acionada (${job.name}); adapters disponíveis: ${adapters.map((a) => a.id).join(', ')}`,
    );
  },
  { connection },
);

// Recalcula risco a cada hora.
await riskQueue.add('hourly', {}, { repeat: { every: 3600_000 } });
console.log('Worker Radar Urbano iniciado.');
```

- [ ] **Step 6: Typecheck & commit**

Run: `pnpm install && pnpm --filter @radar-urbano/worker typecheck`
Expected: PASS.

```bash
git add apps/worker
git commit -m "feat(worker): BullMQ workers for risk recompute and ingestion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 15: `apps/web` — Painel de risco (dashboard)

**Files:**

- Create: `apps/web/src/app/painel/page.tsx`, `apps/web/src/lib/risk.ts`

**Interfaces:**

- Consumes: `db`, `riskScores`, `neighborhoods`, `riskBand`, `RISK_BAND_COLOR`.
- Produces: `/painel` (server component) com ranking de bairros por risco e faixa colorida.

- [ ] **Step 1: Implement `src/lib/risk.ts`**

```ts
import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { riskBand, RISK_BAND_COLOR, type RiskBand } from '@radar-urbano/core';

export interface NeighborhoodRisk {
  name: string;
  score: number;
  band: RiskBand;
  color: string;
}

export async function topNeighborhoodRisk(limit = 10): Promise<NeighborhoodRisk[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (rs.ref_id) n.name AS name, rs.score AS score
    FROM risk_scores rs
    JOIN neighborhoods n ON n.id::text = rs.ref_id
    WHERE rs.scope = 'NEIGHBORHOOD'
    ORDER BY rs.ref_id, rs.computed_at DESC
  `);
  return rows
    .map((r) => {
      const score = Number(r.score);
      const band = riskBand(score);
      return { name: String(r.name), score, band, color: RISK_BAND_COLOR[band] };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

- [ ] **Step 2: Implement `src/app/painel/page.tsx`**

```tsx
import { topNeighborhoodRisk } from '@/lib/risk';

export default async function PainelPage() {
  const ranking = await topNeighborhoodRisk();
  return (
    <main className="mx-auto max-w-4xl p-10">
      <h1 className="font-serif text-3xl">Panorama de risco urbano</h1>
      <ul className="mt-6 divide-y divide-linha">
        {ranking.map((n) => (
          <li key={n.name} className="flex items-center justify-between py-3">
            <span>{n.name}</span>
            <span className="flex items-center gap-3 font-mono">
              <span className="h-2 w-24 rounded bg-linha">
                <span
                  className="block h-2 rounded"
                  style={{ width: `${n.score}%`, background: n.color }}
                />
              </span>
              <span style={{ color: n.color }}>{n.score}</span>
              <span className="text-ardosia">{n.band}</span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Manual verify & commit**

Open `http://localhost:3000/painel` (após o worker rodar ao menos uma vez).
Expected: ranking com barras coloridas por faixa.

```bash
git add apps/web
git commit -m "feat(web): neighborhood risk dashboard panel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 16: Governança open source (Fase 9)

**Files:**

- Create: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `GOVERNANCE.md`, `LICENSE`

**Interfaces:**

- Produces: documentos de governança na raiz.

- [ ] **Step 1: Create `LICENSE`** (MIT — permissiva, favorece adoção)

Conteúdo: texto MIT padrão, titular "Radar Urbano Contributors", ano 2026.

- [ ] **Step 2: Create `CODE_OF_CONDUCT.md`**

Adaptar o **Contributor Covenant v2.1** (texto oficial), com contato `conduta@radarurbano.org`. Seções: Nosso compromisso, Nossos padrões, Responsabilidades de aplicação, Escopo, Aplicação, Diretrizes de aplicação, Atribuição.

- [ ] **Step 3: Create `CONTRIBUTING.md`**

Seções obrigatórias:

- **Fluxo de branches:** `main` protegida; trabalho em `feat/<slug>`, `fix/<slug>`, `docs/<slug>`.
- **Conventional Commits:** tabela de tipos (`feat|fix|docs|chore|test|ci|refactor|perf`).
- **Revisão obrigatória:** todo PR exige ≥1 review aprovado + CI verde.
- **Abertura de issues:** usar templates; bug precisa de passos de reprodução.
- **Padrões de documentação:** atualizar docs no mesmo PR do código; pt-BR no produto, inglês no código.
- **Setup rápido:** apontar para `docs/setup/local-development.md`.

- [ ] **Step 4: Create `SECURITY.md`**

Seções: versões suportadas; como reportar vulnerabilidade (e-mail `seguranca@radarurbano.org`, divulgação responsável, SLA de 72h para resposta inicial); o que NÃO reportar publicamente; escopo.

- [ ] **Step 5: Create `GOVERNANCE.md`**

Definir papéis:

- **Maintainers:** decisão final, releases, gestão de acesso.
- **Core Contributors:** direito de review/merge em áreas específicas.
- **Community Contributors:** qualquer pessoa via PR.
  Incluir: processo de promoção entre papéis, tomada de decisão (consenso → voto de maintainers), e processo de RFC para mudanças grandes.

- [ ] **Step 6: Commit**

```bash
git add CODE_OF_CONDUCT.md CONTRIBUTING.md SECURITY.md GOVERNANCE.md LICENSE
git commit -m "docs: add open source governance (CoC, contributing, security, governance)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 17: `.github/` — templates + CODEOWNERS (Fase 11)

**Files:**

- Create: `.github/ISSUE_TEMPLATE/BUG_REPORT.md`, `.github/ISSUE_TEMPLATE/FEATURE_REQUEST.md`, `.github/ISSUE_TEMPLATE/QUESTION.md`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`

**Interfaces:**

- Produces: estrutura GitHub de contribuição.

- [ ] **Step 1: Create `BUG_REPORT.md`** (front-matter + seções)

```markdown
---
name: Relato de bug
about: Reporte um comportamento incorreto
title: 'bug: '
labels: ['bug', 'triage']
---

## Descrição

## Passos para reproduzir

1.

## Comportamento esperado

## Comportamento atual

## Ambiente (SO, navegador, versão)

## Capturas de tela / logs
```

- [ ] **Step 2: Create `FEATURE_REQUEST.md`**

```markdown
---
name: Pedido de funcionalidade
about: Sugira uma melhoria
title: 'feat: '
labels: ['enhancement', 'triage']
---

## Problema relacionado

## Solução proposta

## Alternativas consideradas

## Contexto adicional
```

- [ ] **Step 3: Create `QUESTION.md`**

```markdown
---
name: Dúvida
about: Faça uma pergunta sobre o projeto
title: 'question: '
labels: ['question']
---

## Sua dúvida

## O que você já tentou / leu
```

- [ ] **Step 4: Create `config.yml`** (desabilita issues em branco, aponta discussions)

```yaml
blank_issues_enabled: false
contact_links:
  - name: Dúvidas gerais
    url: https://github.com/radar-urbano/radar-urbano/discussions
    about: Use as Discussions para perguntas abertas.
```

- [ ] **Step 5: Create `PULL_REQUEST_TEMPLATE.md`**

```markdown
## O que muda

## Por quê

## Como testar

## Checklist

- [ ] Segue Conventional Commits
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] `pnpm lint && pnpm typecheck && pnpm test` passam
```

- [ ] **Step 6: Create `CODEOWNERS`**

```
* @radar-urbano/maintainers
/packages/core/ @radar-urbano/core-contributors
/packages/db/ @radar-urbano/core-contributors
/apps/web/ @radar-urbano/core-contributors
/docs/ @radar-urbano/maintainers
```

- [ ] **Step 7: Commit**

```bash
git add .github
git commit -m "ci: add GitHub issue/PR templates and CODEOWNERS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 18: CI/CD — GitHub Actions (Fase 12)

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Produces: pipeline lint + typecheck + test + build em PRs e push para `main`.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_USER: radar
          POSTGRES_PASSWORD: radar
          POSTGRES_DB: radar_urbano
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U radar" --health-interval 5s
          --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://radar:radar@localhost:5432/radar_urbano
      REDIS_URL: redis://localhost:6379
      AUTH_SECRET: ci-secret-ci-secret-ci-secret-32
      NEXT_PUBLIC_MAP_STYLE_URL: https://demotiles.maplibre.org/style.json
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate && pnpm db:seed
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint/typecheck/test/build pipeline on PRs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 19: Documentação de arquitetura e domínio (Fases 1,3,5,6,7,8,10)

**Files:**

- Create: `docs/architecture/current-state.md`, `docs/architecture/database.md`, `docs/architecture/geospatial.md`, `docs/architecture/data-ingestion.md`, `docs/domain/incident-categories.md`, `docs/domain/trust-score.md`, `docs/domain/risk-score.md`, `docs/setup/local-development.md`, `docs/development/coding-standards.md`, `docs/devops/ci-cd.md`

**Interfaces:**

- Produces: documentação completa referenciada pelo spec §11.

- [ ] **Step 1: `docs/architecture/current-state.md`** — auditoria do StreetSignal

Conteúdo: tabela de auditoria (Next.js 14, Supabase, Leaflet, TS, sem auth, reports anônimos); subsistemas (banco, auth, mapas, reports, moderação, notificações); divergências adotadas no Radar Urbano e justificativa (Supabase → Postgres+PostGIS; Leaflet → MapLibre; +auth, +trust, +ingestão).

- [ ] **Step 2: `docs/architecture/database.md`** — entidades + diagrama ER

Incluir diagrama Mermaid `erDiagram` com todas as tabelas da Task 7 e relações; descrição de cada entidade; nota sobre SRID 4326 e índices GiST.

```mermaid
erDiagram
  users ||--o{ incidents : reports
  sources ||--o{ incidents : origin
  incident_categories ||--o{ incidents : classifies
  incidents ||--o{ verifications : has
  incidents ||--o{ votes : has
  incidents ||--o{ comments : has
  incidents ||--o{ evidence_assets : has
  regions ||--o{ neighborhoods : contains
  neighborhoods ||--o{ incidents : located_in
  users ||--o{ alert_subscriptions : owns
  users ||--o{ notifications : receives
```

- [ ] **Step 3: `docs/architecture/geospatial.md`**

Decisões: MapLibre GL + tiles OSM (sem Google), PostGIS geography/geometry, índices GiST, consultas `ST_*`, estilos de mapa (Claro/Escuro/Híbrido/Satélite), atribuição OSM/PCRJ.

- [ ] **Step 4: `docs/architecture/data-ingestion.md`**

Descrever `SourceAdapter` (interface da Task 13), registry, os 4 adapters stub, fluxo `fetch → normalize → upsert`, agendamento via worker, política de "sem scraping agressivo".

- [ ] **Step 5: `docs/domain/incident-categories.md`**

Tabela das 19 categorias (slug, label, grupo, ícone, cor, riskWeight, descrição) gerada a partir de `CATEGORIES` (Task 4).

- [ ] **Step 6: `docs/domain/trust-score.md`**

Fórmula completa (pesos, fatores C/S/A/E/R, constantes K), exemplos numéricos, regra de reputação `nextReputation`. Espelha a Task 5.

- [ ] **Step 7: `docs/domain/risk-score.md`**

Fórmula de contribuição/agregação/normalização, λ de decaimento, faixas e cores, exemplos. Espelha a Task 6.

- [ ] **Step 8: `docs/setup/local-development.md`**

Passo a passo: pré-requisitos (Docker, Node 20, pnpm 9), `cp .env.example .env`, `docker compose up`, `pnpm db:migrate && pnpm db:seed`, URLs (`:3000`, Adminer `:8080`), troubleshooting.

- [ ] **Step 9: `docs/development/coding-standards.md`**

ESLint/Prettier/EditorConfig/Husky/lint-staged, convenções TS strict, estrutura de pastas, nomenclatura, padrão de testes (Vitest, TDD), Conventional Commits.

- [ ] **Step 10: `docs/devops/ci-cd.md`**

Descrever o workflow `ci.yml` (jobs, serviços, env), branch protection recomendada, como rodar localmente o equivalente.

- [ ] **Step 11: Commit**

```bash
git add docs
git commit -m "docs: add architecture, domain, setup, standards and ci-cd docs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 20: README + relatório de transformação (Fase 13)

**Files:**

- Create: `README.md`, `docs/project-transformation-report.md`

**Interfaces:**

- Produces: porta de entrada do projeto + relatório final.

- [ ] **Step 1: Create `README.md`**

Seções: logo/varredura (ASCII ou SVG), visão do projeto, badges de CI, **arquitetura** (diagrama do monorepo), **stack**, **setup local** (resumo + link), **screenshots** (placeholders apontando para o design `docs/design/radar-urbano-identity.html`), **roadmap** (v0.1 fundação → v1), **como contribuir** (link CONTRIBUTING), licença.

- [ ] **Step 2: Create `docs/project-transformation-report.md`**

Seções exigidas pelo brief:

- **O que foi encontrado** (auditoria StreetSignal).
- **O que foi alterado / removido / adicionado** (Supabase→PostGIS, Leaflet→MapLibre, +auth, +trust/risk, +ingestão, +governança, +CI).
- **Próximos passos recomendados.**
- **Riscos técnicos identificados** (cf. spec §15).
- **Backlog sugerido para v1** (lista priorizada: geocoding de relatos, moderação UI, push/e-mail real, importação ISP-RJ real, polígonos de bairros do Rio, testes E2E, deploy).

- [ ] **Step 3: Final verification**

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: todos PASS.
Run: `docker compose up -d && pnpm db:migrate && pnpm db:seed`
Expected: stack sobe; `:3000` e `/mapa` e `/painel` respondem.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/project-transformation-report.md
git commit -m "docs: add README and project transformation report

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (do autor do plano)

**Cobertura das fases do brief:**

- Fase 1 (auditoria) → Task 19.1 · Fase 2 (Docker/.env/setup) → Tasks 9, 19.8 · Fase 3 (banco/PostGIS/ER) → Tasks 7, 8, 19.2
- Fase 4 (categorias) → Task 4, 19.5 · Fase 5 (geo) → Tasks 12, 19.3 · Fase 6 (trust) → Tasks 5, 19.6
- Fase 7 (ingestão) → Tasks 13, 19.4 · Fase 8 (heatmap/risk) → Tasks 6, 12, 15, 19.7
- Fase 9 (governança) → Task 16 · Fase 10 (padrões) → Tasks 1, 19.9 · Fase 11 (GitHub) → Task 17
- Fase 12 (CI/CD) → Tasks 18, 19.10 · Fase 13 (docs finais/README/relatório) → Tasks 19, 20

**Consistência de tipos:** `TrustInput`/`RiskInput`/`SourceKind`/`CategorySlug` definidos na Task 3 e usados consistentemente nas Tasks 4–6, 11, 13, 14. `SourceAdapter` definido na Task 13 e usado na 14. `RISK_BAND_COLOR` (Task 6) usado na 15.

**Notas de execução:** as Tasks 4–6 dependem de descomentar exports em `src/index.ts` (criado na Task 3) — seguir a ordem. Tasks que tocam o banco (8, 11, 14, 15) exigem a stack Docker no ar (Task 9/10).
