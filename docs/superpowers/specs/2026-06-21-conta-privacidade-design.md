# Conta + Privacidade — Design / Spec

- **Data:** 2026-06-21
- **Status:** Aprovado para planejamento
- **Cobre as issues:** #2 (cadastro e login), #4 (autenticar POST), #1 (privacidade/anti-scraping)
- **Branch:** `feat/auth-conta`

## 1. Objetivo

Adicionar contas de usuário (Google + e-mail/senha com verificação por código), exigir login
para acessar qualquer dado de incidente e para reportar, e ocultar dados individuais do público
anônimo. A autenticação é a base; o gating de dados e o relato autenticado dependem dela.

## 2. Decisões (confirmadas)

| Tema                  | Decisão                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| Métodos de login      | **Google OAuth** + **e-mail/senha** (sem GitHub)                                 |
| Verificação de e-mail | **Código de 6 dígitos** enviado via **Resend** (Google já vem verificado)        |
| Sessão                | **JWT** (obrigatório p/ o provider Credentials do Auth.js)                       |
| Reportar              | **Exige login**; `authorId` vem da sessão; flag por relato "exibir como anônimo" |
| Acesso a dados        | **Tudo atrás de login** (mapa, painel, API, detalhe); landing pública            |
| Detalhe de incidente  | Só logado, com **rate-limit**                                                    |

**Trade-off registrado:** com tudo atrás de login, o scraping anônimo é eliminado; um usuário
**logado** ainda pode extrair dados — mitigado por **rate-limit + quotas por conta**. Agregação/
coordenada borrada fica como melhoria futura (não neste escopo).

## 3. Mudanças de schema (migração incremental `0001`)

Incremental (diff sobre o snapshot atual) — **não recria** as colunas `geography`, então o bug de
quoting do drizzle-kit não se aplica aqui.

- `users.passwordHash text` (nulo para contas Google) — `users.emailVerified` já existe.
- `incidents.anonymous boolean NOT NULL DEFAULT false` (exibir relato como anônimo).
- Nova tabela **`email_verifications`**: `id uuid pk`, `email text NOT NULL`, `code_hash text NOT NULL`,
  `expires_at timestamptz NOT NULL`, `attempts integer NOT NULL DEFAULT 0`,
  `consumed_at timestamptz`, `created_at timestamptz NOT NULL DEFAULT now()`. Índice em `email`.

## 4. Autenticação (`apps/web/src/auth.ts`)

- Providers: **Google** (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) + **Credentials** (e-mail/senha).
- `session: { strategy: 'jwt' }`. Adapter Drizzle mantém `users`/`accounts` (sessão não usa a tabela `sessions`).
- `Credentials.authorize(email, password)`: busca o usuário, verifica `passwordHash` (bcrypt/argon2)
  e exige `emailVerified != null`; senão lança erro tratável (`E-mail não verificado`).
- Callbacks `jwt`/`session` expõem `user.id`, `name`, `role` na sessão.

## 5. Cadastro + verificação por código

- `POST /api/register` `{ name, email, password }`:
  - valida (e-mail único, senha mínima 8), cria usuário (`passwordHash`, `emailVerified=null`),
  - gera código 6 dígitos, grava `code_hash` + `expires_at` (15 min), envia via Resend.
- `POST /api/verify-email` `{ email, code }`:
  - valida código (hash, não expirado, `attempts < 5`), seta `users.emailVerified=now()`, marca `consumed_at`.
- `POST /api/verify-email/resend` `{ email }`: novo código, cooldown 60s.
- **Resend** (`packages`/`apps/web/src/lib/email.ts`): usa `RESEND_API_KEY` + `EMAIL_FROM`.
  **Dev fallback:** sem `RESEND_API_KEY`, loga o código no console (não envia).

## 6. Gating de acesso (`apps/web/src/middleware.ts`)

- Rotas protegidas: `/mapa`, `/painel`, `/reportar`, `/api/incidents*`, `/api/risk*` (dados).
- Anônimo em rota protegida → redireciona para `/entrar?next=<rota>` (páginas) ou `401` (APIs).
- Públicas: `/` (landing), `/entrar`, `/cadastrar`, `/verificar`, `/api/auth/*`, `/api/register`,
  `/api/verify-email*`, estáticos.

## 7. Relato autenticado + anônimo

- `POST /api/incidents`: exige sessão; `authorId` = `session.user.id` (ignora o do payload);
  aceita `anonymous: boolean`; valida `sourceId` contra fontes; **rate-limit**.
- Exposição: ao listar/detalhar, **nunca** retornar identidade do autor quando `anonymous=true`
  (e, por padrão, não expor `authorId` na API pública logada — só em telas de moderação).

## 8. Rate-limiting

- Util `apps/web/src/lib/rate-limit.ts` usando **Redis** (já no compose): token-bucket por
  `userId` (ou IP em rotas sem sessão). Limites iniciais: leitura 120/min; criação 10/min;
  verificação/reenvio 5/15min. Excesso → `429`.

## 9. UI (design Radar Urbano)

- `/entrar`: e-mail+senha + "Entrar com Google"; link "Criar conta"; trata erro "verifique seu e-mail".
- `/cadastrar`: nome, e-mail, senha → vai para `/verificar`.
- `/verificar`: campo de código + reenviar (cooldown).
- Header: estado de sessão (avatar, sair) nas telas logadas.

## 10. Testes

- `core`/lib puros: gerador/validador de código (expiração, tentativas), hash de senha.
- Auth: `authorize` (senha correta/incorreta, não verificado).
- Middleware: anônimo redirecionado/401; logado passa.
- API: `register` cria não verificado + dispara código (mock Resend); `verify-email` seta verificado;
  `POST /api/incidents` exige sessão e usa authorId da sessão; rate-limit retorna 429.

## 11. Entrega (PRs pequenos, cada um com 2 reviews + CI)

- **PR1 — Auth base:** schema `0001` (passwordHash, email_verifications), Google+Credentials, JWT,
  `/api/register` + `/api/verify-email` + Resend (dev fallback), telas `/entrar` `/cadastrar`
  `/verificar`, sessão no header.
- **PR2 — Gating + relato autenticado:** `middleware.ts`, `incidents.anonymous`, `POST /api/incidents`
  autenticado (authorId da sessão + flag anônimo), rate-limit (Redis), detalhe logado.

## 12. Env novas

`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `AUTH_SECRET` (já existe).
Atualizar `.env.example`. E-mail/senha + dev fallback permitem rodar local sem Google/Resend reais.

## 13. Fora de escopo

Recuperação de senha (backlog), 2FA, agregação/coordenada borrada anti-logado, OAuth além de Google.
