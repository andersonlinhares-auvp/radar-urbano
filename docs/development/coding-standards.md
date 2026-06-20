# Padrões de código

Este documento descreve as convenções, ferramentas e regras de qualidade adotadas no monorepo Radar Urbano.

---

## Ferramentas de qualidade

### ESLint

Configuração em `eslint.config.mjs` (flat config, ESLint 9+):

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', '**/.next', '**/drizzle', 'docs/**', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- Usa `typescript-eslint` (preset `recommended`) em todo o monorepo.
- Variáveis não utilizadas são erro, exceto argumentos prefixados com `_`.
- Pastas `dist/`, `.next/`, `drizzle/` e `docs/` são ignoradas pelo linter.

Rodar: `pnpm lint`

### Prettier

Configuração em `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

| Opção           | Valor   | Efeito                                   |
| --------------- | ------- | ---------------------------------------- |
| `semi`          | `true`  | Ponto-e-vírgula obrigatório              |
| `singleQuote`   | `true`  | Aspas simples em strings                 |
| `trailingComma` | `"all"` | Vírgula final em arrays, objetos, params |
| `printWidth`    | 100     | Quebra de linha em 100 colunas           |

Rodar: `pnpm format` (formata) / `pnpm format:check` (só verifica)

### EditorConfig

Configuração em `.editorconfig`:

- Charset: UTF-8
- Fim de linha: LF (Unix)
- Indentação: 2 espaços
- Nova linha ao final do arquivo
- Sem espaços no final da linha (exceto `.md`)

### Husky + lint-staged

O hook `pre-commit` (`.husky/pre-commit`) executa `lint-staged` automaticamente antes de cada commit:

```json
// package.json
"lint-staged": {
  "*.{ts,tsx,js,mjs,json,md,css}": "prettier --write",
  "*.{ts,tsx}": "eslint --fix"
}
```

- Todos os arquivos staged passam pelo Prettier.
- Arquivos TypeScript/JavaScript também passam pelo ESLint com `--fix`.

---

## TypeScript

### Configuração base (`tsconfig.base.json`)

| Opção                              | Valor     | Impacto                                               |
| ---------------------------------- | --------- | ----------------------------------------------------- |
| `target`                           | `ES2022`  | Saída com sintaxe moderna                             |
| `module`                           | `ESNext`  | Módulos ES nativos                                    |
| `moduleResolution`                 | `Bundler` | Compatível com Vite, Next.js, tsx                     |
| `strict`                           | `true`    | Ativa todas as checagens strictas                     |
| `noUncheckedIndexedAccess`         | `true`    | Acesso a arrays/records retorna `T \| undefined`      |
| `esModuleInterop`                  | `true`    | Interop com módulos CommonJS                          |
| `forceConsistentCasingInFileNames` | `true`    | Previne bugs em sistemas de arquivos case-insensitive |
| `resolveJsonModule`                | `true`    | Importação de arquivos `.json`                        |
| `declaration`                      | `true`    | Gera arquivos `.d.ts`                                 |

### Regras obrigatórias

- **Sem `any` implícito**: o modo `strict` inclui `noImplicitAny`. Todo tipo deve ser explícito ou inferível.
- **Sem `as any`**: prefira `as unknown as T` com justificativa ou tipagem correta.
- **Tipos em vez de interfaces** para contratos de dados simples (union types, mapas). Use `interface` para extensão/implementação OO.
- **Enums via `pgEnum`** no schema Drizzle em vez de enums TypeScript (evita discrepância com o banco).

---

## Estrutura de pastas

```
radar-urbano/
├── packages/
│   ├── config/          # tsconfig presets, tailwind preset, tokens.css
│   ├── core/            # domínio puro: sem dependências de infra
│   │   └── src/
│   │       ├── types.ts          # tipos compartilhados
│   │       ├── categories.ts     # CATEGORIES, getCategory
│   │       ├── trust-score.ts    # computeTrustScore, nextReputation
│   │       └── risk-score.ts     # riskContribution, aggregateRisk, normalizeRisk
│   ├── db/              # Drizzle ORM, migrações, seed
│   │   └── src/
│   │       ├── schema.ts         # 16 tabelas
│   │       ├── client.ts         # instância db
│   │       └── index.ts          # re-exports
│   └── data-ingestion/  # SourceAdapter + adapters stub
│       └── src/
│           ├── types.ts          # SourceAdapter, NormalizedIncident
│           ├── registry.ts       # registerAdapter, listAdapters
│           ├── index.ts          # re-exports
│           └── adapters/         # geojson, csv, isp-rj, public-api
├── apps/
│   ├── web/             # Next.js 15 App Router
│   │   └── src/
│   │       ├── app/              # rotas, layouts, API routes
│   │       ├── components/       # componentes React
│   │       └── lib/              # funções de acesso a dados
│   └── worker/          # BullMQ workers
│       └── src/
│           ├── queues.ts         # definição das filas
│           ├── index.ts          # inicialização dos workers
│           └── jobs/             # lógica de cada job
├── docs/                # documentação (architecture, domain, setup, etc.)
└── .github/             # workflows CI, templates de PR/issue
```

---

## Nomenclatura

### Identificadores (código — sempre em inglês)

| Contexto               | Convenção        | Exemplo                          |
| ---------------------- | ---------------- | -------------------------------- |
| Variáveis / funções    | camelCase        | `trustScore`, `computeRisk`      |
| Tipos / interfaces     | PascalCase       | `TrustInput`, `RiskBand`         |
| Constantes             | UPPER_SNAKE_CASE | `RISK_DECAY_LAMBDA`, `REP_MAX`   |
| Arquivos               | kebab-case       | `trust-score.ts`, `ref-code.ts`  |
| Enums PostgreSQL       | snake_case (DB)  | `source_kind`, `incident_status` |
| Colunas DB             | snake_case       | `risk_weight`, `occurred_at`     |
| Slugs de categoria     | kebab-case       | `roubo-celular`, `tiroteio`      |
| Ref codes de incidente | `RU-NNNN`        | `RU-4471`                        |

### Conteúdo do produto (pt-BR)

Labels, descrições, mensagens de erro visíveis ao usuário e texto de notificações são sempre em **português brasileiro**.

---

## Padrão de testes

### Framework: Vitest

Todos os pacotes usam **Vitest** para testes unitários.

- Arquivos de teste: `*.test.ts` colocalizados com o código ou em `__tests__/`.
- Rodar: `pnpm test` (todos os pacotes) ou `pnpm --filter @radar-urbano/core test`.

### TDD (Test-Driven Development)

O projeto adota TDD para lógica de domínio em `packages/core`. A sequência correta:

1. Escreva o teste que descreve o comportamento esperado (vai falhar).
2. Implemente o mínimo necessário para o teste passar.
3. Refatore mantendo os testes verdes.

### Cobertura

Foco em cobertura de lógica de domínio (`packages/core`) — fórmulas de Trust Score e Risk Score devem ter testes para casos limite (valores 0, max, negativos, divisão por zero).

---

## Commits: Conventional Commits

O projeto segue o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição curta>

<corpo opcional>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

### Tipos permitidos

| Tipo       | Uso                                         |
| ---------- | ------------------------------------------- |
| `feat`     | Nova funcionalidade                         |
| `fix`      | Correção de bug                             |
| `docs`     | Alterações em documentação                  |
| `chore`    | Tarefas de manutenção (deps, config, build) |
| `test`     | Adicionar ou corrigir testes                |
| `ci`       | Alterações em pipeline CI/CD                |
| `refactor` | Refatoração sem mudança de comportamento    |

### Exemplos

```
feat(trust-score): add asymmetric reputation penalty for rejected reports
fix(db): correct geography column type quoting in migration
docs: add architecture, domain, setup, standards and ci-cd docs
chore: upgrade pnpm to 9.12.0
```

Todos os commits **devem** terminar com a linha `Co-Authored-By:` conforme padrão do projeto.
