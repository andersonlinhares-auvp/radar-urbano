# Conta + Privacidade — Design / Spec

- **Data:** 2026-06-21
- **Status:** Aprovado para planejamento
- **Cobre as issues:** #2 (cadastro e login), #4 (autenticar POST), #1 (privacidade/anti-scraping)
- **Branch:** `feat/auth-conta`

## 1. Objetivo

Adicionar contas (Google + e-mail/senha com verificação por código via Resend), exigir login para
qualquer dado, e **nunca enviar o dataset bruto ao cliente**: o mapa é renderizado como **tiles
raster (imagens) no servidor**; o cliente recebe apenas pixels. Detalhe de incidente só por clique,
em endpoint logado, com **rate-limit** e **auditoria**. Os dados individuais são o ativo do negócio —
segurança máxima.

## 2. Decisões (confirmadas)

| Tema                      | Decisão                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------- |
| Login                     | **Google OAuth** + **e-mail/senha** (sem GitHub)                                        |
| Verificação de e-mail     | **Código de 6 dígitos** via **Resend** (Google já vem verificado)                       |
| Sessão                    | **JWT** (obrigatório p/ o provider Credentials)                                         |
| Reportar                  | **Exige login**; `authorId` da sessão; flag por relato "exibir como anônimo"            |
| Acesso a dados            | **Tudo atrás de login**; landing pública                                                |
| Exibição do mapa          | **Tiles raster gerados no servidor** — cliente recebe só PNG, sem coordenadas/registros |
| Detalhe de incidente      | Só por **clique**, logado, **rate-limited + auditado**, 1 por vez                       |
| API de registros em massa | **Não existe** (sem GeoJSON público); proibido despejar lista bruta                     |

**Limite honesto:** um usuário logado sempre vê o que é renderizado pra ele (pixels) e pode pedir
detalhes **um a um** (lento, limitado, auditado). O que garantimos: o **dataset bruto nunca trafega**;
extração vira cara, lenta e rastreável.

## 3. Mudanças de schema (migração incremental `0001`)

Incremental (diff sobre o snapshot) — não recria colunas `geography`.

- `users.passwordHash text` (nulo p/ Google) — `users.emailVerified` já existe.
- `incidents.anonymous boolean NOT NULL DEFAULT false`.
- `email_verifications`: `id uuid pk`, `email text`, `code_hash text`, `expires_at timestamptz`,
  `attempts int DEFAULT 0`, `consumed_at timestamptz`, `created_at timestamptz DEFAULT now()`; índice em `email`.
- `access_logs` (auditoria): `id uuid pk`, `user_id uuid`, `action text` (`tile|detail|near|list|report`),
  `meta jsonb`, `ip text`, `created_at timestamptz DEFAULT now()`; índice em `(user_id, created_at)`.

## 4. Autenticação (`apps/web/src/auth.ts`)

- Providers: **Google** (`AUTH_GOOGLE_ID`/`SECRET`) + **Credentials** (e-mail/senha).
- `session: { strategy: 'jwt' }`. Adapter Drizzle mantém `users`/`accounts`.
- `Credentials.authorize`: verifica `passwordHash` (bcrypt/argon2) **e** `emailVerified != null`.
- Callbacks `jwt`/`session` expõem `user.id`, `name`, `role`.

## 5. Cadastro + verificação por código (Resend)

- `POST /api/register` `{name,email,password}`: valida (e-mail único, senha ≥ 8), cria usuário não
  verificado, gera código 6 díg., grava `code_hash`+`expires_at` (15 min), envia via Resend.
- `POST /api/verify-email` `{email,code}`: valida (hash, não expirado, `attempts<5`), seta `emailVerified`.
- `POST /api/verify-email/resend` `{email}`: novo código, cooldown 60s.
- `apps/web/src/lib/email.ts`: Resend (`RESEND_API_KEY` + `EMAIL_FROM`). **Dev fallback:** sem a key,
  loga o código no servidor (apenas dev; produção sempre envia e nada é logado).

## 6. Camada de dados anti-scraping (o coração da issue #1)

**Tiles raster (mapa de calor):**

- `GET /api/tiles/{z}/{x}/{y}.png` (rota dinâmica Node runtime). Login-gated, rate-limited, cacheado.
- Calcula a bbox do tile (Web Mercator), consulta incidentes na bbox+buffer no PostGIS, **renderiza
  um heatmap PNG no servidor** (`@napi-rs/canvas`) com a rampa do design ponderada por `trustScore`.
- **Cache em Redis** por `z/x/y + hash(filtros)`, TTL ~300s. Resposta `image/png`.
- Filtros (período/categoria) viram query params → tiles distintos.
- **Nenhuma coordenada/registro** sai daqui — só pixels.

**Detalhe por clique:**

- `GET /api/incidents/near?lng&lat&zoom`: retorna **1** incidente mais próximo dentro de um raio em
  pixels (login + rate-limit + **auditoria**). Sem author quando `anonymous=true`; nunca expõe
  `authorId`/fonte bruta — só categoria, título, descrição, horário, score.

**Listas/feed:** se houver feed (ex.: "recentes" no painel lateral), é **limitado** (≤ 10),
login + rate-limit + auditado. Proibido endpoint que devolva o conjunto.

**Remoções:** o `GET /api/incidents` (GeoJSON em massa) e o `fetch` do `Map.tsx` saem; o mapa passa
a usar fonte **raster** apontando para `/api/tiles/...`.

## 7. Relato autenticado + anônimo

- `POST /api/incidents`: exige sessão; `authorId = session.user.id` (ignora payload); aceita
  `anonymous`; valida `sourceId`; rate-limit; registra em `access_logs` (`report`).
- Identidade do autor nunca volta ao cliente quando `anonymous=true`; `authorId` só em telas de moderação.

## 8. Rate-limiting + auditoria

- `apps/web/src/lib/rate-limit.ts` com **Redis** (token-bucket por `userId`/IP). Limites iniciais:
  tiles 240/min; near/detail 30/min; list 30/min; report 10/min; register 5/15min; verify/resend 5/15min.
  Excesso → `429`.
- `apps/web/src/lib/audit.ts`: grava `access_logs` em `near`/`detail`/`list`/`report` (base p/ detectar
  varredura anômala depois).

## 9. Gating (`apps/web/src/middleware.ts`)

- Protegidas: `/mapa`, `/painel`, `/reportar`, `/api/tiles*`, `/api/incidents*`, `/api/risk*`.
- Anônimo → `/entrar?next=...` (páginas) ou `401` (APIs).
- Públicas: `/`, `/entrar`, `/cadastrar`, `/verificar`, `/api/auth/*`, `/api/register`, `/api/verify-email*`, estáticos.

## 10. UI (design Radar Urbano)

- `/entrar` (e-mail+senha + "Entrar com Google"); `/cadastrar`; `/verificar` (código + reenviar).
- Header com sessão (avatar, sair). Mapa usa camada raster (tiles); clique abre detalhe (near).

## 11. Testes

- Puros: gerador/validador de código (expiração/tentativas), hash de senha, cálculo de bbox do tile.
- Auth: `authorize` (senha ok/errada, não verificado).
- Middleware: anônimo redirecionado/401; logado passa.
- API: `register`/`verify-email` (mock Resend); `POST /api/incidents` exige sessão + authorId da
  sessão; `tiles` retorna PNG e respeita cache; `near` retorna 1 e audita; rate-limit → 429.

## 12. Entrega (PRs pequenos — cada um 2 reviews + CI)

- **PR1 — Auth base:** schema `0001`, Google+Credentials, JWT, register/verify-email + Resend (dev
  fallback), telas entrar/cadastrar/verificar, sessão no header.
- **PR2 — Gating + relato autenticado + rate-limit/audit:** `middleware.ts`, `incidents.anonymous`,
  `POST /api/incidents` autenticado, libs `rate-limit` e `audit`, tabela `access_logs`.
- **PR3 — Tiles + detalhe por clique:** `GET /api/tiles/{z}/{x}/{y}.png` (render `@napi-rs/canvas` +
  cache Redis), `Map.tsx` → fonte raster, `GET /api/incidents/near`, **remoção** do GeoJSON em massa.

## 13. Env novas

`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `TILE_CACHE_TTL` (opcional).
Atualizar `.env.example`. E-mail/senha + dev fallback permitem rodar local sem Google/Resend reais.

## 14. Fora de escopo

Recuperação de senha, 2FA, detecção automática de anomalia (só gravamos `access_logs` agora),
OAuth além de Google, tiles vetoriais.
