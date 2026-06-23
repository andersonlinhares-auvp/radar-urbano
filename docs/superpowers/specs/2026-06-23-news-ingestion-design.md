# Design — Pipeline de ingestão de notícias e fontes externas

**Data:** 2026-06-23
**Projeto:** Radar Urbano
**Branch:** feat/auth-ui
**Status:** aprovado (aguardando revisão do spec)

---

## 1. Objetivo

Automatizar a coleta de ocorrências a partir de **fontes externas regionais** (instituto de
dados + jornais + páginas públicas) e exibi-las no mapa como incidentes, **sempre mostrando a
fonte (nome + link) nos detalhes do pin**. A coleta deve respeitar a arquitetura existente de
ingestão, ser tolerante a falhas (uma fonte fora do ar não derruba as outras) e opt-in.

## 2. Princípios (herdados do projeto)

- **Falha silenciosa:** cada adapter é isolado; erro/timeout/mudança de layout marca `ingest_logs`
  como ERROR e segue — o mapa nunca quebra.
- **Procedência declarada:** todo incidente externo guarda `source_name` + `source_url`, exibidos
  no detalhe.
- **Coleta educada:** respeitar `robots.txt`, `User-Agent` identificável, rate-limit entre
  requisições, timeout + retry com backoff (já existe no pipeline).
- **Opt-in:** ingestão agendada só roda com `INGESTION_ENABLED=true`; cada fonte tem flag própria;
  os adapters de Facebook ficam **desligados por padrão**.
- **LGPD:** guardar apenas manchete/resumo + link; não armazenar dados pessoais de terceiros além
  do que está na manchete pública. Incidentes de notícia/Facebook entram com `needsReview=true`.
- **Janela temporal recente:** não traz histórico de anos. A carga inicial vai apenas do **início
  do ano corrente** (ex.: 2026-01-01) para frente, e depois a coleta é **incremental** (só o novo).
  Configurável via `INGESTION_SINCE` (data ISO; default = `1º de janeiro do ano atual`). Isso reduz
  drasticamente o volume e o tempo de coleta. (O mapa ao vivo e o risco já priorizam ~30 dias.)

## 3. Fontes (v1)

| Adapter        | id               | Tipo                  | sourceKind | Detalhe geográfico         | Categorias       | Default  |
| -------------- | ---------------- | --------------------- | ---------- | -------------------------- | ---------------- | -------- |
| Fogo Cruzado   | `fogo-cruzado`   | API REST (token)      | PARTNER    | rua + lat/lng + bairro     | violência armada | ligado\* |
| G1 Rio         | `g1-rio`         | scraping/RSS          | NEWS       | bairro (texto → centroide) | amplas           | ligado\* |
| O Dia          | `o-dia`          | scraping HTML         | NEWS       | bairro (texto → centroide) | amplas           | ligado\* |
| Extra          | `extra`          | scraping HTML         | NEWS       | bairro (texto → centroide) | amplas           | ligado\* |
| OTT (Facebook) | `ott-facebook`   | Facebook HTML público | NEWS       | bairro/rua (se citada)     | amplas           | DESLIG.  |
| Rio de Nojeira | `rio-de-nojeira` | Facebook HTML público | NEWS       | bairro/rua (se citada)     | amplas           | DESLIG.  |

\* "ligado" = entra no agendamento quando `INGESTION_ENABLED=true`. Facebook só roda se a flag
específica `INGESTION_FACEBOOK=true` for definida (best-effort; pode render pouco ou ser bloqueado).

### 3.1 Fogo Cruzado (https://api.fogocruzado.org.br)

- **Auth:** login (e-mail/senha de conta gratuita) → Bearer token; cache do token em memória com
  renovação. Credenciais via env `FOGOCRUZADO_EMAIL` / `FOGOCRUZADO_PASSWORD`.
- **Endpoint:** `GET /occurrences` com `idState` (RJ), `initialdate`/`finaldate`, paginação
  (`page`/`take`). **Carga inicial:** `initialdate = INGESTION_SINCE` (default 1º jan do ano atual);
  execuções seguintes só pegam o que há de novo (incremental por data/dedup). Sem backfill de anos.
- **Campos usados:** `id`, `address`, `latitude`, `longitude`, `neighborhood`, `date`, `mainReason`.
- **Mapeamento de categoria:** ocorrências do Fogo Cruzado → `disparo-arma` / `tiroteio` /
  `confronto-policial` conforme `mainReason` (operação policial vs disparo civil); fallback
  `disparo-arma`.
- **Geo:** usa `latitude`/`longitude` exatos.
- **external_id:** `fogocruzado:{id}`.
- **Status do incidente:** `CONFIRMED` (dado verificado por instituto). `needsReview=false`.

### 3.2 Jornais (G1 Rio, O Dia, Extra)

- **Coleta:** parser isolado por veículo. Entrada preferencial pelo RSS quando disponível
  (mais estável); caso contrário, página de seção "Rio de Janeiro". Cada item: `title`, `url`,
  `summary`, `publishedAt`.
- **Categoria:** classificador por palavras-chave (ver §5).
- **Bairro:** extrator por casamento do texto (título+resumo) com a lista dos 166 bairros (ver §4);
  coordenada = **centroide do polígono do bairro** (PostGIS `ST_Centroid`).
- **Descartar** itens sem categoria reconhecida OU sem bairro reconhecido (mantém qualidade).
- **external_id:** `{adapterId}:{sha1(url)}`.
- **Status:** `PENDING`, `needsReview=true`.
- **source_url:** URL da matéria. **source_name:** "G1 Rio" / "O Dia" / "Extra".

### 3.3 Facebook (OTT, Rio de Nojeira) — best-effort

- **Coleta:** GET do HTML público da página (sem login). Parser tolerante: se o HTML não trouxer
  posts (muro de login / bloqueio), retorna `[]` e registra ERROR sem derrubar nada.
- **Demais regras:** iguais às dos jornais (categoria + bairro + centroide). `external_id`:
  `{adapterId}:{sha1(postUrlOuTexto)}`. Status `PENDING`, `needsReview=true`.
- **Risco documentado:** contra os ToS do Facebook, sujeito a bloqueio e quebra frequente. Por isso
  desligado por padrão e isolado.

## 4. Extração de bairro (matcher)

- Carregar uma vez por execução: `SELECT id, name FROM neighborhoods` (+ centroide).
- Normalizar nomes e texto: minúsculas, sem acentos, sem pontuação.
- Casar o **nome mais longo** presente no texto (evita "Rio" casar dentro de "Rio Comprido" errado;
  prioriza match específico). Lista de exclusão para nomes ambíguos curtos, se necessário.
- Retorna `{ neighborhoodId, lng, lat }` (centroide) ou `null`.
- Helper novo em `packages/data-ingestion` (ou util compartilhado) — testável isoladamente.

## 5. Classificação de categoria

- Mapa `palavra-chave → CategorySlug`, p.ex.:
  - tiroteio, bala perdida, disparo, baleado → `disparo-arma` / `tiroteio`
  - operação policial, confronto → `confronto-policial`
  - assalto, roubo (mão armada) → `assalto-mao-armada`; "roubo de celular" → `roubo-celular`;
    "roubo de carro/veículo" → `roubo-veiculo`; "carga" → `roubo-carga`
  - furto → `furto-celular`/`furto-veiculo`
  - arrastão → `arrastao`; sequestro relâmpago → `sequestro-relampago`
  - golpe/estelionato → `golpe`; alagamento/enchente → `area-alagada`;
    interdição/via bloqueada → `via-interditada`; vandalismo/depredação → `vandalismo`
- Sem match → item descartado (não cria `outro`).
- Implementado como tabela de regras testável; usa `CategorySlug`/`getCategory` do core.

## 6. Modelo de dados

### 6.1 Migration 0004 (à mão, estilo das existentes)

```sql
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "source_name" text;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "source_url" text;

-- Garante uma source do tipo PARTNER (Fogo Cruzado) para o adapter resolver por kind.
INSERT INTO "sources" ("kind", "name")
SELECT 'PARTNER', 'Fogo Cruzado'
WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE "kind" = 'PARTNER');
```

- `external_id` (único parcial) já existe (migration 0003) e cobre a deduplicação.
- Atualizar `packages/db/src/schema.ts`: `sourceName: text('source_name')`,
  `sourceUrl: text('source_url')`.
- **Resolução de source por `kind`:** Fogo Cruzado → `PARTNER` (criado acima); jornais e
  Facebook → `NEWS` (linha "Imprensa" já existe). O `source_name` específico (ex.: "G1 Rio") vai
  na coluna `incidents.source_name`, não na tabela `sources`. Colunas reais de `sources`:
  `id, kind, name, base_trust (default 0.4), url` — o INSERT `(kind, name)` é suficiente.

### 6.2 Persistência no pipeline

- `NormalizedIncident` já tem `sourceLabel?`, `rawUrl?`, `trustScore?`, `needsReview?`.
- O `runIngestion` (worker) passa a gravar `source_name = sourceLabel`, `source_url = rawUrl`,
  `status` (CONFIRMED p/ Fogo Cruzado; PENDING p/ demais) e respeitar `needsReview`.

## 7. Exibição da fonte nos detalhes

- **APIs:** `GET /api/incidents/recent` e `GET /api/incidents/near` retornam `source_name` e
  `source_url` (quando presentes).
- **Popup (`buildPopupHTML` em `Map.tsx`):** adicionar linha
  `Fonte: {source_name}` e, se houver `source_url`, um link `ver matéria ↗` (target \_blank,
  rel noopener). Relatos da comunidade (sem fonte externa) não exibem o bloco.
- Sanitização: escapar `source_name`; validar que `source_url` começa com `https?://`.

## 8. Worker / agendamento

- Registrar os adapters novos em `packages/data-ingestion/src/index.ts`.
- `runIngestion(adapterId, params)` já existe — só ganha os novos alvos.
- Repeatable jobs (BullMQ) sob `INGESTION_ENABLED=true`:
  - `fogo-cruzado`: a cada ~20 min.
  - `g1-rio`, `o-dia`, `extra`: a cada ~60 min.
  - `ott-facebook`, `rio-de-nojeira`: a cada ~60 min, **somente** se `INGESTION_FACEBOOK=true`.
- Janela incremental: cada adapter coleta desde a última execução (Fogo Cruzado via data; jornais/FB
  via dedup por `external_id`).

## 9. Coleta educada (scraping)

- `User-Agent` identificável (ex.: `RadarUrbanoBot/1.0 (+contato)`).
- Checar `robots.txt` do domínio antes de coletar páginas HTML; pular caminhos proibidos.
- Rate-limit entre requisições do mesmo host; timeout 30s + retry 3x backoff (já no pipeline).
- Nunca seguir paginação infinita; teto de itens por execução (ex.: 50) com `log()` do que truncou.

## 10. Componentes e isolamento

| Unidade                    | Responsabilidade                              | Depende de               |
| -------------------------- | --------------------------------------------- | ------------------------ |
| `neighborhood-matcher`     | texto → bairro + centroide                    | db (neighborhoods)       |
| `category-classifier`      | texto → CategorySlug                          | core (CategorySlug)      |
| `http-fetch` util          | GET com UA, robots, timeout/retry, rate-limit | —                        |
| adapter `fogo-cruzado`     | auth + fetch + normalize ocorrências          | http-fetch, classifier   |
| adapters de jornal/FB      | fetch listagem + normalize itens              | http-fetch, matcher, clf |
| `runIngestion` (existente) | enrich + upsert + log + cache + risco         | db, redis, adapters      |
| API recent/near + popup    | expor e exibir source_name/source_url         | db                       |

## 11. Testes

- Unit: `neighborhood-matcher` (acentos, nome longo vence, ambíguo), `category-classifier`
  (amostras reais de manchete), parsers (com fixtures de HTML/RSS/JSON salvos — sem rede no teste).
- Integração leve: `runIngestion` com adapter fake retornando 2 registros → 2 upserts + ingest_log OK
  (padrão já validado).

## 12. Fora de escopo (v1)

- Geocodificação de rua para fontes de texto (fica centroide do bairro; street geocoding via
  Nominatim é evolução futura).
- Painel de moderação humana das ocorrências `needsReview` (entra como follow-up).
- Blur de imagens / coleta de fotos das fontes.
- Parcerias formais (OTT/Waze) e Twitter/X.

## 13. Riscos

- **Facebook:** alta chance de bloqueio/HTML vazio; mitigado por isolamento + opt-in + falha
  silenciosa.
- **Mudança de layout dos jornais:** parser por site quebra individualmente; mitigado por preferir
  RSS e isolar adapters; manutenção pontual esperada.
- **Token Fogo Cruzado:** exige conta; sem credenciais o adapter loga ERROR e segue.
- **Falsos positivos de bairro/categoria:** mitigado por descartar sem match e marcar `needsReview`.
