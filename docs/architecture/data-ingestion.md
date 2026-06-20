# Arquitetura de ingestão de dados

## Visão geral

O subsistema de ingestão do Radar Urbano fornece uma **arquitetura extensível** para importar incidentes de fontes externas (APIs públicas, arquivos CSV, GeoJSON, microdados oficiais). A implementação atual contém quatro **adapters stub** — esqueletos prontos para receber lógica real sem scraping agressivo.

O pacote fica em `packages/data-ingestion/`.

---

## Interface `SourceAdapter`

Toda fonte de dados deve implementar a interface abaixo (definida em `packages/data-ingestion/src/types.ts`):

```ts
export interface SourceAdapter {
  id: string; // identificador único do adapter
  sourceKind: SourceKind; // 'OFFICIAL' | 'COMMUNITY' | 'NEWS' | 'PARTNER'
  fetch(params?: Record<string, unknown>): Promise<RawRecord[]>; // busca registros brutos
  normalize(raw: RawRecord): NormalizedIncident; // converte para formato padronizado
}
```

O tipo `NormalizedIncident` é o contrato de saída de qualquer adapter:

```ts
export interface NormalizedIncident {
  externalId: string; // ID na fonte original (evita duplicatas)
  categorySlug: CategorySlug;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
}
```

---

## Registry de adapters

O registry (`packages/data-ingestion/src/registry.ts`) é um `Map<id, SourceAdapter>` em memória. API:

| Função                     | Descrição                                      |
| -------------------------- | ---------------------------------------------- |
| `registerAdapter(adapter)` | Registra um adapter pelo seu `id`              |
| `getAdapter(id)`           | Retorna o adapter ou lança erro se não existir |
| `listAdapters()`           | Retorna todos os adapters registrados          |
| `_resetRegistry()`         | Limpa o registry (uso exclusivo em testes)     |

---

## Adapters disponíveis (stubs)

| ID           | `sourceKind` | Arquivo                      | Descrição                                                                                                                                         |
| ------------ | ------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `geojson`    | `PARTNER`    | `src/adapters/geojson.ts`    | Lê features GeoJSON; normaliza `geometry.coordinates` e `properties`.                                                                             |
| `csv`        | `PARTNER`    | `src/adapters/csv.ts`        | Lê linhas CSV com colunas `id`, `titulo`, `lng`, `lat`, `data`.                                                                                   |
| `isp-rj`     | `OFFICIAL`   | `src/adapters/isp-rj.ts`     | Prepara ingestão de microdados do ISP-RJ (Instituto de Segurança Pública do Rio de Janeiro). Espera arquivos oficiais já baixados — sem scraping. |
| `public-api` | `PARTNER`    | `src/adapters/public-api.ts` | Consome APIs REST públicas com campos `id`, `title`, `lng`, `lat`, `timestamp`.                                                                   |

Todos os métodos `fetch()` retornam `[]` (array vazio) nos stubs. Para ativar um adapter real:

1. Implemente `fetch()` com a lógica de leitura (arquivo, HTTP, banco).
2. Implemente `normalize()` mapeando os campos específicos da fonte.
3. Registre o adapter no `index.ts` do pacote ou no worker de ingestão.

---

## Fluxo de ingestão

```
                ┌──────────────┐
                │  BullMQ job  │  (fila 'ingestion', apps/worker)
                └──────┬───────┘
                       │  listAdapters()
                       ▼
         ┌─────────────────────────┐
         │  Para cada SourceAdapter│
         └──────┬──────────────────┘
                │
                ├─ 1. fetch(params?)  →  RawRecord[]
                │
                ├─ 2. normalize(raw)  →  NormalizedIncident
                │
                └─ 3. upsert no DB via ref_code / externalId
                       (prevenção de duplicatas)
```

### Etapa 1 — fetch

O adapter consulta a fonte (arquivo, URL, banco externo) e retorna registros brutos sem transformação. Parâmetros opcionais permitem filtrar por data, área ou tipo.

### Etapa 2 — normalize

Cada registro bruto é convertido para `NormalizedIncident`. O adapter é responsável por mapear campos da fonte para o contrato padrão, incluindo a classificação em `CategorySlug`.

### Etapa 3 — upsert

O worker insere ou atualiza incidentes no banco usando `externalId` + `source_id` como chave de deduplicação. O Trust Score inicial é calculado com base no `sourceKind` do adapter.

---

## Agendamento via worker

O `apps/worker` usa BullMQ para acionar a ingestão:

```ts
new Worker(
  'ingestion',
  async (job) => {
    const adapters = listAdapters();
    // processa cada adapter registrado
  },
  { connection },
);
```

A fila `ingestion` pode ser acionada manualmente via API de admin ou agendada com cron no BullMQ.

---

## Política: sem scraping agressivo

O Radar Urbano **não realiza scraping de sites** nem acessa dados não-públicos. Os adapters são projetados para:

- Consumir APIs com rate limit respeitado.
- Ler arquivos oficiais disponibilizados por órgãos públicos (ex.: ISP-RJ).
- Operar em modo pull — nenhum dado é coletado continuamente sem consentimento da fonte.

Toda ingestão de uma nova fonte deve ter a política de uso revisada antes da implementação do `fetch()`.
