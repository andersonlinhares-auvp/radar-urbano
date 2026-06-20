# Radar Urbano — Design / Spec da Transformação

- **Data:** 2026-06-20
- **Autor:** Arquitetura (Claude Code) + anderson.linhares
- **Status:** Aprovado para planejamento
- **Referência conceitual:** [BenHavis/streetsignal](https://github.com/BenHavis/streetsignal)

## 1. Visão

Plataforma **open source** de inteligência urbana e segurança comunitária, focada no contexto
brasileiro (início no Rio de Janeiro). Combina **dados oficiais (ISP-RJ)**, **relatos da
comunidade** e **fontes externas futuras** para mapeamento colaborativo de ocorrências urbanas e
geração de **inteligência territorial** (heatmaps + risk score), com **sistema de reputação e
validação** dos dados.

O StreetSignal é usado apenas como **referência conceitual** — o Radar Urbano é construído do zero,
com stack própria e portável, sem dependência obrigatória de fornecedores gerenciados.

## 2. Decisões arquiteturais (com justificativa)

| Decisão | Escolha | Por quê |
|---|---|---|
| Estrutura | **Monorepo pnpm** (monolito modular) | Fronteiras físicas fortes, reuso entre `web`/`worker`, onboarding único |
| Banco | **PostgreSQL + PostGIS** (self-hosted) | Geoespacial nativo, custo zero, independência de fornecedor |
| ORM | **Drizzle ORM** | TS-first, SQL bruto e extensões PostGIS de primeira classe |
| Auth | **Auth.js (NextAuth v5)** | Padrão Next.js; OAuth + credenciais; relato anônimo coexiste com contas |
| Frontend | **Next.js 15** (App Router, RSC, TS, Tailwind) | SSR, DX madura, alinhado ao StreetSignal |
| Mapas | **MapLibre GL JS** + tiles OSM | Prioridade da Fase 5; WebGL; **heatmap nativo**; sem Google |
| Fila/jobs | **BullMQ + Redis** | Recálculo de scores e ingestão assíncrona |
| Cache | **Redis** | Cache de heatmaps/risk score |

> Divergência do StreetSignal: ele usa **Supabase** (BaaS gerenciado). Trocamos por Postgres+PostGIS
> self-hosted para atender "um comando sobe tudo", PostGIS nativo, Redis, workers e independência de
> fornecedor — objetivos centrais do brief.

## 3. Estrutura do monorepo

```
radar-urbano/
├─ apps/
│  ├─ web/                 # Next.js 15 — UI, mapa, API routes/server actions, Auth.js
│  └─ worker/              # BullMQ workers: recálculo de scores, jobs de ingestão
├─ packages/
│  ├─ core/               # Domínio puro (TS, sem framework): categorias, trust-score, risk-score
│  ├─ db/                 # Drizzle schema, migrations, seeds, client PostGIS
│  ├─ data-ingestion/     # SourceAdapter + adapters (ISP-RJ, CSV, GeoJSON, API)
│  └─ config/             # eslint, prettier, tsconfig, tailwind preset compartilhados
├─ docker-compose.yml
├─ .env.example
├─ .github/               # issues, PR template, CODEOWNERS, workflows
└─ docs/                  # arquitetura, domínio, setup, devops, development
```

**Princípio de isolamento:** `packages/core` não importa Next.js nem o banco — recebe dados e
retorna cálculos puros (testáveis via TDD). `packages/db` é a única fronteira com PostGIS.

## 4. Modelo de dados (PostGIS)

Entidades e relações principais (detalhe completo em `docs/architecture/database.md`):

- **User** — `id, name, email, image, role (USER|MODERATOR|ADMIN), reputation (int), createdAt`
- **Account / Session / VerificationToken** — tabelas do Auth.js
- **Incident** — `id, refCode, categoryId, sourceId, authorId?, title, description, location geography(Point,4326), occurredAt, status (PENDING|CONFIRMED|REJECTED|RESOLVED), trustScore, createdAt`
- **IncidentCategory** — `id, slug, label, icon, color, riskWeight (0..1), description, group`
- **Verification** — `id, incidentId, userId, kind (CONFIRM|DISPUTE), note?, createdAt`
- **Vote** — `id, incidentId, userId, value (+1|-1), createdAt`
- **Comment** — `id, incidentId, userId, body, createdAt`
- **Source** — `id, kind (OFFICIAL|COMMUNITY|NEWS|PARTNER), name, baseTrust (0..1), url?`
- **Neighborhood** — `id, regionId, name, geom geometry(MultiPolygon,4326)`
- **Region** — `id, name, geom geometry(MultiPolygon,4326)`
- **RiskScore** — `id, scope (STREET|NEIGHBORHOOD|REGION), refId, windowStart, windowEnd, score (0..100), computedAt` (snapshot)
- **EvidenceAsset** — `id, incidentId, url, kind (IMAGE|VIDEO), createdAt`

Índices **GiST** em todas as colunas `geography`/`geometry`. Diagrama ER (Mermaid) no doc.

## 5. Categorias brasileiras (19)

Cada categoria tem `icon`, `color`, `riskWeight`, `description`. Tipadas em `core` e seedadas no banco.
Lista e tabela completa em `docs/domain/incident-categories.md`:

Roubo de celular, Furto de celular, Assalto à mão armada, Tentativa de assalto, Arrastão,
Roubo de veículo, Furto de veículo, Roubo de carga, Golpe, Disparo de arma de fogo, Tiroteio,
Confronto policial, Sequestro relâmpago, Violência contra mulher, Assédio, Vandalismo,
Área alagada, Via interditada, Outro.

Agrupadas em: **Crimes contra a pessoa**, **Crimes contra o patrimônio**, **Violência armada**,
**Mobilidade/infraestrutura**, **Outros**.

## 6. Trust Score (por incidente, 0–100)

Documentado em `docs/domain/trust-score.md`. Função pura em `core`.

```
TrustScore = 100 × (0.30·C + 0.25·S + 0.15·A + 0.15·E + 0.15·R)

C = confirmações da comunidade → 1 − e^(−k·max(0, confirms − disputes)),  k ≈ 0.5
S = fator de origem da fonte   → OFFICIAL 1.0 | PARTNER 0.8 | NEWS 0.6 | COMMUNITY 0.4
A = reputação do autor          → clamp(reputation / REP_MAX, 0, 1)   (anônimo ⇒ 0)
E = evidências anexadas         → min(1, 0.5·temFoto + 0.5·temVideo)
R = recorrência                 → 1 − e^(−k·count_similares_no_raio_e_janela)
```

**Reputação do autor** (inteiro, base 50): +Δ quando seus incidentes são CONFIRMED, −Δ quando
REJECTED/marcados como falsos, com retornos decrescentes (`Δ = base · 1/(1+|rep−50|/50)`).

## 7. Ingestão de dados

`packages/data-ingestion`, documentado em `docs/architecture/data-ingestion.md`.

```ts
interface SourceAdapter {
  id: string;
  sourceKind: SourceKind;          // OFFICIAL | COMMUNITY | NEWS | PARTNER
  fetch(params): Promise<RawRecord[]>;
  normalize(raw: RawRecord): NormalizedIncident;
  // upsert é genérico (camada db), idempotente por chave natural
}
```

Adapters **stub** (arquitetura extensível, sem scraping agressivo): `IspRjAdapter`, `CsvAdapter`,
`GeoJsonAdapter`, `PublicApiAdapter`. Execução via jobs agendados no `worker`.

## 8. Heatmaps & Risk Score

Documentado em `docs/domain/risk-score.md`. Heatmaps por **período**, **categoria** e **bairro**
(camada heatmap nativa do MapLibre). Risk score por **rua/bairro/região** numa janela temporal:

```
RiskScore(área, janela) = normalize_0..100(
    Σ_i [ categoryWeight_i · (trustScore_i/100) · e^(−λ·idade_dias_i) ]  /  fator_área
)
λ ≈ 0.05 (meia-vida ~14 dias); normalização por percentil sobre a distribuição da cidade.
```

Faixas de cor: baixo `#2ECC71`, moderado `#F1C40F`, alto `#E67E22`, severo `#E74C3C`,
crítico `#8E1B1B`. Snapshots persistidos em `RiskScore`, recalculados pelo worker.

## 9. Design system "Radar Urbano" (padrão inicial)

Dark-first (UI de mapa). Substituível pelos tokens do arquivo Claude Design quando fornecido.

- **Brand/primary:** `#0EA5A4` (teal radar) · **accent:** `#38BDF8`
- **Base/superfícies:** `#0B1220` / `#111827` / `#1F2937` · **texto:** `#E5E7EB` / `#9CA3AF`
- **Escala de risco:** ver §8.
- **Tipografia:** Inter (UI), JetBrains Mono (códigos `RPT-XXXX`).
- **Espaçamento:** escala 4px. **Raio:** 8px. Componentes via Tailwind + preset compartilhado.

## 10. Governança & qualidade

- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1)
- `CONTRIBUTING.md`: Conventional Commits, fluxo de branches (`main` protegida, `feat/*`, `fix/*`),
  PR review obrigatório, abertura de issues, padrões de doc
- `SECURITY.md`, `GOVERNANCE.md` (Maintainers / Core Contributors / Community Contributors)
- ESLint + Prettier + EditorConfig + Husky + lint-staged → `docs/development/coding-standards.md`
- `.github/`: ISSUE_TEMPLATE (BUG_REPORT, FEATURE_REQUEST, QUESTION), PULL_REQUEST_TEMPLATE,
  CODEOWNERS
- **GitHub Actions** (lint, test, build em PRs) → `docs/devops/ci-cd.md`

## 11. Documentação a produzir

```
docs/
├─ architecture/current-state.md      # auditoria do StreetSignal (referência/divergências)
├─ architecture/database.md           # entidades + diagrama ER
├─ architecture/geospatial.md         # MapLibre/OSM, PostGIS, decisões
├─ architecture/data-ingestion.md
├─ domain/incident-categories.md
├─ domain/trust-score.md
├─ domain/risk-score.md
├─ setup/local-development.md
├─ development/coding-standards.md
├─ devops/ci-cd.md
└─ project-transformation-report.md   # relatório final
README.md
```

## 12. Mapa Fase do brief → entregável

| Fase | Entregável |
|---|---|
| 1 Auditoria | `docs/architecture/current-state.md` |
| 2 Ambiente | `docker-compose.yml`, `.env.example`, `docs/setup/local-development.md` |
| 3 Banco | `packages/db` (Drizzle+PostGIS), `docs/architecture/database.md` |
| 4 Categorias | `core` + seed, `docs/domain/incident-categories.md` |
| 5 Geo | MapLibre no `web`, `docs/architecture/geospatial.md` |
| 6 Confiança | `core/trust-score`, `docs/domain/trust-score.md` |
| 7 Ingestão | `packages/data-ingestion`, `docs/architecture/data-ingestion.md` |
| 8 Heatmap/Risk | `web` heatmaps + `core/risk-score`, `docs/domain/risk-score.md` |
| 9 Governança | `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `GOVERNANCE.md` |
| 10 Padrões | ESLint/Prettier/EditorConfig/Husky/lint-staged, `docs/development/coding-standards.md` |
| 11 GitHub | `.github/` completo |
| 12 CI/CD | `.github/workflows/*`, `docs/devops/ci-cd.md` |
| 13 Docs finais | `README.md`, `docs/`, `docs/project-transformation-report.md` |

## 13. Estratégia de entrega

- Commits **lógicos e pequenos** por fase (Conventional Commits).
- Domínio (`core`) com **TDD**: trust-score e risk-score testados antes da implementação.
- Documentação atualizada **junto** com o código de cada fase.
- Sem alterações destrutivas (projeto novo; StreetSignal só referência).

## 14. Fora de escopo (YAGNI por ora)

- Scraping ativo de fontes; deploy em produção/cloud; app mobile nativo; i18n além de pt-BR;
  integrações de notificação externas (push/e-mail) além do schema base.

## 15. Riscos técnicos

- Disponibilidade/formato dos dados ISP-RJ (mitigado: adapters stub + interface estável).
- Calibração das fórmulas de trust/risk (mitigado: constantes configuráveis + testes).
- Qualidade de geocoding de relatos da comunidade (mitigado: seleção de ponto no mapa).
- Complexidade do monorepo para novos contribuidores (mitigado: docs de setup + um comando Docker).
