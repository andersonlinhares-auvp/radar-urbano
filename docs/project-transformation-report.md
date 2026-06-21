# Relatório de transformação — Radar Urbano

**Data:** 2026-06-20
**Versão da plataforma:** 0.1.0
**Idioma:** pt-BR

---

## 1. O que foi encontrado — auditoria do StreetSignal

O ponto de partida foi o projeto **StreetSignal**, uma aplicação de crowdsourcing de ocorrências urbanas. A auditoria identificou o seguinte estado:

### Stack original

| Aspecto              | StreetSignal (original)                  |
| -------------------- | ---------------------------------------- |
| Framework web        | Next.js 14 (Pages Router)                |
| Banco de dados       | Supabase (PostgreSQL gerenciado)         |
| Mapa                 | Leaflet / React-Leaflet                  |
| Linguagem            | TypeScript (parcial)                     |
| Estilo               | Tailwind CSS                             |
| Autenticação         | Ausente — relatos completamente anônimos |
| Moderação            | Ausente                                  |
| Notificações         | Ausente                                  |
| Sistema de reputação | Ausente                                  |
| Testes               | Ausentes                                 |
| Infraestrutura       | Sem Docker, sem CI                       |
| Governança           | Sem CONTRIBUTING, CoC, LICENSE           |

### Limitações identificadas

1. **Vendor lock-in:** dependência total do Supabase para banco, autenticação e storage. Sem controle sobre versão do PostgreSQL ou extensões geoespaciais.
2. **Sem geoespacial nativo:** Supabase suporta PostGIS, mas o projeto não utilizava funções geoespaciais — buscas por proximidade eram feitas na camada de aplicação.
3. **Relatos anônimos sem moderação:** qualquer pessoa podia criar qualquer relato sem consequência. Sem mecanismo de validação ou confiança.
4. **Leaflet/React-Leaflet:** biblioteca de mapa baseada em Canvas 2D, sem suporte a tiles vetoriais, com performance inferior em dispositivos móveis e ausência de suporte nativo a heatmap.
5. **Arquitetura monolítica simples:** tudo em um único projeto Next.js sem separação de domínio, banco e apresentação.
6. **Sem pipeline de dados:** nenhuma arquitetura de ingestão de fontes oficiais (ISP-RJ, prefeitura etc.).
7. **TypeScript parcial:** tipagem fraca em módulos críticos, uso de `any` implícito.

---

## 2. O que foi alterado, removido e adicionado

### Removido / substituído

| Item original                  | Destino                                        | Justificativa                                                                        |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Supabase (Postgres gerenciado) | Postgres 16 + PostGIS 3.4 self-hosted (Docker) | Controle total, extensão geoespacial nativa, sem vendor lock-in, sem custo de egress |
| Leaflet / React-Leaflet        | MapLibre GL JS 4                               | WebGL, tiles vetoriais, heatmap nativo, performance mobile, licença open-source      |
| Next.js 14 (Pages Router)      | Next.js 15 (App Router + React 19)             | Server Components, streaming, melhor suporte a cache e middleware                    |
| SQL manual                     | Drizzle ORM + migrações versionadas            | Type-safety, migrações auditáveis, integração PostGIS via `customType`               |
| Projeto monolítico             | Monorepo pnpm workspaces                       | Separação de domínio, reuso entre web e worker, builds independentes                 |

### Adicionado (PR1 + PR2 — branch `feat/auth-gating`)

#### Autenticação e controle de acesso (`apps/web`)

- **Auth.js v5** com dois providers: Google OAuth e e-mail/senha (Credentials). Sessões JWT. Split-config para edge-safety: `auth.config.ts` (sem Node.js) para o middleware, `auth.ts` com DrizzleAdapter para rotas API.
- **Cadastro com verificação por código de 6 dígitos:** `POST /api/register` cria usuário + insere em `email_verifications`; `POST /api/verify-email` valida código (bcrypt) e marca `users.email_verified`; `POST /api/verify-email/resend` com cooldown de 60 s e anti-enumeração.
- **Gating por middleware** (`middleware.ts`): `/mapa`, `/painel`, `/reportar` → redirect para `/entrar`; `/api/tiles`, `/api/incidents`, `/api/risk` → 401 JSON. Landing pública.
- **Relato autenticado:** `POST /api/incidents` exige sessão, deriva `authorId` da sessão, aceita flag `anonymous`, aplica rate-limit Redis (10/min por userId) e grava em `access_logs`.
- **Novas tabelas no schema:** `email_verifications` (código + hash + TTL + tentativas) e `access_logs` (action, userId, meta JSONB, ip). Campo `password_hash` em `users`. Campo `anonymous` em `incidents`.
- **Novas libs:** `lib/password.ts` (bcryptjs), `lib/verification.ts` (generateCode, hashCode, verifyCode, TTL/MAX_ATTEMPTS/RESEND_COOLDOWN_MS), `lib/email.ts` (Resend + fallback dev), `lib/rate-limit.ts` (janela fixa Redis), `lib/redis.ts` (ioredis), `lib/audit.ts` (logAccess), `lib/session.ts` (requireSession).
- **Novas envs:** `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `TILE_CACHE_TTL` (reservada para PR3).

#### `packages/core` — domínio puro

- **19 categorias de incidentes** mapeadas para o contexto brasileiro (obras, alagamento, crime, poluição, falta de luz, trânsito, saúde, etc.).
- **Trust Score:** fórmula que combina fonte do relato, presença de evidências (foto/vídeo) e reputação acumulada do autor. Penalidade assimétrica: relato rejeitado custa −1,5× o bônus de um confirmado (decisão deliberada — relatos falsos devem custar mais ao autor).
- **Risk Score:** decaimento exponencial por idade do incidente, agregação por bairro, normalização city-max. Configurável por constantes exportadas.
- **Types:** interfaces TypeScript compartilhadas entre todos os pacotes.
- **Testes Vitest:** cobertura de categorias, trust-score e risk-score com casos-limite. Todos em TDD.

#### `packages/db` — banco de dados

- Schema Drizzle com **16 tabelas**: `users`, `accounts`, `sessions`, `verification_tokens`, `incidents`, `incident_locations`, `incident_evidences`, `incident_verifications`, `incident_status_history`, `ingestion_sources`, `ingestion_snapshots`, `risk_scores`, `regions`, `alert_subscriptions`, `notifications`, `reputation_events`.
- Tipo geoespacial `geography(Point,4326)` via `customType` do Drizzle (PostGIS).
- Índices GiST em todas as colunas geoespaciais.
- Migrações SQL versionadas em `packages/db/migrations/`.
- Seed com categorias e fontes iniciais.

#### `packages/data-ingestion` — ingestão extensível

- Interface `SourceAdapter` com contrato: `fetch(): Promise<RawIncident[]>`.
- Registry central de adapters.
- **4 adapters stub:** `geojson`, `csv`, `isp-rj`, `public-api` — prontos para receber implementação real sem alterar a interface.
- Sem scraping agressivo — arquitetura preparada para dados oficiais.

#### `apps/web` — aplicação Next.js 15

- **Auth.js v5:** OAuth via GitHub. Sessões JWT. Integrado ao schema Drizzle via `@auth/drizzle-adapter`. Autenticação por e-mail/credenciais não está configurada na v0.1 — é trabalho futuro.
- **Mapa `/mapa`:** MapLibre GL JS com heatmap de incidentes. Filtros por categoria e período. Marcadores com prefixo `RU-XXXX`.
- **Painel `/painel`:** ranking de risco por bairro, visualização de snapshots históricos.
- **API REST `/api/incidents`:** GET com filtro por bounding-box, POST para criação. Na v0.1 o POST é aberto/anônimo (aceita `sourceId`/`authorId` do cliente, sem autenticação); exigir login e derivar `authorId` da sessão é item de backlog.
- **Design system:** Tailwind com tokens de `packages/config` — paleta Petróleo/Sinal, fontes IBM Plex, status de risco (BAIXO/MÉDIO/ALTO/CRÍTICO) com cor + rótulo + ícone (acessibilidade WCAG 4.5:1).

#### `apps/worker` — processamento assíncrono (BullMQ)

- **Fila `risk`:** recompute automático de risk scores a cada hora para todos os bairros com incidentes ativos.
- **Fila `ingestion`:** acionamento dos adapters de data-ingestion e persistência de snapshots.
- Conectado ao Redis 7 via ioredis. Sem porta pública exposta.

#### Infraestrutura Docker

- `docker-compose.yml` com 5 serviços: `postgres` (postgis/postgis:16-3.4), `redis` (redis:7-alpine), `web`, `worker`, `adminer` (adminer:4).
- `Dockerfile` para web (Next.js standalone build).
- `Dockerfile.worker` para worker (tsx).
- Healthcheck no Postgres; web e worker aguardam saúde do banco.
- Volume `pgdata` persistente.

#### Governança

- `CONTRIBUTING.md` — guia de contribuição, Conventional Commits, fluxo de PR.
- `CODE_OF_CONDUCT.md` — Contributor Covenant.
- `GOVERNANCE.md` — modelo de governança.
- `SECURITY.md` — responsible disclosure.
- `LICENSE` — MIT.

#### `.github`

- Issue templates: BUG_REPORT, FEATURE_REQUEST, QUESTION.
- Pull Request template.
- `CODEOWNERS`.
- Workflow `ci.yml`: lint → typecheck → test → build (Ubuntu, Postgres+PostGIS como service container).

#### Documentação (`docs/`)

- `docs/architecture/` — estado atual, banco de dados, ingestão, geoespacial.
- `docs/domain/` — categorias, trust-score, risk-score.
- `docs/setup/local-development.md` — guia completo com troubleshooting.
- `docs/development/coding-standards.md`.
- `docs/devops/ci-cd.md`.
- `docs/design/radar-urbano-identity.html` — referência canônica de identidade visual.

---

## 3. Próximos passos recomendados

Os próximos passos estão ordenados por impacto esperado para uma operação real do Radar Urbano no Rio de Janeiro.

1. ~~**Autenticação e gating**~~ **FEITO (PR1 + PR2)** — Google OAuth + e-mail/senha com verificação por código; middleware protegendo `/mapa`, `/painel`, `/reportar` e APIs de dados.
2. **Tiles anti-scraping (PR3 — em andamento)** — substituir o `GET /api/incidents` em massa por tiles raster renderizados no servidor (`/api/tiles/{z}/{x}/{y}.png`) e endpoint de detalhe por clique (`/api/incidents/near`). Hoje o controle é login + rate-limit; os tiles eliminam a exposição de GeoJSON bruto.
3. **Conectar dados ISP-RJ reais** — implementar o adapter `isp-rj` com acesso à API ou arquivo CSV de ocorrências. O contrato `SourceAdapter` já existe; basta substituir o stub.
4. **Importar polígonos de bairros do Rio** — usar o GeoJSON oficial da Prefeitura (160 bairros) para popular a tabela `regions`, habilitando agrupamento geográfico real no painel de risco.
5. **UI de moderação** — tela autenticada para operadores revisarem incidentes `PENDING`, aprovarem com `CONFIRMED` ou rejeitarem com `REJECTED`. Atualiza trust score do autor automaticamente.
6. **Geocoding por seleção de ponto no mapa** — melhorar UX de criação de relatos: o usuário clica no mapa para definir localização em vez de digitar endereço.
7. **Notificações push e e-mail reais** — o schema (`alert_subscriptions`, `notifications`) já existe. Integrar Resend (já adicionado como dependência) e Web Push API.
8. **Retenção e limpeza de snapshots** — `risk_scores` é append-only por design (auditabilidade). Implementar job de compactação que mantém apenas N snapshots por região após X dias.
9. **Testes E2E** — Playwright cobrindo fluxos críticos: cadastro, verificação de e-mail, login, criação de relato, visualização do mapa, painel de risco.
10. **Deploy em produção** — VPS (Railway / Render / VPS própria), domínio, TLS, variáveis de ambiente de produção, monitoramento (Sentry, Prometheus/Grafana).
11. **Plugin ESLint do Next.js** — adicionar `eslint-config-next` ao workspace `apps/web` para capturar erros específicos do framework (Image, Link, etc.).

---

## 4. Riscos técnicos identificados

### R1 — Tipo PostGIS `geography` e drizzle-kit

**Descrição:** `drizzle-kit generate` não reconhece o tipo customizado `geography(Point,4326)` e o envolve em aspas duplas inválidas na migração gerada (`"geography"(Point,4326)` em vez de `geography(Point,4326)`).

**Impacto:** a migração SQL falha ao ser aplicada com o erro `type "geography" does not exist` (as aspas fazem o parser interpretar como identificador).

**Mitigação atual:** a migração é mantida e versionada manualmente. Há uma `NOTE` no arquivo de migração documentando o problema. Se a migração for regenerada com `drizzle-kit generate`, é necessário remover manualmente as aspas duplas antes de aplicar.

**Resolução futura:** monitorar releases do drizzle-kit para suporte nativo a tipos PostGIS, ou contribuir com um plugin.

---

### R2 — Disponibilidade e formato dos dados ISP-RJ

**Descrição:** os adapters de ingestão para fontes oficiais do Rio de Janeiro (ISP-RJ, prefeitura) são stubs. O formato real dos dados pode mudar, a API pode ter rate limiting ou autenticação, e os dados podem não ter geocoding confiável.

**Impacto:** a funcionalidade de "dados oficiais" não é operacional na v0.1. A qualidade dos dados da v1 depende da estabilidade das fontes.

**Mitigação:** arquitetura de adapters isola a complexidade de cada fonte. Novos formatos implicam apenas novo adapter, sem alterar domínio ou banco.

---

### R3 — Calibração das fórmulas trust/risk

**Descrição:** os pesos das fórmulas de trust score e risk score são constantes configuráveis definidas em `packages/core`. Seus valores foram estimados sem dados reais de operação.

**Impacto:** com dados reais, alguns pesos podem gerar rankings de risco distorcidos (ex.: bairro com poucos incidentes de baixa qualidade aparecendo como alto risco).

**Mitigação:** todas as constantes estão exportadas e documentadas. Os testes Vitest cobrem os casos-limite. Revisão com dados reais está prevista para v0.2. O decaimento exponencial e a normalização city-max limitam distorções extremas.

---

### R4 — Qualidade de geocoding dos relatos da comunidade

**Descrição:** a versão atual aceita coordenadas geográficas na criação de incidentes, mas a UX de seleção de ponto no mapa não está implementada. Usuários podem informar localização errada.

**Impacto:** incidentes mal georreferenciados degradam o mapa de calor e os risk scores por bairro.

**Mitigação:** a seleção de ponto no mapa está no roadmap v0.2 como item de alta prioridade. O schema permite atualizar a localização após moderação.

---

### R5 — Penalidade assimétrica no trust score

**Descrição:** a fórmula de trust score aplica −1,5× no caso de relato rejeitado, contra +1,0× para confirmado. A assimetria é deliberada (relatos falsos devem custar mais), mas o fator 1,5 foi definido sem dados de calibração.

**Impacto:** usuários que tiverem relatos rejeitados por erro (não má-fé) podem ter reputação degradada de forma injusta, reduzindo o peso de relatos futuros legítimos.

**Mitigação:** o fator está em constante exportada (`TRUST_REJECT_PENALTY_MULTIPLIER`). A revisão com dados reais está documentada como tarefa v0.2. Operadores com papel `MODERATOR` podem reabrir e reverter moderações incorretas.

---

## 5. Backlog sugerido para v1 (priorizado)

| Prioridade | Item                                                                                                                                                                               | Justificativa                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1          | Ingestão real ISP-RJ                                                                                                                                                               | Dados oficiais são o diferencial competitivo da plataforma                                                         |
| 2          | Polígonos de bairros do Rio (GeoJSON oficial)                                                                                                                                      | Habilita risk scores e painel por bairro real                                                                      |
| 3          | UI de moderação                                                                                                                                                                    | Sem moderação, a qualidade dos dados degrada rapidamente                                                           |
| 4          | Geocoding por seleção no mapa (UX de relato)                                                                                                                                       | Reduz incidentes mal georreferenciados                                                                             |
| 5          | Notificações push/e-mail reais                                                                                                                                                     | Schema pronto; falta apenas integração com provedor                                                                |
| 6          | Retenção/limpeza de snapshots em `risk_scores`                                                                                                                                     | Controle de crescimento do banco em operação contínua                                                              |
| 7          | Testes E2E (Playwright)                                                                                                                                                            | Garante regressão em fluxos críticos antes do deploy                                                               |
| 8          | Plugin ESLint do Next.js (`eslint-config-next`)                                                                                                                                    | Captura erros específicos de App Router não cobertos pelo config base                                              |
| 9          | Endurecer SQL de intervalo no worker                                                                                                                                               | Queries com `NOW() - INTERVAL '...'` devem usar parâmetros tipados                                                 |
| 10         | Deploy em produção (VPS + domínio + TLS)                                                                                                                                           | Pré-requisito para operação real e coleta de dados reais                                                           |
| 11         | Atribuir `neighborhood_id` aos incidentes via point-in-polygon (ST_Within/ST_Contains) — sem isso o risk score por bairro fica inerte (o worker faz INNER JOIN em neighborhood_id) | Sem polígonos de bairros carregados e neighborhood_id preenchido, o recompute de risco não produz resultados úteis |
| 12         | ~~Autenticar/autorizar `POST /api/incidents` e derivar `authorId` da sessão~~ **FEITO (PR2)**                                                                                      | Relato agora exige login; `authorId` vem da sessão; rate-limit + auditoria implementados.                          |
| 13         | **Tiles anti-scraping** (`/api/tiles/{z}/{x}/{y}.png`) + detalhe por clique (`/api/incidents/near`) + remoção do `GET /api/incidents` em massa — **pendente (PR3)**                | Hoje o controle é login + rate-limit; o GET em massa ainda existe. Tiles substituem a exposição de GeoJSON bruto.  |
| 14         | Resolver follow-up: `logAccess` é chamado após `return 201` — se falhar, o relato já foi criado (log é melhor-esforço, não transacional)                                           | Avaliar envolver `logAccess` na transação ou aceitar comportamento atual como intencional.                         |
| 15         | Resolver follow-up: `categorySlug` e `sourceId` chegam do corpo como `unknown` sem validação de tipo antes de entrar em `createIncident`                                           | Adicionar Zod ou validação explícita de tipo antes de chamar `getCategory`/insert.                                 |

---

## Resumo executivo

O Radar Urbano transformou um protótipo de crowdsourcing simples (StreetSignal) em uma plataforma de inteligência urbana completa. A substituição do Supabase por Postgres+PostGIS self-hosted eliminou o vendor lock-in e habilitou operações geoespaciais nativas. A troca de Leaflet por MapLibre GL entregou heatmap, tiles vetoriais e performance mobile. A adição de Auth.js, trust score, risk score, workers BullMQ e pipeline de ingestão criou a infraestrutura necessária para dados confiáveis e processamento assíncrono. A governança completa (CoC, CONTRIBUTING, GOVERNANCE, CI, templates de issue/PR) prepara o projeto para colaboração open source.

A branch `feat/auth-gating` (PR1 + PR2) completou o sistema de conta e privacidade: autenticação por Google OAuth e e-mail/senha com verificação por código de 6 dígitos via Resend, gating por middleware protegendo todas as rotas de dados, relatos vinculados ao autor da sessão com flag de anonimato, rate-limit Redis e auditoria via `access_logs`. O próximo passo imediato (PR3) é substituir o `GET /api/incidents` em massa por tiles raster renderizados no servidor, eliminando a exposição de GeoJSON bruto mesmo para usuários autenticados.
