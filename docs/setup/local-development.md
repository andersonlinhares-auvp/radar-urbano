# Desenvolvimento local

Este guia descreve como configurar e executar o Radar Urbano localmente em modo desenvolvimento.

---

## Pré-requisitos

| Ferramenta     | Versão mínima | Verificação              |
| -------------- | ------------- | ------------------------ |
| Node.js        | 20.11 (LTS)   | `node --version`         |
| pnpm           | 9.x           | `pnpm --version`         |
| Docker         | 24+           | `docker --version`       |
| Docker Compose | v2+           | `docker compose version` |

> **Recomendado:** use [nvm](https://github.com/nvm-sh/nvm) ou [fnm](https://github.com/Schniz/fnm) para gerenciar a versão do Node. O arquivo `.nvmrc` na raiz do projeto especifica a versão correta.

---

## Passo a passo

### 1. Clone o repositório

```bash
git clone https://github.com/seu-org/radar-urbano.git
cd radar-urbano
```

### 2. Instale as dependências

```bash
pnpm install
```

O comando instala todas as dependências do monorepo (raiz + pacotes + apps) via pnpm workspaces.

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

O arquivo `.env.example` contém todos os valores padrão necessários para desenvolvimento local. Edite conforme necessário:

```dotenv
# Banco de dados
POSTGRES_USER=radar
POSTGRES_PASSWORD=radar
POSTGRES_DB=radar_urbano
DATABASE_URL=postgresql://radar:radar@postgres:5432/radar_urbano

# Redis (BullMQ + rate-limit)
REDIS_URL=redis://redis:6379

# Auth.js — troque por uma string aleatória de 32+ bytes
AUTH_SECRET=troque-por-uma-string-aleatoria-de-32-bytes
AUTH_URL=http://localhost:3000

# OAuth Google (opcional em dev — sem as chaves o botão Google não aparece)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Resend (e-mail transacional)
# Sem a chave, o código de verificação é logado no console do servidor.
RESEND_API_KEY=
EMAIL_FROM="Radar Urbano <no-reply@radarurbano.org>"

# MapLibre — tiles OSM de demonstração
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json

# Cache de tiles (segundos) — apenas para PR3/tiles, ignorado por ora
TILE_CACHE_TTL=300
```

> **Atenção:** nunca comite o arquivo `.env` com credenciais reais. O `.gitignore` já exclui `.env`.

### 4. Inicie os serviços Docker

```bash
docker compose up -d
```

Os seguintes serviços sobem:

| Serviço    | Imagem                   | Porta local | Descrição                         |
| ---------- | ------------------------ | ----------- | --------------------------------- |
| `postgres` | `postgis/postgis:16-3.4` | 5432        | Banco de dados com PostGIS        |
| `redis`    | `redis:7-alpine`         | 6379        | Filas BullMQ e rate-limit         |
| `web`      | Build local              | 3000        | Aplicação Next.js                 |
| `worker`   | Build local              | —           | Worker BullMQ (sem porta pública) |
| `adminer`  | `adminer:4`              | 8080        | Interface web do banco            |

O `postgres` possui healthcheck — os demais serviços aguardam sua prontidão antes de subir.

### 5. Execute as migrações e o seed

```bash
pnpm db:migrate
pnpm db:seed
```

- `db:migrate`: aplica as migrações SQL em `packages/db/migrations/` no banco PostgreSQL.
- `db:seed`: popula as tabelas de referência (categorias, fontes iniciais).

### 6. Crie uma conta e verifique o e-mail

Como o acesso ao mapa e painel exige autenticação:

1. Acesse http://localhost:3000/cadastrar e preencha nome, e-mail e senha (mín. 8 caracteres).
2. **Em dev sem `RESEND_API_KEY`:** o código de 6 dígitos aparece no log do container `web`:
   ```
   [dev] código de verificação para usuario@exemplo.com: 847291
   ```
3. Acesse http://localhost:3000/verificar e insira o código.
4. Faça login em http://localhost:3000/entrar com e-mail/senha **ou** via Google (se configurado).

Alternativamente, configure `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` para usar o fluxo OAuth Google, que não requer verificação de e-mail.

### 7. Acesse a aplicação

| URL                          | Descrição                      |
| ---------------------------- | ------------------------------ |
| http://localhost:3000        | Aplicação web principal        |
| http://localhost:3000/mapa   | Mapa interativo com incidentes |
| http://localhost:3000/painel | Painel de risco por bairro     |
| http://localhost:8080        | Adminer (gerenciador do banco) |

---

## Comandos úteis

### Desenvolvimento sem Docker (apenas banco via Docker)

```bash
# Sobe apenas postgres e redis
docker compose up postgres redis -d

# Inicia Next.js em modo dev
pnpm --filter @radar-urbano/web dev

# Inicia worker em modo dev (em outro terminal)
pnpm --filter @radar-urbano/worker dev
```

### Linting e typecheck

```bash
pnpm lint         # ESLint em todo o monorepo
pnpm typecheck    # tsc --noEmit em todos os pacotes
```

### Testes

```bash
pnpm test         # Vitest em todos os pacotes
```

### Build de produção

```bash
pnpm build        # build de todos os apps e pacotes
```

---

## Parar e limpar

```bash
# Para os containers sem remover dados
docker compose stop

# Para e remove containers (preserva volume pgdata)
docker compose down

# Remove tudo incluindo o volume do banco (CUIDADO: apaga todos os dados)
docker compose down -v
```

---

## Troubleshooting

### `Error: Adapter desconhecido` ou `Categoria desconhecida`

Verifique se o seed foi executado (`pnpm db:seed`). As categorias e fontes precisam estar na base.

### `geography(Point,4326)` — erro de migração

Se regenerar a migração com `drizzle-kit generate`, o tipo `geography` será gerado com aspas duplas inválidas. Remova manualmente as aspas ao redor de `geography(...)` antes de aplicar. Ver `docs/architecture/database.md`.

### Porta 5432 já em uso

Outro PostgreSQL está rodando. Pare-o ou mude a porta do compose:

```yaml
# docker-compose.yml
ports: ['5433:5432'] # porta local 5433
```

Atualize `DATABASE_URL` no `.env` para `...@localhost:5433/...`.

### `AUTH_SECRET` muito curto

Auth.js exige uma string de pelo menos 32 bytes. Gere uma:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Mapa não carrega

Verifique se `NEXT_PUBLIC_MAP_STYLE_URL` está configurada e acessível. O valor padrão (`demotiles.maplibre.org`) requer conexão com a internet.

### Login exige e-mail verificado

O login por e-mail/senha retorna erro se o e-mail ainda não foi verificado. Siga o fluxo de verificação descrito no passo 6 acima. Usuários criados via OAuth Google são verificados automaticamente.

### Código de verificação expirado

O código expira em 15 minutos. Use o link "Reenviar código" na página `/verificar` para gerar um novo (cooldown de 60 segundos entre reenvios).
