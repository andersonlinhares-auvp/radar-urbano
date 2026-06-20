# Arquitetura do banco de dados

## Visão geral

O Radar Urbano usa **PostgreSQL 16** com a extensão **PostGIS 3.4** (imagem Docker `postgis/postgis:16-3.4`). O schema é gerenciado via **Drizzle ORM** com migrações SQL versionadas em `packages/db/drizzle/`. São 16 tabelas no total, divididas em grupos funcionais.

**SRID:** todas as colunas geoespaciais usam **SRID 4326** (WGS84 — latitude/longitude decimais).
**Índices GiST:** criados em todas as colunas `geography` e `geometry` para buscas espaciais eficientes.

---

## Diagrama ER

```mermaid
erDiagram
  users ||--o{ accounts : "possui"
  users ||--o{ sessions : "possui"
  users ||--o{ incidents : "reporta"
  users ||--o{ verifications : "realiza"
  users ||--o{ votes : "vota"
  users ||--o{ comments : "comenta"
  users ||--o{ alert_subscriptions : "assina"
  users ||--o{ notifications : "recebe"

  sources ||--o{ incidents : "origina"

  incident_categories ||--o{ incidents : "classifica"

  regions ||--o{ neighborhoods : "contém"

  neighborhoods ||--o{ incidents : "localiza"

  incidents ||--o{ verifications : "tem"
  incidents ||--o{ votes : "tem"
  incidents ||--o{ comments : "tem"
  incidents ||--o{ evidence_assets : "tem"
  incidents ||--o{ notifications : "referencia"

  verification_tokens {
    text identifier PK
    text token PK
    timestamp expires
  }

  users {
    uuid id PK
    text name
    text email UK
    timestamp email_verified
    text image
    user_role role
    integer reputation
    timestamp created_at
  }

  accounts {
    uuid user_id FK
    text type
    text provider PK
    text provider_account_id PK
    text refresh_token
    text access_token
    integer expires_at
    text token_type
    text scope
    text id_token
    text session_state
  }

  sessions {
    text session_token PK
    uuid user_id FK
    timestamp expires
  }

  sources {
    uuid id PK
    source_kind kind
    text name
    double base_trust
    text url
  }

  incident_categories {
    text slug PK
    text label
    text group
    text icon
    text color
    double risk_weight
    text description
  }

  regions {
    uuid id PK
    text name
    geometry geom
  }

  neighborhoods {
    uuid id PK
    uuid region_id FK
    text name
    geometry geom
  }

  incidents {
    uuid id PK
    text ref_code UK
    text category_slug FK
    uuid source_id FK
    uuid author_id FK
    text title
    text description
    geography location
    uuid neighborhood_id FK
    timestamp occurred_at
    incident_status status
    integer trust_score
    timestamp created_at
  }

  verifications {
    uuid id PK
    uuid incident_id FK
    uuid user_id FK
    verification_kind kind
    text note
    timestamp created_at
  }

  votes {
    uuid id PK
    uuid incident_id FK
    uuid user_id FK
    integer value
    timestamp created_at
  }

  comments {
    uuid id PK
    uuid incident_id FK
    uuid user_id FK
    text body
    timestamp created_at
  }

  evidence_assets {
    uuid id PK
    uuid incident_id FK
    text url
    evidence_kind kind
    timestamp created_at
  }

  risk_scores {
    uuid id PK
    risk_scope scope
    text ref_id
    timestamp window_start
    timestamp window_end
    integer score
    timestamp computed_at
  }

  alert_subscriptions {
    uuid id PK
    uuid user_id FK
    geography center
    double radius_km
    text categories
    text min_severity
    text channels
    boolean active
  }

  notifications {
    uuid id PK
    uuid user_id FK
    notification_kind kind
    uuid incident_id FK
    text title
    text body
    timestamp read_at
    timestamp created_at
  }
```

---

## Descrição das tabelas

### Grupo: Autenticação (Auth.js)

| Tabela                | Descrição                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `users`               | Usuários do sistema. `reputation` (0–100) alimenta o fator A do Trust Score.                         |
| `accounts`            | Provedores OAuth vinculados ao usuário (ex.: GitHub). PK composta `(provider, provider_account_id)`. |
| `sessions`            | Sessões ativas. Auth.js gerencia o ciclo de vida.                                                    |
| `verification_tokens` | Tokens de verificação de e-mail. PK composta `(identifier, token)`.                                  |

### Grupo: Fontes e categorias

| Tabela                | Descrição                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `sources`             | Origens de dados: `OFFICIAL`, `COMMUNITY`, `NEWS`, `PARTNER`. `base_trust` serve como fallback. |
| `incident_categories` | 19 categorias com slug (PK), label, grupo, ícone Lucide, cor hex, `risk_weight` (0–1).          |

### Grupo: Geografia

| Tabela          | Descrição                                                                          |
| --------------- | ---------------------------------------------------------------------------------- |
| `regions`       | Regiões administrativas. `geom`: `geometry(MultiPolygon,4326)` + índice GiST.      |
| `neighborhoods` | Bairros vinculados a regiões. `geom`: `geometry(MultiPolygon,4326)` + índice GiST. |

### Grupo: Incidentes

| Tabela            | Descrição                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `incidents`       | Registro central. `ref_code` segue o padrão `RU-NNNN`. `location`: `geography(Point,4326)` + GiST. `trust_score` inteiro 0–100. Status: `PENDING → CONFIRMED / REJECTED → RESOLVED`. |
| `verifications`   | CONFIRM ou DISPUTE por usuário. Alimenta o fator C do Trust Score.                                                                                                                   |
| `votes`           | Votos numéricos (positivo/negativo) em incidentes.                                                                                                                                   |
| `comments`        | Comentários textuais. Cascata `onDelete` quando o incidente é removido.                                                                                                              |
| `evidence_assets` | Fotos (`IMAGE`) ou vídeos (`VIDEO`) anexados. Alimentam o fator E do Trust Score.                                                                                                    |

### Grupo: Risco

| Tabela        | Descrição                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `risk_scores` | Snapshots append-only de risco por escopo (`STREET`, `NEIGHBORHOOD`, `REGION`). `ref_id` identifica a entidade geográfica. Ver nota abaixo. |

### Grupo: Alertas e notificações

| Tabela                | Descrição                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `alert_subscriptions` | Assinaturas de alerta por área (`center` + `radius_km`). Filtros por categoria e severidade mínima. Canais: `IN_APP` (padrão), outros via array. `center`: `geography(Point,4326)` + GiST. |
| `notifications`       | Notificações entregues ao usuário. `read_at` nulo = não lida.                                                                                                                              |

---

## Enums PostgreSQL

| Enum                | Valores                                                       |
| ------------------- | ------------------------------------------------------------- |
| `source_kind`       | `OFFICIAL`, `COMMUNITY`, `NEWS`, `PARTNER`                    |
| `incident_status`   | `PENDING`, `CONFIRMED`, `REJECTED`, `RESOLVED`                |
| `user_role`         | `USER`, `MODERATOR`, `ADMIN`                                  |
| `verification_kind` | `CONFIRM`, `DISPUTE`                                          |
| `evidence_kind`     | `IMAGE`, `VIDEO`                                              |
| `risk_scope`        | `STREET`, `NEIGHBORHOOD`, `REGION`                            |
| `notification_kind` | `CRITICAL`, `ATTENTION`, `VERIFIED`, `CONFIRMATION`, `DIGEST` |

---

## Nota: `risk_scores` é append-only

A tabela `risk_scores` **não usa upsert**. Cada execução do worker insere novos registros. Consumidores leem o score mais recente via:

```sql
SELECT DISTINCT ON (ref_id) *
FROM risk_scores
WHERE scope = 'NEIGHBORHOOD'
ORDER BY ref_id, computed_at DESC;
```

Retenção e limpeza de registros antigos são **trabalho futuro** — nenhuma política de expiração automática está implementada.

---

## Nota: migrações manuais (drizzle-kit + PostGIS)

O `drizzle-kit` não reconhece `geography` como tipo nativo do PostgreSQL. Ao executar `drizzle-kit generate`, ele emite o tipo entre aspas duplas:

```sql
-- INCORRETO (gerado automaticamente):
"geography(Point,4326)"

-- CORRETO (após correção manual):
geography(Point,4326)
```

**A migração em `packages/db/drizzle/` foi corrigida manualmente** e contém um cabeçalho `NOTE` documentando isso. **Nunca delete e regenere a migração sem aplicar essa correção**; o SQL com aspas é inválido e falhará no PostgreSQL.

Se for necessário regenerar:

1. Execute `pnpm --filter @radar-urbano/db generate`.
2. Abra o arquivo `.sql` gerado.
3. Substitua todas as ocorrências de `"geography(Point,4326)"` por `geography(Point,4326)` e `"geography(Polygon,4326)"` pelo equivalente sem aspas.
4. Valide o SQL antes de aplicar.
