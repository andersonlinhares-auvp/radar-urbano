# Orquestrador — Síntese dos Agentes 01–05

**Radar Urbano · Rio de Janeiro · Jun 2026**

---

## 1. Resumo Executivo

O conjunto de cinco documentos de design produzidos cobre a jornada completa do usuário — da primeira visita pública até o envio de um relato de ocorrência — e a infraestrutura de dados que sustenta a plataforma. Em termos de maturidade atual:

- A **landing page** (Agente 01) não existe ainda: é necessário construir do zero com 9 seções, copy completo e 16 componentes especificados.
- O **fluxo de autenticação** (Agente 02) tem base técnica (Auth.js, Resend, bcrypt), mas carece de UI fiel ao design system Petróleo e dos componentes de multi-step cadastro com verificação por código.
- A **ingestão de dados** (Agente 03) tem infraestrutura operacional (BullMQ, `SourceAdapter`, 4 adapters stub), mas nenhuma fonte de dados real está conectada; o documento mapeia 13 fontes públicas e especifica 6 novos adapters, além de cron jobs prontos.
- O **mapa/UX** (Agente 04) tem 8 bugs confirmados em código real — 4 de prioridade alta (legenda ilegível, popup com copy técnico, busca inoperante, cartão com status raw) — e 7 melhorias de UX catalogadas com wireframes.
- O **formulário de report** (Agente 05) é inexistente no frontend: especifica fluxo de 5 passos, mapeamento de categorias, moderação automática, upload de fotos, privacidade/LGPD e 11 componentes novos.

A plataforma tem arquitetura técnica sólida (Next.js 15, PostGIS, Drizzle, Redis, MapLibre). O gargalo é a camada de produto e UX — a maioria das entregas deste ciclo é de interface, copy e integração de dados.

---

## 2. Lista de Tarefas Priorizadas

### Prioridade Alta — Bloqueadoras de qualquer release público

| ID   | Tarefa                                                   | Agente(s) | Justificativa                                              |
| ---- | -------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| A-01 | Corrigir popup do mapa: copy técnico → linguagem humana  | 04        | Primeira impressão do usuário após login                   |
| A-02 | Corrigir cartão lateral (feed): status raw → português   | 04        | Aparece em loop; degrada constantemente a experiência      |
| A-03 | Adicionar rótulos de escala na legenda do heatmap        | 04        | Mapa ilegível sem referência de baixo/alto                 |
| A-04 | Conectar campo de busca a handler e API                  | 04        | Campo existe, não funciona — gera desconfiança             |
| A-05 | Traduzir `trustScore` numérico para linguagem humana     | 04, 05    | "confiança 57" não tem significado; é contra a proposta    |
| A-06 | Construir UI de login/cadastro fiel ao design system     | 02        | Fluxo de entrada do produto; sem isso ninguém entra        |
| A-07 | Implementar verificação de e-mail por código (6 dígitos) | 02        | `CodeInput` + countdown 45s + estados de erro de OTP       |
| A-08 | Construir formulário de report (wizard 5 passos)         | 05        | Funcionalidade central; sem isso a plataforma é só leitura |
| A-09 | Conectar pelo menos 1 fonte de dados real (ISP-RJ CSV)   | 03        | Mapa atual provavelmente só tem dados seed                 |
| A-10 | Exibir `neighborhoodId` e `occurredAt` no cartão e popup | 04, 05    | Campos existem no tipo mas não são renderizados            |

### Prioridade Média — Necessárias para qualidade aceitável

| ID   | Tarefa                                                          | Agente(s) | Justificativa                                                 |
| ---- | --------------------------------------------------------------- | --------- | ------------------------------------------------------------- |
| M-01 | Construir landing page (9 seções + 16 componentes)              | 01        | Sem landing, a captação de usuários é impossível              |
| M-02 | Implementar filtro de tempo funcional (botão "24h")             | 04        | Botão existe, não filtra nada — frustrante                    |
| M-03 | Adicionar pins de categoria na legenda do mapa                  | 04        | Pins coloridos no mapa sem legenda correspondente             |
| M-04 | Exibir data/hora no popup de clique no mapa                     | 04        | `occurredAt` disponível, não renderizado                      |
| M-05 | Implementar painel de filtros por categoria (Waze-like)         | 04        | Funcionalidade core para uso diário                           |
| M-06 | Adicionar busca com autocomplete de bairros/categorias          | 04        | Exige `GET /api/search` novo no backend                       |
| M-07 | Conectar adapters DATA.RIO e IBGE malhas                        | 03        | Fase 1 do plano de fontes; geometrias de bairros              |
| M-08 | Implementar `calcTrustScore` e `classifyCategory`               | 03        | Necessários para qualquer dado ingerido aparecer corretamente |
| M-09 | Criar tabela `ingest_logs` e observabilidade do pipeline        | 03        | Sem logs, falhas de ingestão são silenciosas                  |
| M-10 | Adicionar campos `recurrenceHint` e `clientHint` em `incidents` | 05        | Schema adicional sem breaking change; enriquece moderação     |
| M-11 | Implementar `GET /api/neighborhoods/point`                      | 05        | Necessário para detecção de bairro no passo 2 do report       |
| M-12 | Substituir `authorReputation: 0` fixo por valor real            | 05        | Trust score inicial incorreto para todos os reports           |
| M-13 | Corrigir KPI "Bairros monitorados" no painel (dado tautológico) | 04        | Exibe "X de X · 100%" sempre — sem valor informativo          |

### Prioridade Baixa — Backlog / Iterações futuras

| ID   | Tarefa                                                        | Agente(s) | Justificativa                                                |
| ---- | ------------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| B-01 | Conectar Alerta Rio (pluviômetros 15min)                      | 03        | Fase 2; dados meteorológicos contextuais                     |
| B-02 | Conectar SINESP e Base dos Dados                              | 03        | Fase 2; estatísticas consolidadas                            |
| B-03 | Implementar COR.Rio monitor (redes sociais)                   | 03        | Fase 3; requer convênio formal                               |
| B-04 | Implementar parceria Waze for Cities                          | 03        | Fase 3; requer convênio com Prefeitura                       |
| B-05 | Worker assíncrono de blur de rostos/placas em fotos           | 05        | v1.1; necessita API de visão computacional                   |
| B-06 | Tabela `report_drafts` (rascunho no servidor)                 | 05        | v1 usa `sessionStorage`; persistência no servidor é melhoria |
| B-07 | SEO/Meta tags da landing (OG image, title, description)       | 01        | Relevante após landing existir                               |
| B-08 | Estatísticas dinâmicas na landing (bairros, relatos, pessoas) | 01        | Requer endpoint `/api/stats` público (sem auth)              |
| B-09 | Rate limit por IP (complementar ao rate limit por userId)     | 05        | Reforço de anti-spam                                         |
| B-10 | Deduplicação geoespacial rigorosa no POST /api/incidents      | 05        | ST_DWithin 50m + janela 30min por autor                      |

---

## 3. Arquivos Afetados por Tema

### Agente 01 — Landing Page

| Arquivo                                                | Situação                                           | Ação                                    |
| ------------------------------------------------------ | -------------------------------------------------- | --------------------------------------- |
| `apps/web/src/app/page.tsx`                            | Provavelmente existe, mas com conteúdo placeholder | Reescrever completamente                |
| `apps/web/src/components/landing/`                     | Diretório inexistente                              | Criar + 16 componentes novos            |
| `apps/web/src/components/landing/NavBar.tsx`           | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/HeroSection.tsx`      | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/RadarSVG.tsx`         | Novo (ou mover do design system)                   | Criar                                   |
| `apps/web/src/components/landing/StepCard.tsx`         | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/UseCaseTab.tsx`       | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/MapPreview.tsx`       | Novo                                               | Criar (screenshot estático WebP)        |
| `apps/web/src/components/landing/TransparencyCard.tsx` | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/TestimonialCard.tsx`  | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/StatBlock.tsx`        | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/RepoCard.tsx`         | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/CTASection.tsx`       | Novo                                               | Criar                                   |
| `apps/web/src/components/landing/Footer.tsx`           | Novo (ou extensão do existente)                    | Criar                                   |
| `public/og-radar-urbano.png`                           | Inexistente                                        | Criar asset                             |
| `public/map-preview-*.webp`                            | Inexistente                                        | Criar screenshots estáticas do MapLibre |

### Agente 02 — Autenticação

| Arquivo                                                | Situação                           | Ação                                                  |
| ------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------- |
| `apps/web/src/app/auth/login/page.tsx`                 | Pode existir; layout inconsistente | Refatorar com `AuthLayout`                            |
| `apps/web/src/app/auth/register/page.tsx`              | Pode existir; falta multi-step     | Refatorar com wizard 3 passos                         |
| `apps/web/src/app/auth/verify/page.tsx`                | Provavelmente inexistente          | Criar                                                 |
| `apps/web/src/components/auth/AuthLayout.tsx`          | Inexistente                        | Criar (2 colunas desktop / mobile)                    |
| `apps/web/src/components/auth/InputField.tsx`          | Inexistente ou genérico            | Criar com 5 variantes de estado                       |
| `apps/web/src/components/auth/PasswordField.tsx`       | Inexistente                        | Criar com toggle visibilidade                         |
| `apps/web/src/components/auth/PasswordStrengthBar.tsx` | Inexistente                        | Criar (4 níveis)                                      |
| `apps/web/src/components/auth/CodeInput.tsx`           | Inexistente                        | Criar (6 slots, auto-tab, shake)                      |
| `apps/web/src/components/auth/ProgressStepper.tsx`     | Inexistente                        | Criar                                                 |
| `apps/web/src/components/auth/ButtonPrimary.tsx`       | Pode existir genericamente         | Criar/ajustar com spinner inline                      |
| `apps/web/src/components/auth/ButtonGoogle.tsx`        | Pode existir                       | Criar/ajustar com estado de loading                   |
| `apps/web/src/app/api/auth/register/route.ts`          | Pode existir                       | Verificar/ajustar para retornar `pendingVerification` |
| `apps/web/src/app/api/auth/verify-code/route.ts`       | Inexistente                        | Criar                                                 |

### Agente 03 — Ingestão de Dados

| Arquivo                                                    | Situação       | Ação                                               |
| ---------------------------------------------------------- | -------------- | -------------------------------------------------- |
| `packages/data-ingestion/src/types.ts`                     | Existe         | Estender `NormalizedIncident` com campos opcionais |
| `packages/data-ingestion/src/trust.ts`                     | Inexistente    | Criar `calcTrustScore()`                           |
| `packages/data-ingestion/src/classify.ts`                  | Inexistente    | Criar `classifyCategory()` com KEYWORD_MAP         |
| `packages/data-ingestion/src/geo.ts`                       | Inexistente    | Criar `validarGeometria()` e `resolverBairro()`    |
| `packages/data-ingestion/src/adapters/isp-rj-csv.ts`       | Stub existente | Implementar download CSV mensal ISP-RJ             |
| `packages/data-ingestion/src/adapters/data-rio-geojson.ts` | Inexistente    | Criar adapter ArcGIS REST                          |
| `packages/data-ingestion/src/adapters/alerta-rio.ts`       | Inexistente    | Criar adapter CSV pluviômetros                     |
| `packages/data-ingestion/src/adapters/sinesp.ts`           | Inexistente    | Criar adapter CKAN federal                         |
| `packages/data-ingestion/src/adapters/ibge-malhas.ts`      | Inexistente    | Criar adapter geometrias                           |
| `packages/data-ingestion/src/adapters/osm-overpass.ts`     | Inexistente    | Criar adapter Overpass QL                          |
| `packages/data-ingestion/src/index.ts`                     | Existe         | Registrar 6 novos adapters                         |
| `apps/worker/src/index.ts`                                 | Existe         | Adicionar `scheduleIngestion()` com 6 cron jobs    |
| `apps/worker/src/jobs/run-ingestion.ts`                    | Inexistente    | Criar handler do job de ingestão                   |
| `apps/worker/src/jobs/invalidate-cache.ts`                 | Inexistente    | Criar invalidação Redis pós-ingestão               |
| `packages/db/src/schema.ts`                                | Existe         | Adicionar tabela `ingest_logs`                     |

### Agente 04 — UX/Fixes do Mapa

| Arquivo                                              | Situação               | Ação                                                                                                   |
| ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web/src/components/MapShell.tsx`               | Existe com bugs        | Corrigir BUG-01, 03, 04, 05, 07; adicionar MUX-03, 04                                                  |
| `apps/web/src/components/Map.tsx`                    | Existe com bugs        | Corrigir BUG-02, 08; reescrever `buildPopupHTML`                                                       |
| `apps/web/src/app/painel/page.tsx`                   | Existe com bug         | Corrigir BUG-06 (KPI tautológico)                                                                      |
| `apps/web/src/lib/labels.ts`                         | Inexistente            | Criar `STATUS_LABELS` e `TRUST_LABELS` centralizados                                                   |
| `apps/web/src/components/map/IncidentCard.tsx`       | Inexistente            | Criar Componente A (cartão humano)                                                                     |
| `apps/web/src/components/map/MapPopup.tsx`           | Inline em Map.tsx      | Extrair e reescrever                                                                                   |
| `apps/web/src/components/map/MapLegend.tsx`          | Inline em MapShell.tsx | Extrair e expandir com pins de categoria                                                               |
| `apps/web/src/components/map/FilterPanel.tsx`        | Inexistente            | Criar Componente D (filtros Waze-like)                                                                 |
| `apps/web/src/components/map/SearchAutocomplete.tsx` | Inexistente            | Criar Componente E                                                                                     |
| `apps/web/src/app/api/search/route.ts`               | Inexistente            | Criar `GET /api/search?q=`                                                                             |
| `apps/web/src/types/incident.ts`                     | Existe ou inline       | Adicionar campos `confirmations`, `neighborhood`, `statusLabel`, `trustLabel` ao tipo `RecentIncident` |
| `apps/web/src/app/api/incidents/recent/route.ts`     | Existe                 | Adicionar `confirmations` e `neighborhood` na resposta                                                 |

### Agente 05 — Formulário de Report

| Arquivo                                                   | Situação    | Ação                                                                                     |
| --------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `apps/web/src/components/map/ReportButton.tsx`            | Inexistente | Criar botão flutuante                                                                    |
| `apps/web/src/components/report/ReportDrawer.tsx`         | Inexistente | Criar container (bottom sheet / modal)                                                   |
| `apps/web/src/components/report/StepTypeSelect.tsx`       | Inexistente | Criar Passo 1                                                                            |
| `apps/web/src/components/report/StepTypeRefine.tsx`       | Inexistente | Criar Passo 1b                                                                           |
| `apps/web/src/components/report/StepLocation.tsx`         | Inexistente | Criar Passo 2 (mini-mapa)                                                                |
| `apps/web/src/components/report/StepWhen.tsx`             | Inexistente | Criar Passo 3                                                                            |
| `apps/web/src/components/report/StepDetails.tsx`          | Inexistente | Criar Passo 4 (descrição + foto)                                                         |
| `apps/web/src/components/report/StepConfirm.tsx`          | Inexistente | Criar Passo 5 (revisão + anônimo)                                                        |
| `apps/web/src/components/report/ReportSuccess.tsx`        | Inexistente | Criar tela de confirmação                                                                |
| `apps/web/src/hooks/useReportForm.ts`                     | Inexistente | Criar estado global do wizard                                                            |
| `apps/web/src/hooks/useGeolocation.ts`                    | Inexistente | Criar wrapper de `navigator.geolocation`                                                 |
| `apps/web/src/app/api/incidents/route.ts`                 | Existe      | Corrigir `authorReputation: 0` → leitura real; adicionar bbox do RJ; deduplicação        |
| `apps/web/src/app/api/incidents/upload-evidence/route.ts` | Inexistente | Criar endpoint de upload                                                                 |
| `apps/web/src/app/api/neighborhoods/point/route.ts`       | Inexistente | Criar `GET /api/neighborhoods/point?lat=&lng=`                                           |
| `packages/db/src/schema.ts`                               | Existe      | Adicionar `recurrenceHint`, `clientHint` em `incidents`; tabela `report_drafts` opcional |
| `packages/core/src/trust-score.ts`                        | Existe      | Verificar chamada com `recurrenceCount` real                                             |

---

## 4. Dependências entre os Temas

```
[01 Landing] ──────────────────────────────────────────────────────┐
    depende do design system (tokens, SVG radar, cores) já definido │
    CTA "Criar conta" aponta para [02 Auth] ──────────────────────┐ │
    CTA "Acessar o mapa" aponta para [02 Auth] (login obrigatório)│ │
    Seção "Dados e Transparência" menciona fontes de [03 Ingestão]│ │
    Stats dinâmicos dependem de dados reais de [03 Ingestão]      │ │
                                                                   ▼ │
[02 Auth] ─────────────────────────────────────────────────────────┘ │
    Pré-requisito absoluto para acessar mapa [04 UX] e form [05]  │
    JWT session compartilhado entre [04] e [05]                    │
    `users.reputation` de [02] usado no trust score de [05]        │
                                                                   │
[03 Ingestão] ──────────────────────────────────────────────────┐  │
    Alimenta o mapa visualizado em [04 UX]                       │  │
    `trustScore` calculado em [03] é o mesmo exibido em [04]     │  │
    Sem dados reais de [03], o mapa de [04] fica vazio/seed      │  │
    Tabelas `incidents` compartilhadas com [05 Report]            │  │
                                                                 ▼  │
[04 UX/Mapa] ────────────────────────────────────────────────────┘  │
    Depende de dados de [03] para ter conteúdo no heatmap/pins    │
    Depende de [02] para sessão autenticada (auth obrigatório)    │
    Botão "Reportar" em [04] abre o drawer de [05]               │
    Labels centralizados (`STATUS_LABELS`) compartilhados com [05]│
                                                                  │
[05 Report] ──────────────────────────────────────────────────────┘
    Depende de [02] para sessão e reputação do usuário
    Depende de [04] pois o botão flutuante vive dentro do mapa
    POST /api/incidents alimenta de volta [03/04] via recompute-risk
    `GET /api/neighborhoods/point` criado em [05] pode ser reusado em [04]
```

**Dependências críticas em ordem:**

1. Design system Petróleo (já existe) → base de tudo
2. [02 Auth] → necessário antes de qualquer dado ser visível
3. [03 Ingestão] (mínimo 1 fonte real) → necessário para mapa não ficar vazio
4. [04 UX/Fixes] → necessário para o mapa ser legível por humanos
5. [05 Report] → adiciona a camada de contribuição comunitária
6. [01 Landing] → pode ser construída em paralelo com [02] e [03], mas precisa de [03] para stats dinâmicos

---

## 5. Roadmap de Implementação — 4 Sprints

### Sprint 1 — "Funciona para entrar" (2 semanas)

**Meta:** Qualquer pessoa consegue criar conta, entrar e ver o mapa com dados reais.

**Escopo:**

| Tarefa                                                                | Agente | Prioridade |
| --------------------------------------------------------------------- | ------ | ---------- |
| UI de login com design system Petróleo                                | 02     | Alta       |
| UI de cadastro multi-step (dados + código + sucesso)                  | 02     | Alta       |
| Componente `CodeInput` (6 dígitos, auto-tab, shake)                   | 02     | Alta       |
| `AuthLayout` responsivo (2 colunas / mobile)                          | 02     | Alta       |
| Endpoint `POST /api/auth/verify-code`                                 | 02     | Alta       |
| Corrigir popup do mapa (BUG-02)                                       | 04     | Alta       |
| Corrigir cartão lateral feed (BUG-03)                                 | 04     | Alta       |
| Corrigir legenda sem rótulos (BUG-01)                                 | 04     | Alta       |
| Traduzir `trustScore` → linguagem humana (MUX-01)                     | 04     | Alta       |
| Adicionar campos `neighborhood`/`occurredAt` ao tipo `RecentIncident` | 04     | Alta       |
| Implementar adapter ISP-RJ CSV (fonte de dados real)                  | 03     | Alta       |
| Criar `calcTrustScore()` e `classifyCategory()`                       | 03     | Alta       |
| Criar tabela `ingest_logs`                                            | 03     | Alta       |
| Cron job `ingest:isp-rj` no worker                                    | 03     | Alta       |

**Critério de conclusão:** usuário consegue criar conta, verificar e-mail, entrar e ver o mapa com pelo menos dados do ISP-RJ carregados e popup legível.

---

### Sprint 2 — "Mapa usável + Formulário de report" (2 semanas)

**Meta:** O mapa é filtrável, buscável e o usuário consegue reportar uma ocorrência.

**Escopo:**

| Tarefa                                                   | Agente | Prioridade |
| -------------------------------------------------------- | ------ | ---------- |
| Conectar campo de busca + `GET /api/search` (BUG-04)     | 04     | Alta       |
| Painel de filtros por categoria + tempo (MUX-03, BUG-05) | 04     | Alta       |
| Legenda expandida com pins de categoria (BUG-07, MUX-04) | 04     | Média      |
| Componente `<ReportButton />` no mapa                    | 05     | Alta       |
| `<ReportDrawer />` + `useReportForm`                     | 05     | Alta       |
| `StepTypeSelect` e `StepTypeRefine` (Passos 1 e 1b)      | 05     | Alta       |
| `StepLocation` com mini-mapa arrastável (Passo 2)        | 05     | Alta       |
| `StepWhen` (Passo 3)                                     | 05     | Alta       |
| `StepDetails` com upload de foto (Passo 4)               | 05     | Alta       |
| `StepConfirm` com opção de anonimato (Passo 5)           | 05     | Alta       |
| `ReportSuccess` com refCode                              | 05     | Alta       |
| `POST /api/incidents/upload-evidence`                    | 05     | Alta       |
| `GET /api/neighborhoods/point`                           | 05     | Média      |
| Corrigir `authorReputation: 0` → valor real              | 05     | Média      |
| Adapter DATA.RIO GeoJSON (Fase 1)                        | 03     | Média      |
| Adapter IBGE malhas (Fase 1)                             | 03     | Média      |

**Critério de conclusão:** usuário consegue filtrar o mapa, buscar um bairro e enviar um relato completo com localização, categoria e descrição.

---

### Sprint 3 — "Landing + Ingestão completa Fase 1" (2 semanas)

**Meta:** A plataforma tem uma porta de entrada pública e dados de qualidade de 4 fontes oficiais.

**Escopo:**

| Tarefa                                                 | Agente | Prioridade |
| ------------------------------------------------------ | ------ | ---------- |
| Landing page: seções [01] NAV e [02] HERO              | 01     | Média      |
| Landing page: seção [03] COMO FUNCIONA                 | 01     | Média      |
| Landing page: seção [04] CASOS DE USO                  | 01     | Média      |
| Landing page: seção [05] TRANSPARÊNCIA                 | 01     | Média      |
| Landing page: seção [06] COMUNIDADE + depoimentos      | 01     | Média      |
| Landing page: seção [07] OPEN SOURCE + repo card       | 01     | Média      |
| Landing page: seções [08] CTA FINAL e [09] RODAPÉ      | 01     | Média      |
| `RadarSVG` animado (CSS `ru-sweep`, `ru-ping`)         | 01     | Média      |
| `TrustStrip`, `StatBlock` dinâmico                     | 01     | Média      |
| Endpoint público `GET /api/stats` (sem auth)           | 01, 03 | Média      |
| Adapter OSM Overpass (POIs semanais)                   | 03     | Média      |
| Cron jobs DATA.RIO, IBGE, OSM no worker                | 03     | Média      |
| `geo.ts`: validarGeometria + resolverBairro            | 03     | Média      |
| Worker de moderação automática (BullMQ)                | 05     | Média      |
| Busca com autocomplete completo (bairros + categorias) | 04     | Média      |
| Corrigir KPI tautológico no painel (BUG-06)            | 04     | Baixa      |
| SEO / Meta tags da landing                             | 01     | Baixa      |

**Critério de conclusão:** landing pública apresenta a plataforma; 4 fontes de dados da Fase 1 estão ingerindo; stats dinâmicos aparecem na landing.

---

### Sprint 4 — "Qualidade, segurança e observabilidade" (1–2 semanas)

**Meta:** Plataforma estável para crescimento de usuários; anti-spam robusto; dados da Fase 2 conectados.

**Escopo:**

| Tarefa                                                          | Agente | Prioridade |
| --------------------------------------------------------------- | ------ | ---------- |
| Rate limit por IP no POST /api/incidents                        | 05     | Baixa      |
| Deduplicação geoespacial (ST_DWithin 50m + janela 30min)        | 05     | Baixa      |
| Adapter SINESP (Fase 2)                                         | 03     | Baixa      |
| Adapter Alerta Rio pluviômetros (Fase 2)                        | 03     | Baixa      |
| Cron jobs SINESP e Alerta Rio                                   | 03     | Baixa      |
| Alertas de observabilidade (falhas 3x, records=0)               | 03     | Baixa      |
| Tabela `report_drafts` (rascunho persistente no servidor)       | 05     | Baixa      |
| Worker blur de rostos/placas em fotos (v1.1)                    | 05     | Baixa      |
| Adicionar campos `recurrenceHint` e `clientHint` em `incidents` | 05     | Média      |
| Contagem real de `recurrenceCount` no `computeTrustScore`       | 05     | Média      |
| Testes de acessibilidade (WCAG AA) em todos os formulários      | 02, 05 | Média      |
| Testes iOS Safari (CodeInput, OTP autocomplete)                 | 02     | Média      |
| Revisão de contraste em modo mobile (auth + report)             | 02, 05 | Média      |

**Critério de conclusão:** plataforma pronta para divulgação pública; anti-spam em múltiplas camadas; 6 fontes de dados ativas; observabilidade do pipeline funcionando.

---

## Apêndice — Mapa de Tokens Compartilhados

Os tokens abaixo do design system Petróleo são usados por **todos os agentes** e devem ser a fonte única de verdade:

| Token            | Valor          | Agentes que usam            |
| ---------------- | -------------- | --------------------------- |
| `--cor-petroleo` | `#0E5C63`      | 01, 02, 04, 05              |
| `--cor-verde`    | `#3FB6A8`      | 01, 02, 03 (badge), 04, 05  |
| `--cor-fundo`    | `#ECE8DF`      | 01, 02, 04                  |
| `--cor-escura`   | `#11181F`      | 01, 02, 04, 05              |
| `--cor-erro`     | `#A8332F`      | 02, 04, 05                  |
| `--cor-ouro`     | `#E0A93B`      | 01 (pins), 03 (trust médio) |
| `--fonte-mono`   | IBM Plex Mono  | 01, 02, 04, 05              |
| `--fonte-serif`  | IBM Plex Serif | 01, 02                      |
| `--fonte-sans`   | IBM Plex Sans  | 01, 02, 04, 05              |

Qualquer alteração nesses tokens afeta simultaneamente landing, auth, mapa e formulário.

---

_Documento de síntese orquestrado a partir dos Agentes 01–05 · Radar Urbano · Jun 2026_
_Stack: Next.js 15 · Tailwind · IBM Plex · Postgres/PostGIS · BullMQ · MapLibre · Auth.js_
