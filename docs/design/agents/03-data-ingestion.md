# Agente 03 — Dados Iniciais e Atualizações Automáticas

**Radar Urbano — Documento de Arquitetura de Ingestão de Dados**
Versão: 1.0 | Data: junho 2026

---

## 1. Contexto e Princípios Gerais

O Radar Urbano é uma plataforma comunitária de segurança urbana que combina **reports colaborativos da população** com **dados públicos oficiais**. A camada de dados externos tem papel complementar: contextualiza, valida e enriquece os relatos humanos — nunca os substitui.

### Princípios inegociáveis

- **Sem scraping agressivo.** Apenas fontes com permissão explícita (licença aberta, API pública, download autorizado).
- **Privacidade antes de tudo.** Nenhum dado pessoal de terceiros entra no pipeline.
- **Transparência da fonte.** Cada incidente exibe sua procedência (ISP-RJ, COR, comunidade, etc.) e grau de confiabilidade.
- **Dados como contexto, não como alarme.** Estatísticas de criminalidade não viram "ranking do medo". São exibidas com cautela editorial.
- **Falha silenciosa.** Se uma fonte estiver indisponível, o pipeline registra o erro e segue; o mapa não quebra.

---

## 2. Fontes de Dados — Tabela Mestre

| #   | Nome                                             | Órgão / Entidade                                   | O que oferece                                                                                                           | Formato                                       | Tem API?                                                       | Scraping permitido?       | Periodicidade                           | Confiabilidade                             | Link principal                                                                        |
| --- | ------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- | ------------------------- | --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | **ISPDados — Estatísticas ISP-RJ**               | Instituto de Segurança Pública (Gov. RJ)           | Ocorrências criminais agregadas por CISP/AISP/RISP/município: homicídios, roubos, furtos, apreensões, etc.              | CSV / XLSX (download mensal)                  | Não (download manual; parcialmente via dadosabertos.rj.gov.br) | Sim — dados abertos       | Mensal (dia 15 aprox.)                  | Alta — fonte oficial auditada pela CGPOL   | https://www.ispdados.rj.gov.br                                                        |
| 2   | **Portal Dados Abertos RJ (Estado)**             | Governo do Estado do Rio de Janeiro                | Catálogo com datasets do ISP, SEPM, DETRAN, entre outros; pacotes CKAN                                                  | JSON (CKAN API) / CSV / SHP                   | Sim — CKAN REST API                                            | Sim — dados abertos       | Variável por dataset                    | Alta                                       | https://dadosabertos.rj.gov.br                                                        |
| 3   | **DATA.RIO (Prefeitura)**                        | Escritório de Dados / Prefeitura Rio               | Dados municipais: logradouros, câmeras, iluminação, bairros, limites administrativos, pluviometria, etc.                | GeoJSON / CSV / SHP / WFS / WMS               | Sim — ArcGIS REST API + api.dados.rio                          | Sim — dados abertos       | Diária a mensal conforme dataset        | Alta                                       | https://www.data.rio / https://api.dados.rio                                          |
| 4   | **SEPM — Dados Abertos PMERJ**                   | Secretaria de Estado de Polícia Militar            | Ocorrências PMERJ, abordagens policiais, BPM por área                                                                   | CSV / PDF (limitado)                          | Não formal                                                     | Sim — dados abertos       | Irregular                               | Média                                      | https://sepm.rj.gov.br/dados-abertos                                                  |
| 5   | **Sistema Alerta Rio**                           | Centro de Operações / Prefeitura Rio               | Pluviômetros (33 estações), nível de rios, avisos de risco, dados a cada 15 min                                         | Download CSV / página web                     | Não formal (dados em página + parceria INMET)                  | Sim — dados abertos       | 15 minutos (chuva) / diário (histórico) | Alta                                       | https://alertario.rio.rj.gov.br / https://www.sistema-alerta-rio.com.br               |
| 6   | **COR.Rio — Centro de Operações**                | Centro de Operações e Resiliência / Prefeitura Rio | Ocorrências urbanas, trânsito, interditações, eventos, redes sociais (@operacoesrio)                                    | Redes sociais + app (sem API pública formal)  | Não — monitorar Twitter/X e Telegram como fonte secundária     | Somente redes públicas    | Tempo real                              | Média-Alta                                 | https://cor.rio                                                                       |
| 7   | **SINESP — Dados Nacionais**                     | Ministério da Justiça e Segurança Pública          | Ocorrências criminais consolidadas por estado/município: 28 indicadores nacionais                                       | CSV (dados.mj.gov.br)                         | Parcial — dados.gov.br CKAN                                    | Sim — dados abertos       | Mensal a trimestral                     | Alta — nacional, comparativo               | https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica |
| 8   | **IBGE — Malhas e Censo**                        | IBGE                                               | Malha de bairros, setores censitários, municípios; dados socioeconômicos do Censo 2022                                  | GeoJSON / SHP / TopoJSON                      | Sim — servicodados.ibge.gov.br/api                             | Sim — dados abertos       | Anual a decenal                         | Muito Alta                                 | https://servicodados.ibge.gov.br/api/docs/malhas                                      |
| 9   | **Base dos Dados (BD+)**                         | Base dos Dados (ONG)                               | Tabelas tratadas do ISP-RJ, FBSP, SINESP e outras — cruzamento via BigQuery (1 TB grátis/mês)                           | SQL / Python / R via BigQuery                 | Sim — Python/R client + BigQuery                               | Sim — dados abertos       | Conforme fonte original                 | Alta — dados limpos e documentados         | https://basedosdados.org                                                              |
| 10  | **FBSP — Fórum Brasileiro de Segurança Pública** | Fórum Brasileiro de Segurança Pública (ONG)        | Anuário Brasileiro de Segurança Pública (anual, 2025 = 19ª edição); dados históricos tratados                           | PDF / planilha anual                          | Não                                                            | Sim — publicações abertas | Anual (julho)                           | Alta — referência acadêmica e jornalística | https://forumseguranca.org.br/publicacoes/anuario-brasileiro-de-seguranca-publica     |
| 11  | **OpenStreetMap / Overpass API**                 | OpenStreetMap Foundation                           | Geometria de ruas, logradouros, delegacias, hospitais, UPPs, escolas; atualização contínua pela comunidade              | GeoJSON / JSON via Overpass QL                | Sim — Overpass API (overpass-api.de)                           | Sim — ODbL                | Contínua                                | Alta para geometria; variável para POIs    | https://overpass-api.de                                                               |
| 12  | **Waze for Cities**                              | Google / Waze                                      | Incidentes de tráfego reportados por usuários: acidentes, perigos, fechamentos — parceria com Prefeitura Rio desde 2013 | JSON feed (somente para parceiros municipais) | Sim — programa parceiro (requer convênio)                      | Apenas via parceria       | Tempo real                              | Média-Alta (crowdsourced)                  | https://www.waze.com/wazeforcities                                                    |
| 13  | **INMET — Dados Meteorológicos**                 | Instituto Nacional de Meteorologia                 | Temperatura, chuva, vento; integrado ao Alerta Rio                                                                      | CSV / API JSON                                | Sim — portal.inmet.gov.br/api                                  | Sim — dados abertos       | Horária                                 | Alta                                       | https://portal.inmet.gov.br                                                           |

### Prioridade de implementação

**Fase 1 (lançamento):** ISPDados (#1), DATA.RIO (#3), IBGE malhas (#8), OpenStreetMap (#11)
**Fase 2 (pós-lançamento):** Portal Estado RJ (#2), SINESP (#7), Base dos Dados (#9), Alerta Rio (#5)
**Fase 3 (parcerias):** COR.Rio monitoramento (#6), Waze for Cities (#12), FBSP anual (#10)

---

## 3. Arquitetura de Ingestão — Visão Geral

O pipeline segue o fluxo:

```
FONTES EXTERNAS
      |
      v
┌─────────────────────────────────────────────┐
│  COLETA (SourceAdapter — packages/data-     │
│  ingestion)                                 │
│  fetch() → RawRecord[]                      │
└──────────────────┬──────────────────────────┘
                   │ job na fila BullMQ
                   v
┌─────────────────────────────────────────────┐
│  NORMALIZAÇÃO                               │
│  normalize(raw) → NormalizedIncident        │
│  + enriquecimento geográfico (PostGIS)      │
│  + resolução de bairro por ST_Within        │
└──────────────────┬──────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────┐
│  MODERAÇÃO AUTOMÁTICA                       │
│  • Score de confiabilidade (0–1)            │
│  • Deduplicação por externalId + bbox       │
│  • Classificação de categoria (slug)        │
│  • Flag de revisão se score < threshold     │
└──────────────────┬──────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────┐
│  BANCO DE DADOS (Postgres + PostGIS)        │
│  Tabelas: incidents, sources, risk_scores   │
│  Drizzle ORM                                │
└──────────────────┬──────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────┐
│  RECOMPUTE RISK (job BullMQ — já existe)    │
│  aggregateRisk() → normalizeRisk()          │
│  Atualiza risk_scores por bairro            │
└──────────────────┬──────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────┐
│  MAPA + CACHE                               │
│  • Heatmap tiles invalidados no Redis       │
│  • Feed recente atualizado                  │
│  • CDN/cache HTTP purge por tag de bairro   │
└─────────────────────────────────────────────┘
```

---

## 4. Fluxograma Detalhado (ASCII)

```
CRON SCHEDULER (BullMQ Repeatable Jobs)
   |
   |── 06h00 UTC-3 ─── "ingest:isp-rj"        → fila ingestion
   |── 06h30 UTC-3 ─── "ingest:data-rio"       → fila ingestion
   |── 07h00 UTC-3 ─── "ingest:ibge"           → fila ingestion (semanal, dom)
   |── */15min ──────── "ingest:alerta-rio"     → fila ingestion (chuva)
   |── 00h00 UTC-3 ─── "ingest:sinesp"         → fila ingestion (mensal, dia 16)
   |── 08h00 UTC-3 ─── "ingest:osm"            → fila ingestion (semanal, sex)
   |
   v
┌──────────────────────────────────────────────────────────┐
│ Worker: fila "ingestion" (apps/worker)                   │
│                                                          │
│  job.data = { adapterId: "isp-rj", params: {...} }       │
│                                                          │
│  1. getAdapter(adapterId)                                │
│  2. adapter.fetch(params) → RawRecord[]                  │
│       • HTTP GET/download com timeout 30s                │
│       • Retry: 3x com backoff exponencial                │
│       • Em erro: registra em ingest_logs, não lança      │
│                                                          │
│  3. Para cada RawRecord:                                 │
│     a. adapter.normalize(raw) → NormalizedIncident       │
│     b. enrich(incident):                                 │
│        • ST_Within(point, neighborhoods) → neighborhood_id│
│        • trustScore = calcTrustScore(sourceKind, adapter)│
│        • categorySlug = classifyCategory(raw)            │
│     c. upsert em incidents (ON CONFLICT externalId)      │
│        • evita duplicatas de reprocessamento             │
│                                                          │
│  4. Após batch completo:                                 │
│     • adiciona job "risk:recompute" na fila risk         │
│     • invalida cache Redis (heatmap, feed)               │
│     • registra resultado em ingest_logs                  │
└──────────────────────────────────────────────────────────┘
         |
         v
┌──────────────────────────────────────────────────────────┐
│ Worker: fila "risk" (já existe — recompute-risk.ts)      │
│  aggregateRisk() → normalizeRisk() → risk_scores upsert  │
└──────────────────────────────────────────────────────────┘
         |
         v
┌──────────────────────────────────────────────────────────┐
│ Cache invalidation                                       │
│  Redis DEL heatmap:tiles:*                               │
│  Redis DEL feed:recent:*                                 │
│  (tiles são regenerados on-demand na próxima requisição) │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Extensão do `packages/data-ingestion`

### 5.1 Interface `SourceAdapter` — já existe, não quebrar

```
// packages/data-ingestion/src/types.ts (atual)
export interface SourceAdapter {
  id: string;
  sourceKind: SourceKind;
  fetch(params?: Record<string, unknown>): Promise<RawRecord[]>;
  normalize(raw: RawRecord): NormalizedIncident;
}
```

A interface **não precisa ser alterada**. As extensões são feitas por composição.

### 5.2 Novos campos em `NormalizedIncident`

Acrescentar campos opcionais sem breaking change:

```
// Adição proposta em types.ts
export interface NormalizedIncident {
  externalId: string;
  categorySlug: CategorySlug;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
  // --- novos campos ---
  trustScore?: number;        // 0.0 – 1.0 (calculado pelo pipeline)
  sourceLabel?: string;       // "ISP-RJ", "DATA.RIO", etc. (exibido na UI)
  rawUrl?: string;            // link para a fonte original (transparência)
  needsReview?: boolean;      // flag para moderação humana posterior
}
```

### 5.3 Novos adapters a criar

Cada adapter fica em `packages/data-ingestion/src/adapters/`:

| Arquivo               | Source                   | Método de coleta                                                |
| --------------------- | ------------------------ | --------------------------------------------------------------- |
| `isp-rj-csv.ts`       | ISPDados (mensal CSV)    | Download HTTP do link fixo do CKAN; parse CSV com `papaparse`   |
| `data-rio-geojson.ts` | DATA.RIO / ArcGIS        | Fetch REST: `https://services.arcgis.com/.../query?f=geojson`   |
| `alerta-rio.ts`       | Sistema Alerta Rio       | Download CSV de pluviômetros; parse e mapeamento por estação    |
| `sinesp.ts`           | SINESP / dados.mj.gov.br | Download CSV via CKAN; filtrar registros do RJ                  |
| `ibge-malhas.ts`      | IBGE API                 | `servicodados.ibge.gov.br/api/v3/malhas` — atualiza geometrias  |
| `osm-overpass.ts`     | OpenStreetMap            | Overpass QL por bbox do RJ; POIs de delegacias, UPPs, hospitais |

### 5.4 Utilitário `calcTrustScore`

```
// packages/data-ingestion/src/trust.ts
// Lógica proposta — não é código de produção, é especificação

export function calcTrustScore(
  sourceKind: SourceKind,          // 'OFFICIAL' | 'PARTNER' | 'COMMUNITY'
  adapterAgeInDays: number,        // quantos dias desde a coleta
  hasCoordinates: boolean,
  hasTimestamp: boolean,
): number {
  // Base por tipo de fonte
  const base = {
    OFFICIAL: 0.90,   // ISP-RJ, SINESP, IBGE
    PARTNER: 0.70,    // DATA.RIO, Alerta Rio, OSM
    COMMUNITY: 0.50,  // reports da plataforma
  }[sourceKind];

  // Penalidade por idade dos dados
  const agePenalty = Math.min(0.20, adapterAgeInDays * 0.01);

  // Bônus por qualidade do registro
  const qualityBonus = (hasCoordinates ? 0.05 : 0) + (hasTimestamp ? 0.05 : 0);

  return Math.min(1.0, Math.max(0.0, base - agePenalty + qualityBonus));
}
```

### 5.5 Registro dos novos adapters em `index.ts`

```
// Adicionar em packages/data-ingestion/src/index.ts
import { ispRjCsvAdapter } from './adapters/isp-rj-csv.js';
import { dataRioGeoJsonAdapter } from './adapters/data-rio-geojson.js';
import { alertaRioAdapter } from './adapters/alerta-rio.js';
import { sinespAdapter } from './adapters/sinesp.js';
import { ibgeMalhasAdapter } from './adapters/ibge-malhas.js';
import { osmOverpassAdapter } from './adapters/osm-overpass.js';

registerAdapter(ispRjCsvAdapter);
registerAdapter(dataRioGeoJsonAdapter);
registerAdapter(alertaRioAdapter);
registerAdapter(sinespAdapter);
registerAdapter(ibgeMalhasAdapter);
registerAdapter(osmOverpassAdapter);
```

---

## 6. Agendamento Diário — Cron Jobs no Worker

O `apps/worker` já usa BullMQ com suporte nativo a **Repeatable Jobs** (cron expressions). A extensão proposta adiciona os jobs de ingestão ao arquivo `src/index.ts`:

### 6.1 Tabela de agendamentos

| Job name                      | Cron           | Adapter                           | Descrição                             |
| ----------------------------- | -------------- | --------------------------------- | ------------------------------------- |
| `ingest:alerta-rio`           | `*/15 * * * *` | alerta-rio                        | Pluviômetros a cada 15 min            |
| `ingest:cor-redes`            | `*/30 * * * *` | (monitor Twitter/X @operacoesrio) | Ocorrências urbanas COR (fase 2)      |
| `ingest:data-rio-logradouros` | `0 6 * * *`    | data-rio-geojson                  | Infraestrutura urbana diária          |
| `ingest:isp-rj`               | `0 7 15 * *`   | isp-rj-csv                        | Download mensal ISP (dia 15)          |
| `ingest:sinesp`               | `0 8 16 * *`   | sinesp                            | Download mensal SINESP (dia 16)       |
| `ingest:osm`                  | `0 3 * * 5`    | osm-overpass                      | POIs OSM semanais (sexta 3h)          |
| `ingest:ibge-malhas`          | `0 4 * * 0`    | ibge-malhas                       | Geometrias IBGE semanais (dom 4h)     |
| `risk:recompute`              | `0 * * * *`    | —                                 | Já existe; recomputa score por bairro |

### 6.2 Estrutura de job payload

```
// Job data padrão para todos os jobs de ingestão
interface IngestionJobData {
  adapterId: string;
  params?: Record<string, unknown>;
  triggeredBy: 'cron' | 'manual' | 'webhook';
  runId: string;   // uuid v4 para rastreamento em logs
}
```

### 6.3 Adição no `apps/worker/src/index.ts`

```
// Acrescentar após os Workers existentes

import { ingestionQueue } from './queues.js';
import { randomUUID } from 'crypto';

// Helper para registrar job recorrente de ingestão
function scheduleIngestion(
  name: string,
  adapterId: string,
  cronPattern: string,
  params?: Record<string, unknown>,
) {
  return ingestionQueue.add(
    name,
    { adapterId, params, triggeredBy: 'cron', runId: randomUUID() },
    { repeat: { pattern: cronPattern } },
  );
}

await scheduleIngestion('ingest:alerta-rio',         'alerta-rio',         '*/15 * * * *');
await scheduleIngestion('ingest:data-rio',           'data-rio-geojson',   '0 6 * * *');
await scheduleIngestion('ingest:isp-rj',             'isp-rj-csv',         '0 7 15 * *');
await scheduleIngestion('ingest:sinesp',             'sinesp',             '0 8 16 * *');
await scheduleIngestion('ingest:osm',                'osm-overpass',       '0 3 * * 5');
await scheduleIngestion('ingest:ibge',               'ibge-malhas',        '0 4 * * 0');
```

---

## 7. Modelo de Dados — Tabelas de Suporte

### 7.1 Tabela `ingest_logs` (nova)

Rastreia cada execução de ingestão para auditoria e diagnóstico:

```
CREATE TABLE ingest_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL,
  adapter_id    TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  records_fetched    INT,
  records_inserted   INT,
  records_skipped    INT,   -- duplicatas
  records_errored    INT,
  status        TEXT NOT NULL CHECK (status IN ('running','success','partial','error')),
  error_message TEXT,
  triggered_by  TEXT NOT NULL DEFAULT 'cron'
);

CREATE INDEX ON ingest_logs (adapter_id, started_at DESC);
```

### 7.2 Tabela `sources` (existente, verificar schema)

Garantir que a tabela `sources` (ou `incident_sources`) tenha:

```
-- Campos mínimos esperados
source_kind   TEXT NOT NULL CHECK (source_kind IN ('OFFICIAL','PARTNER','COMMUNITY')),
source_label  TEXT NOT NULL,    -- "ISP-RJ", "Comunidade", etc.
trust_base    DECIMAL(3,2),     -- score base desta fonte (0.0–1.0)
active        BOOLEAN DEFAULT true,
last_fetched  TIMESTAMPTZ
```

### 7.3 Campo `trust_score` em `incidents`

O campo já existe no schema (referenciado em `recompute-risk.ts`). Confirmar que é `DECIMAL(4,3)` e está indexado junto com `occurred_at` para performance na query de agregação de risco.

---

## 8. Classificação Automática de Categorias

O adapter recebe dados brutos com descrições em português. A classificação propõe mapeamento por dicionário de termos antes de recorrer a heurísticas:

### 8.1 Dicionário de mapeamento (termos → slug)

```
// packages/data-ingestion/src/classify.ts
// Especificação — implementar com Map<string, CategorySlug>

const KEYWORD_MAP: [RegExp, CategorySlug][] = [
  [/roub|assalt|arromb/i,          'roubo'],
  [/furt/i,                         'furto'],
  [/homicíd|mort|assassin/i,        'violencia-grave'],
  [/estupr|abuso sexual/i,          'violencia-grave'],
  [/tráfico|drogas|entorpecente/i,  'trafico'],
  [/tiroteio|bala perdida|confron/i,'conflito-armado'],
  [/alagam|enchent|chuva|lameir/i,  'risco-natural'],
  [/acidente|colisão|atropel/i,     'acidente'],
  [/incêndio|fogo|queimad/i,        'incendio'],
  [/iluminação|escuro|poste/i,      'infraestrutura'],
  [/buraco|via|asfalto|pavim/i,     'infraestrutura'],
];

export function classifyCategory(text: string): CategorySlug {
  for (const [pattern, slug] of KEYWORD_MAP) {
    if (pattern.test(text)) return slug;
  }
  return 'outro';
}
```

### 8.2 Regras de deduplicação

Um incidente é considerado duplicata se:

1. Mesmo `externalId` + mesmo `adapterId` → upsert silencioso.
2. Coordenadas dentro de raio de 50 m + mesma categoria + `occurredAt` com diferença < 30 min → marcar como `needs_review = true` e não inserir automaticamente.

---

## 9. Estratégia de Confiabilidade e Moderação

### 9.1 Escala de trust_score

| Faixa       | Significado                              | Ação                                                 |
| ----------- | ---------------------------------------- | ---------------------------------------------------- |
| 0.85 – 1.00 | Alta confiabilidade (oficial verificado) | Publicado automaticamente                            |
| 0.60 – 0.84 | Média confiabilidade (parceiro/OSM)      | Publicado com label de fonte visível                 |
| 0.40 – 0.59 | Confiabilidade moderada                  | Publicado com aviso "dado em verificação"            |
| 0.00 – 0.39 | Baixa confiabilidade                     | Entra na fila de revisão humana; não aparece no mapa |

### 9.2 Fontes e seus scores base

| Fonte                           | `sourceKind` | Score base |
| ------------------------------- | ------------ | ---------- |
| ISP-RJ oficial                  | OFFICIAL     | 0.92       |
| SINESP federal                  | OFFICIAL     | 0.90       |
| IBGE                            | OFFICIAL     | 0.98       |
| DATA.RIO (Prefeitura)           | PARTNER      | 0.85       |
| Alerta Rio                      | PARTNER      | 0.88       |
| OSM Overpass                    | PARTNER      | 0.75       |
| COR redes sociais               | PARTNER      | 0.65       |
| Report comunitário verificado   | COMMUNITY    | 0.60       |
| Report comunitário novo usuário | COMMUNITY    | 0.45       |

### 9.3 Validação de geometria

Antes do upsert, todo ponto geográfico passa por:

1. `ST_IsValid(geom)` — rejeita coordenadas inválidas.
2. `ST_Within(point, ST_GeomFromText('POLYGON(...)'))` com bbox do Estado do RJ — rejeita pontos fora da área de cobertura.
3. `ST_Within(point, neighborhood.geom)` — atribui `neighborhood_id` ou marca como `unlocated` se não cair em nenhum bairro cadastrado.

---

## 10. Considerações de Anti-scraping e Ética

- **ISP-RJ:** dados são liberados como CSV para download; não há necessidade de scraping. O pipeline baixa o arquivo oficial publicado no portal CKAN.
- **DATA.RIO:** tem ArcGIS REST API pública e documentada; uso direto da API, sem raspar HTML.
- **IBGE:** API oficial com documentação pública; sem limite de uso declarado para usos institucionais.
- **Alerta Rio:** dados meteorológicos públicos disponíveis para download no site oficial.
- **OSM:** licença ODbL permite uso e redistribuição com atribuição; Overpass API é pública.
- **COR / Waze:** sem API pública formal. Fase 3 depende de convênio formal com a Prefeitura do Rio, seguindo o modelo já estabelecido desde 2013.
- **FBSP / SINESP:** publicações anuais e downloads CSV são abertos. Nenhum scraping de conteúdo protegido.

---

## 11. Cache e Invalidação

```
FLUXO DE CACHE
──────────────

Requisição de tile (heatmap)
         │
         ▼
   Redis HIT? ──── SIM ──────────────► retorna tile em cache (< 5ms)
         │
        NÃO
         │
         ▼
   Gera tile via PostGIS (ST_AsMVT)
         │
         ▼
   Armazena em Redis com TTL = 6h
         │
         ▼
   Retorna tile

Após ingestão bem-sucedida:
  Redis DEL heatmap:tiles:<bairro>:*
  Redis DEL feed:recent:page:*

Estratégia de chaves:
  heatmap:tiles:{z}:{x}:{y}
  feed:recent:bairro:{id}:page:{n}
  risk:score:bairro:{id}
  ingest:last_run:{adapter_id}    ← TTL = 25h (detecta job preso)
```

---

## 12. Observabilidade e Alertas

### 12.1 Métricas a registrar por execução

- `ingest_duration_ms` — tempo total de fetch + normalize + upsert
- `records_fetched`, `records_inserted`, `records_skipped`, `records_errored`
- `trust_score_mean` — média do lote (queda súbita indica problema na fonte)

### 12.2 Alertas propostos

| Condição                                         | Ação                                           |
| ------------------------------------------------ | ---------------------------------------------- |
| Job falha 3x consecutivas                        | Notificação no canal de ops (Slack/e-mail)     |
| `records_fetched == 0` em job mensal no dia > 20 | Alerta de possível mudança de formato da fonte |
| `trust_score_mean < 0.5` em lote da ISP-RJ       | Revisão manual da normalização                 |
| `ingest:last_run:{id}` expirou no Redis          | Job travado — reiniciar worker                 |
| Taxa de `records_errored > 20%`                  | Pausa automática do adapter por 24h            |

---

## 13. Estrutura de Arquivos Resultante

```
packages/data-ingestion/
├── src/
│   ├── types.ts                    ← NormalizedIncident estendido
│   ├── registry.ts                 ← sem mudança
│   ├── index.ts                    ← registrar novos adapters
│   ├── trust.ts                    ← novo: calcTrustScore()
│   ├── classify.ts                 ← novo: classifyCategory()
│   ├── geo.ts                      ← novo: validarGeometria(), resolverBairro()
│   └── adapters/
│       ├── isp-rj.ts               ← stub existente (refatorar para isp-rj-csv)
│       ├── isp-rj-csv.ts           ← novo: download CSV mensal ISP-RJ
│       ├── csv.ts                  ← existente (genérico)
│       ├── geojson.ts              ← existente (genérico)
│       ├── public-api.ts           ← existente (genérico)
│       ├── data-rio-geojson.ts     ← novo: ArcGIS REST / DATA.RIO
│       ├── alerta-rio.ts           ← novo: pluviômetros 15min
│       ├── sinesp.ts               ← novo: download mensal federal
│       ├── ibge-malhas.ts          ← novo: geometrias semanais
│       └── osm-overpass.ts         ← novo: POIs OSM semanais

apps/worker/
├── src/
│   ├── index.ts                    ← adicionar scheduleIngestion()
│   ├── queues.ts                   ← sem mudança (ingestionQueue já existe)
│   └── jobs/
│       ├── recompute-risk.ts       ← sem mudança
│       ├── run-ingestion.ts        ← novo: handler do job de ingestão
│       └── invalidate-cache.ts     ← novo: invalida Redis após ingestão
```

---

## 14. Resumo Executivo

O Radar Urbano tem infraestrutura técnica sólida para receber dados externos: o pacote `packages/data-ingestion` com interface `SourceAdapter` já está operacional com 4 adapters stub, e o `apps/worker` com BullMQ já processa a fila `ingestion` e agenda jobs repetíveis.

A proposta deste documento:

1. **Mapeia 13 fontes públicas reais** — com formato, periodicidade, confiabilidade e links — priorizadas em 3 fases.
2. **Propõe 6 novos adapters** que estendem a interface existente sem breaking change.
3. **Define agendamento completo** com cron expressions BullMQ prontas para copiar.
4. **Introduz `trust_score` automatizado** por tipo de fonte, idade e qualidade do registro.
5. **Especifica deduplicação geoespacial**, classificação por dicionário de palavras-chave e moderação em camadas.
6. **Integra com a arquitetura existente** (Redis cache, PostGIS, Drizzle, recompute-risk) sem redesenhar o que já funciona.

Nenhuma fonte proposta requer scraping não autorizado. Todas as coletas são via API documentada, download oficial ou licença aberta.
