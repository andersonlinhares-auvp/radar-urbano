# CI/CD

## Visão geral

O pipeline de integração contínua do Radar Urbano é definido em `.github/workflows/ci.yml`. Ele executa em cada **pull request** e em cada **push para a branch `main`**.

---

## Workflow: `CI`

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
```

### Job: `verify`

O workflow possui um único job chamado `verify`, que roda em `ubuntu-latest`.

#### Serviços (services)

O job sobe um PostgreSQL com PostGIS antes de executar os passos:

| Serviço    | Imagem                   | Porta | Configuração                                      |
| ---------- | ------------------------ | ----- | ------------------------------------------------- |
| `postgres` | `postgis/postgis:16-3.4` | 5432  | `POSTGRES_USER=radar`, `POSTGRES_DB=radar_urbano` |

O healthcheck aguarda `pg_isready` responder antes de prosseguir (intervalo 5s, timeout 5s, 10 tentativas).

> **Nota:** Redis **não** é iniciado como serviço no CI. O worker não é testado end-to-end no pipeline; os testes unitários do `packages/core` e os testes da web não dependem de Redis.

#### Variáveis de ambiente (env)

| Variável                    | Valor no CI                                            |
| --------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`              | `postgresql://radar:radar@localhost:5432/radar_urbano` |
| `REDIS_URL`                 | `redis://localhost:6379`                               |
| `AUTH_SECRET`               | `ci-secret-ci-secret-ci-secret-32`                     |
| `NEXT_PUBLIC_MAP_STYLE_URL` | `https://demotiles.maplibre.org/style.json`            |

#### Passos (steps)

| #   | Step                              | Descrição                                             |
| --- | --------------------------------- | ----------------------------------------------------- |
| 1   | `actions/checkout@v4`             | Clona o repositório                                   |
| 2   | `pnpm/action-setup@v4`            | Instala pnpm 9 no runner                              |
| 3   | `actions/setup-node@v4`           | Configura Node 20 com cache de pnpm                   |
| 4   | `pnpm install --frozen-lockfile`  | Instala dependências (erro se lockfile desatualizado) |
| 5   | `pnpm db:migrate && pnpm db:seed` | Aplica migrações e popula dados de referência         |
| 6   | `pnpm lint`                       | ESLint em todo o monorepo                             |
| 7   | `pnpm typecheck`                  | TypeScript strict em todos os pacotes                 |
| 8   | `pnpm test`                       | Vitest em todos os pacotes                            |
| 9   | `pnpm build`                      | Build de produção de todos os apps                    |

A ordem é importante: `migrate` antes de `test` garante que os testes de integração de banco encontrem o schema correto.

---

## Checklist de proteção de branch (recomendado)

Para proteger a branch `main`, configure as seguintes regras no GitHub:

```
Settings → Branches → Add branch protection rule → main
```

| Regra                                        | Valor sugerido  |
| -------------------------------------------- | --------------- |
| Require status checks to pass before merging | ✅ Ativado      |
| Status checks obrigatórios                   | `verify`        |
| Require branches to be up to date            | ✅ Ativado      |
| Require pull request reviews                 | 1 aprovação     |
| Dismiss stale reviews on push                | ✅ Ativado      |
| Restrict who can push to matching branches   | Conforme equipe |
| Do not allow bypassing the above settings    | ✅ Ativado      |

---

## Executar o equivalente do CI localmente

Para replicar exatamente o que o CI faz antes de abrir um PR:

```bash
# 1. Instale dependências (sem alterar o lockfile)
pnpm install --frozen-lockfile

# 2. Suba o banco (requer Docker)
docker compose up postgres -d

# 3. Aplique migrações e seed
pnpm db:migrate && pnpm db:seed

# 4. Lint
pnpm lint

# 5. Typecheck
pnpm typecheck

# 6. Testes
pnpm test

# 7. Build
pnpm build
```

Alternativamente, o hook `pre-commit` (Husky) já executa lint e format automaticamente em cada commit local.

---

## Adicionar novos jobs ao pipeline

Para adicionar um job paralelo (ex.: deploy de preview):

```yaml
# .github/workflows/ci.yml
jobs:
  verify:
    # ... job existente

  preview-deploy:
    needs: verify # executa após verify passar
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... steps de deploy
```

O campo `needs: verify` garante que o deploy só ocorre se todos os testes passarem.

---

## Secrets necessários para produção

Para configurar deploy automático em produção, adicione os seguintes secrets no repositório GitHub (`Settings → Secrets and variables → Actions`):

| Secret               | Uso                                      |
| -------------------- | ---------------------------------------- |
| `DATABASE_URL`       | URL do banco de produção                 |
| `REDIS_URL`          | URL do Redis de produção                 |
| `AUTH_SECRET`        | String aleatória de 32+ bytes (produção) |
| `AUTH_GITHUB_ID`     | Client ID do OAuth App GitHub            |
| `AUTH_GITHUB_SECRET` | Client Secret do OAuth App GitHub        |

Nunca comite secrets diretamente no código ou nos arquivos de workflow.
