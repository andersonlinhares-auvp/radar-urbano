# Estado atual da arquitetura

## Auditoria do ponto de partida (StreetSignal)

O Radar Urbano foi construído a partir de uma auditoria do projeto de referência **StreetSignal**, uma aplicação de crowdsourcing de ocorrências urbanas. A tabela abaixo consolida o que existia e o que foi adotado ou substituído.

| Aspecto              | StreetSignal (original)        | Radar Urbano (adotado)                  | Justificativa                                                              |
| -------------------- | ------------------------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| Framework web        | Next.js 14                     | Next.js 15 (App Router)                 | Server Components e melhor suporte a streaming                             |
| Banco de dados       | Supabase (Postgres gerenciado) | Postgres + PostGIS (Docker)             | Controle total, extensão geoespacial nativa, sem vendor lock-in            |
| Mapa                 | Leaflet                        | MapLibre GL JS                          | WebGL, tiles vetoriais, performance em mobile, licença open-source         |
| Autenticação         | Ausente (relatos anônimos)     | Auth.js v5 (OAuth GitHub + credenciais) | Necessidade de reputação de usuário e moderação autenticada                |
| Sistema de confiança | Ausente                        | Trust Score (`packages/core`)           | Qualidade de relatos depende de fonte, evidências e histórico do autor     |
| Ingestão de dados    | Ausente                        | `packages/data-ingestion` + adapters    | Arquitetura extensível para fontes oficiais (ISP-RJ) e parceiras           |
| ORM / Schema         | SQL manual                     | Drizzle ORM + migrações versionadas     | Type-safety, migrações auditáveis, integração com PostGIS via `customType` |
| Workers / filas      | Ausentes                       | BullMQ + Redis (`apps/worker`)          | Recompute de risco assíncrono sem bloquear a camada web                    |
| Tipagem              | Parcial                        | TypeScript strict em todo o monorepo    | Prevenção de bugs, refatoração segura                                      |
| Testes               | Ausentes                       | Vitest (TDD) em `packages/core` e web   | Regras de domínio críticas validadas antes da implementação                |

## Subsistemas do Radar Urbano

```
┌───────────────────────────────────────────────────────────────┐
│                        apps/web (Next.js 15)                  │
│  /mapa (MapLibre)  │  /painel (risk panel)  │  /api/incidents │
└──────────────┬────────────────────┬─────────────────────┬─────┘
               │                    │                     │
               ▼                    ▼                     ▼
       packages/core           packages/db          Auth.js v5
   (categories, trust,      (Drizzle + PostGIS,    (OAuth GitHub,
    risk, types)             16 tabelas)            JWT sessions)
               │                    ▲
               └────────────────────┤
                                    │
               apps/worker (BullMQ) │
         ┌──────────────────────────┘
         │   queue: risk (hourly)
         │   queue: ingestion
         ▼
   packages/data-ingestion
   (SourceAdapter + 4 stubs)
         ▼
   Redis (filas BullMQ)
```

## Subsistemas detalhados

### Banco de dados

Postgres 16 com extensão PostGIS 3.4. Schema gerenciado via Drizzle ORM com migrações SQL versionadas em `packages/db/drizzle/`. 16 tabelas cobrindo autenticação, incidentes, georreferenciamento, moderação, pontuação de risco, alertas e notificações. SRID 4326 (WGS84) em todas as colunas geoespaciais.

### Autenticação

Auth.js v5 configurado em `apps/web/src/auth.ts`. Suporta OAuth via GitHub e sessions JWT. Tabelas Auth.js (`users`, `accounts`, `sessions`, `verification_tokens`) integradas ao schema Drizzle.

### Mapas

MapLibre GL JS renderiza o mapa interativo na rota `/mapa`. Tiles OSM servidos via `NEXT_PUBLIC_MAP_STYLE_URL`. Sem dependência do Google Maps ou Mapbox.

### Relatos e moderação

API REST em `/api/incidents` (GET com filtro bbox, POST para criar). Incidentes possuem status `PENDING → CONFIRMED / REJECTED → RESOLVED`. Trust Score é recalculado pelo `packages/core` a cada interação de verificação.

### Notificações e alertas

Tabelas `alert_subscriptions` e `notifications` presentes no schema. Entrega em canal `IN_APP` (padrão); canais adicionais via array configurável por assinatura.

### Ingestão de dados

Quatro adapters stub (`geojson`, `csv`, `isp-rj`, `public-api`) registrados no registry de `packages/data-ingestion`. Worker BullMQ aciona a fila `ingestion` para processamento assíncrono. Sem scraping agressivo.

### Risco urbano

Recompute automático a cada hora pelo worker `risk`. Algoritmo em `packages/core/src/risk-score.ts`: decaimento exponencial por idade, agregação por bairro, normalização city-max. Resultados armazenados como snapshots append-only em `risk_scores`.

## Divergências deliberadas em relação ao StreetSignal

1. **Supabase → Postgres+PostGIS próprio**: independência de plataforma, controle de versão da extensão geoespacial, sem custo de egress.
2. **Leaflet → MapLibre GL**: renderização WebGL, suporte a estilos vetoriais, performance superior em dispositivos móveis.
3. **Relatos anônimos → Auth obrigatória para criar**: viabiliza o sistema de reputação de autores e reduz spam.
4. **Sem trust → Trust Score assimétrico**: penalidade por relato rejeitado é 1,5× maior que o bônus por confirmação (deliberado — relatos falsos devem custar mais).
5. **Sem ingestão → SourceAdapter extensível**: arquitetura preparada para fontes oficiais sem implementar scraping.
