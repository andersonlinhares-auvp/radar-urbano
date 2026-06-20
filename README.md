# Radar Urbano

**Inteligência urbana colaborativa, open source, com foco no Rio de Janeiro.**

Radar Urbano é uma plataforma de crowdsourcing e análise de incidentes urbanos que combina relatos da comunidade com ingestão de dados oficiais para gerar mapas de risco em tempo quase real. O projeto nasceu como reconstrução completa do StreetSignal em arquitetura de monorepo, com banco geoespacial self-hosted, autenticação, sistema de reputação e pipeline assíncrono de dados.

> **Identidade visual:** a marca usa o conceito de "varredura" — um sinal de radar que percorre a cidade. Paleta de cores, tipografia (IBM Plex Sans/Mono/Serif) e tokens de design completos disponíveis em [`docs/design/radar-urbano-identity.html`](docs/design/radar-urbano-identity.html).

---

## Visão do projeto

Cidadãos relatam ocorrências (obras, alagamentos, crime, poluição e mais 15 categorias) diretamente no mapa. Cada relato é ponderado por um **trust score** baseado na reputação do autor e em evidências anexadas. Um worker assíncrono recalcula a cada hora o **risk score** por bairro e publica o resultado como snapshot auditável. O painel `/painel` exibe o mapa de calor atual; `/mapa` permite explorar e criar incidentes.

O projeto é open source (MIT), desenvolvido em pt-BR, e tem como horizonte servir inicialmente o município do Rio de Janeiro com dados reais do ISP-RJ e polígonos de bairros oficiais.

---

## Arquitetura

```
radar-urbano/                          # monorepo pnpm
├── apps/
│   ├── web/          # Next.js 15 — App Router, Auth.js, MapLibre GL, API REST
│   └── worker/       # BullMQ: filas risk (hourly) e ingestion
├── packages/
│   ├── core/         # domínio puro: 19 categorias BR, trust-score, risk-score, types
│   ├── db/           # Drizzle ORM + PostGIS, 16 tabelas, migrações versionadas, seed
│   ├── data-ingestion/ # SourceAdapter + 4 adapters stub (geojson, csv, isp-rj, public-api)
│   └── config/       # presets tsconfig, Tailwind, tokens.css
├── .github/          # ISSUE_TEMPLATE, PR template, CODEOWNERS, workflow CI
├── docs/             # arquitetura, domínio, setup, desenvolvimento, devops, design
├── docker-compose.yml  Dockerfile  Dockerfile.worker  .env.example
├── CONTRIBUTING.md   CODE_OF_CONDUCT.md  GOVERNANCE.md  SECURITY.md  LICENSE
└── package.json      pnpm-workspace.yaml  tsconfig.base.json  eslint.config.mjs
```

### Diagrama de dependências

```
┌──────────────────────────────────────────────────────────────┐
│                     apps/web (Next.js 15)                    │
│   /mapa (MapLibre)  │  /painel (risco)  │  /api/incidents    │
└────────────┬────────────────────┬──────────────────┬─────────┘
             │                    │                  │
             ▼                    ▼                  ▼
     packages/core          packages/db         Auth.js v5
  (categories, trust,    (Drizzle + PostGIS,  (OAuth GitHub +
   risk, types)           16 tabelas)          JWT sessions)
             │                    ▲
             └────────────────────┤
                                  │
             apps/worker (BullMQ) │
       ┌──────────────────────────┘
       │   queue: risk (a cada hora)
       │   queue: ingestion
       ▼
 packages/data-ingestion
 (SourceAdapter + 4 stubs)
       │
       ▼
  Redis 7 (filas BullMQ)
```

---

## Stack

| Camada            | Tecnologia                                                      |
| ----------------- | --------------------------------------------------------------- |
| Framework web     | Next.js 15 (App Router) + React 19                              |
| Linguagem         | TypeScript 5 (strict em todos os pacotes)                       |
| Estilo            | Tailwind CSS 3 + tokens de design customizados                  |
| ORM / Schema      | Drizzle ORM + drizzle-kit                                       |
| Banco de dados    | PostgreSQL 16 + PostGIS 3.4 (SRID 4326 / WGS84)                 |
| Filas assíncronas | BullMQ 5 + Redis 7                                              |
| Autenticação      | Auth.js v5 (OAuth GitHub; e-mail/credenciais é trabalho futuro) |
| Mapa              | MapLibre GL JS 4 (WebGL, tiles vetoriais)                       |
| Testes            | Vitest 2                                                        |
| Gerenciador       | pnpm 9 (workspaces)                                             |
| CI                | GitHub Actions (lint → typecheck → test → build)                |
| Containers        | Docker Compose (postgres/redis/web/worker/adminer)              |

---

## Setup local

> Guia completo com troubleshooting: [`docs/setup/local-development.md`](docs/setup/local-development.md)

**Pré-requisitos:** Node.js >= 20.11, pnpm >= 9, Docker >= 24 com Compose v2.

```bash
# 1. Clone e instale as dependências
git clone https://github.com/seu-org/radar-urbano.git
cd radar-urbano
pnpm install

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite AUTH_SECRET (mínimo 32 bytes) e, opcionalmente, credenciais OAuth GitHub

# 3. Suba os serviços (Postgres+PostGIS, Redis, web, worker, Adminer)
docker compose up -d

# 4. Aplique migrações e popule dados de referência
pnpm db:migrate && pnpm db:seed
```

### URLs disponíveis

| URL                          | Descrição                      |
| ---------------------------- | ------------------------------ |
| http://localhost:3000        | Aplicação web principal        |
| http://localhost:3000/mapa   | Mapa interativo com incidentes |
| http://localhost:3000/painel | Painel de risco por bairro     |
| http://localhost:8080        | Adminer — interface do banco   |

---

## Referência de design

A identidade visual completa do Radar Urbano — paleta de cores (Petróleo `#0E5C63`, Sinal `#3FB6A8`, gradiente de heatmap), tipografia IBM Plex e tokens de status — está documentada em:

**[`docs/design/radar-urbano-identity.html`](docs/design/radar-urbano-identity.html)**

> Esta é a referência canônica de design; screenshots da aplicação serão adicionados após o primeiro deploy em produção.

---

## Comandos do monorepo

```bash
pnpm lint          # ESLint em todo o monorepo
pnpm typecheck     # tsc --noEmit em todos os pacotes
pnpm test          # Vitest em packages/core e apps/web
pnpm build         # build de todos os apps e pacotes
pnpm format        # Prettier --write
pnpm db:migrate    # aplica migrações SQL (packages/db)
pnpm db:seed       # popula tabelas de referência
```

---

## Roadmap

### v0.1 — Fundação (atual)

- [x] Monorepo pnpm com 4 pacotes e 2 apps
- [x] Schema completo (16 tabelas, PostGIS, SRID 4326)
- [x] 19 categorias de incidentes para o contexto brasileiro
- [x] Trust Score e Risk Score com testes Vitest
- [x] Auth.js v5 (OAuth GitHub)
- [x] API REST `/api/incidents` (GET bbox + POST)
- [x] Mapa interativo MapLibre GL com heatmap
- [x] Painel de risco por bairro
- [x] Worker BullMQ: recompute de risco (hourly) + ingestão
- [x] 4 adapters stub para data-ingestion
- [x] Docker Compose completo (web/worker/postgres/redis/adminer)
- [x] CI GitHub Actions (lint/typecheck/test/build)
- [x] Governança (CoC, CONTRIBUTING, SECURITY, GOVERNANCE, LICENSE)

### v0.2 — Dados reais e moderação

- [ ] Ingestão real ISP-RJ (substituir adapters stub)
- [ ] Polígonos de bairros do Rio de Janeiro (GeoJSON oficial)
- [ ] UI de moderação para operadores
- [ ] Geocoding por seleção de ponto no mapa (UX de relato)

### v1.0 — Produção

- [ ] Notificações push e e-mail reais (schema já preparado)
- [ ] Retenção e limpeza de snapshots em `risk_scores`
- [ ] Testes E2E (Playwright)
- [ ] Deploy em produção (VPS + domínio)
- [ ] Calibração de fórmulas trust/risk com dados reais

---

## Como contribuir

Contribuições são bem-vindas! Leia antes:

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — guia de contribuição, fluxo de PR, convenções de commit
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — código de conduta da comunidade
- [`GOVERNANCE.md`](GOVERNANCE.md) — modelo de governança do projeto
- [`SECURITY.md`](SECURITY.md) — como reportar vulnerabilidades

Para bugs e ideias use os [Issue Templates](.github/ISSUE_TEMPLATE/).

---

## Licença

[MIT](LICENSE) © 2026 Contribuidores do Radar Urbano
