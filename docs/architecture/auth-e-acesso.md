# Autenticação e controle de acesso

Este documento descreve o sistema de autenticação, verificação de e-mail, gating por middleware, rate-limit e auditoria implementados na branch `feat/auth-gating` (PR1 + PR2).

---

## Providers e sessão JWT

O Radar Urbano usa **Auth.js v5** com dois providers:

| Provider     | Implementação                     | Observação                                               |
| ------------ | --------------------------------- | -------------------------------------------------------- |
| Google OAuth | `next-auth/providers/google`      | Sem verificação adicional — OAuth já garante o e-mail    |
| E-mail/senha | `next-auth/providers/credentials` | Login exige `emailVerified` definido na linha do usuário |

**Sessão:** estratégia `jwt` (sem tabela de sessão no banco para o fluxo Credentials). O `userId` é inserido no token via callback `jwt` e propagado para a sessão via callback `session`.

**Split config (edge-safe):**

- `auth.config.ts` — configuração edge-safe (sem adapter, sem bcrypt, sem imports Node). Usada pelo middleware.
- `auth.ts` — configuração completa com `DrizzleAdapter` e provider `Credentials`. Usada nas rotas API e Server Components.

---

## Fluxo de cadastro por e-mail/senha

```
POST /api/register
  ├── Valida nome, e-mail, senha (mín. 8 chars)
  ├── Verifica se e-mail já existe (409 se sim)
  ├── hashPassword(senha) → bcrypt 10 rounds
  ├── generateCode() → 6 dígitos via CSPRNG (randomInt)
  ├── hashCode(code) → mesmo bcrypt
  ├── Transação: INSERT users + INSERT email_verifications
  └── sendVerificationCode(email, code)
        ├── Se RESEND_API_KEY presente: envia e-mail via Resend
        └── Se não: console.log("[dev] código ... : XXXXXX")

POST /api/verify-email
  ├── Busca email_verifications WHERE email = ? AND consumed_at IS NULL (mais recente)
  ├── Verifica expiração (TTL: 15 min)
  ├── Verifica tentativas (MAX: 5)
  ├── verifyCode(code, codeHash) → bcrypt compare
  ├── Incrementa attempts se errado
  └── Se correto: marca consumed_at, define users.email_verified = NOW()

POST /api/verify-email/resend
  ├── Anti-enumeração: retorna ok mesmo se e-mail não existe
  ├── Verifica cooldown (60 s desde último envio)
  ├── Insere novo registro em email_verifications
  └── sendVerificationCode(email, novoCode)
```

**Limites da tabela `email_verifications`:**

| Parâmetro           | Valor       |
| ------------------- | ----------- |
| TTL do código       | 15 minutos  |
| Tentativas máximas  | 5           |
| Cooldown de reenvio | 60 segundos |

---

## Gating por middleware

O arquivo `apps/web/src/middleware.ts` intercede **antes** de qualquer rota corresponder ao App Router.

**Rotas protegidas:**

```
/mapa/**       → redirect /entrar?next=<path>  (não autenticado)
/painel/**     → redirect /entrar?next=<path>
/reportar/**   → redirect /entrar?next=<path>
/api/tiles/**  → 401 JSON                       (APIs)
/api/incidents/** → 401 JSON
/api/risk/**   → 401 JSON
```

**Rotas públicas (não interceptadas):**

- `/` (landing)
- `/entrar`, `/cadastrar`, `/verificar`
- `/api/register`, `/api/verify-email`, `/api/auth/**`

**Comportamento por tipo de rota:**

- Rota de página não autenticada → redirect para `/entrar?next=<pathname>`
- Rota de API não autenticada → `{ error: "Não autenticado." }` com status `401`
- Autenticado → passa sem modificação (`NextResponse.next()`)

O middleware usa `authConfig` (edge-safe, sem Node.js) para verificar o JWT sem acessar o banco.

---

## Rate-limit e auditoria de relatos

**Rate-limit** (`apps/web/src/lib/rate-limit.ts`):

Usa Redis com janela fixa por chave. Para relatos autenticados:

```
chave: rl:report:<userId>
limite: 10 requisições
janela: 60 segundos
```

Se excedido: `429 Too Many Requests`.

**Auditoria** (`apps/web/src/lib/audit.ts` + tabela `access_logs`):

Cada relato criado com sucesso grava um registro em `access_logs`:

```ts
logAccess('report', { userId: session.user.id, meta: { id: incident?.id } });
```

Campos registrados: `action`, `user_id`, `meta` (JSONB), `ip` (não preenchido no POST de relatos — follow-up pendente), `created_at`.

> **Follow-up identificado:** `logAccess` é chamado após o `return` com status 201 no fluxo do `createIncident`. Se o insert de `access_logs` falhar, o relato já foi criado — o log é melhor-esforço, não transacional.

---

## Relato autenticado

`POST /api/incidents` agora:

1. Chama `requireSession()` — retorna 401 se sem sessão.
2. Aplica rate-limit por `userId`.
3. Deriva `authorId: session.user.id` — o cliente não passa mais o authorId.
4. Aceita campo `anonymous: boolean` — quando verdadeiro, a identidade não é exposta na UI (o `author_id` ainda é gravado no banco para fins de moderação).
5. Grava em `access_logs` após criação.

**Follow-up identificado:** `categorySlug` e `sourceId` chegam do corpo sem validação de tipo (`body?.categorySlug` é `unknown`). A validação ocorre indiretamente via `getCategory(input.categorySlug)` que lança se o slug for inválido, mas `sourceId` só valida via FK no banco.

---

## Anti-scraping (planejado — PR3)

> Esta seção descreve o próximo passo, **não implementado ainda**.

Hoje o controle de acesso aos dados de incidentes é feito por:

1. **Login obrigatório** — sem sessão, `/api/incidents` retorna 401.
2. **Rate-limit** — 10 relatos/minuto por usuário autenticado.
3. **GET /api/incidents** ainda existe e retorna GeoJSON bruto (até 1 000 registros) para usuários autenticados. O mapa atual o consome diretamente.

**PR3 irá substituir esse modelo por tiles raster:**

- `GET /api/tiles/{z}/{x}/{y}.png` — tile PNG renderizado no servidor (MapLibre GL Native ou similar). Entrega apenas o visual, sem expor coordenadas ou metadados em JSON.
- `GET /api/incidents/near?lng=&lat=&r=` — detalhe por clique (ponto + raio), autenticado, retorna poucos registros.
- **Remoção do `GET /api/incidents` em massa** após migração do mapa para tiles.

Após o PR3, mesmo um usuário autenticado não conseguirá fazer dump completo dos dados via API — apenas visualizar tiles e obter detalhes de pontos específicos.

`TILE_CACHE_TTL` (env, em segundos) está reservada para o cache de tiles do PR3.
