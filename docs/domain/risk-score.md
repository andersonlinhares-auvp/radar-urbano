# Risk Score

O **Risk Score** (Pontuação de Risco) mede o nível de periculosidade de uma região geográfica em uma janela temporal. É um inteiro de **0 a 100** derivado de três etapas: contribuição individual, agregação e normalização. Implementado em `packages/core/src/risk-score.ts`.

---

## Etapa 1 — Contribuição de um incidente

Cada incidente contribui para o score da região com base em seu peso de categoria, Trust Score e tempo decorrido.

```
contribution = categoryWeight × (trustScore / 100) × exp(-λ × ageDays)
```

**Constante:** `RISK_DECAY_LAMBDA (λ) = 0.05`

### Parâmetros

| Parâmetro        | Fonte                             | Intervalo |
| ---------------- | --------------------------------- | --------- |
| `categoryWeight` | `incident_categories.risk_weight` | 0–1       |
| `trustScore`     | `incidents.trust_score`           | 0–100     |
| `ageDays`        | `(now - occurred_at)` em dias     | ≥ 0       |

### Decaimento temporal (λ = 0,05)

A função exponencial `exp(-0.05 × ageDays)` modela o efeito de que incidentes mais antigos têm menor impacto no risco atual:

| Idade (dias) | Fator de decaimento |
| ------------ | ------------------- |
| 0            | 1,000               |
| 7            | 0,705               |
| 14           | 0,497               |
| 30           | 0,223               |
| 60           | 0,050               |
| 90           | 0,011               |

Com λ = 0,05, um incidente perde metade de seu peso em aproximadamente **14 dias** e torna-se marginal após 60 dias.

---

## Etapa 2 — Agregação por área

```
aggregateRisk(items, areaFactor) = Σ contribution(i) / areaFactor
```

O `areaFactor` normaliza a soma bruta pela área do bairro/região (para evitar que regiões maiores tenham score artificialmente maior). Se `areaFactor ≤ 0`, é tratado como 1.

Na implementação atual do worker, `areaFactor = 1` (bairros ainda não possuem área calculada):

```ts
// apps/worker/src/jobs/recompute-risk.ts
const value = aggregateRisk(items, 1);
```

---

## Etapa 3 — Normalização city-max

```
normalizedScore = round(clamp(rawScore / cityMax, 0, 1) × 100)
```

`cityMax` é o maior valor bruto entre todos os bairros computados na mesma execução. O bairro mais perigoso recebe score 100; os demais são proporcionais.

---

## Exemplo numérico completo

**Cenário:** bairro com 3 incidentes, janela de 30 dias, `cityMax = 0.9`.

| Incidente            | categoryWeight | trustScore | ageDays | contribution                     |
| -------------------- | -------------- | ---------- | ------- | -------------------------------- |
| Tiroteio             | 0,95           | 82         | 3       | 0,95 × 0,82 × exp(-0,15) ≈ 0,670 |
| Assalto à mão armada | 0,85           | 60         | 15      | 0,85 × 0,60 × exp(-0,75) ≈ 0,257 |
| Roubo de celular     | 0,60           | 40         | 28      | 0,60 × 0,40 × exp(-1,40) ≈ 0,059 |

```
Σ contribution = 0,670 + 0,257 + 0,059 = 0,986
aggregateRisk  = 0,986 / 1 = 0,986
normalizedScore = round(clamp(0,986 / 0,9, 0, 1) × 100) = round(1,00 × 100) = 100
```

Neste exemplo o bairro seria o mais perigoso do município (score 100, CRÍTICO).

---

## Faixas de risco e cores

A função `riskBand(score)` classifica o score normalizado em quatro faixas:

| Faixa     | Intervalo | Cor           | Hex       |
| --------- | --------- | ------------- | --------- |
| `BAIXO`   | 0 – 32    | Verde-azulado | `#3e8e7e` |
| `MEDIO`   | 33 – 59   | Âmbar         | `#e0a93b` |
| `ALTO`    | 60 – 79   | Laranja       | `#d2702f` |
| `CRITICO` | 80 – 100  | Vermelho      | `#a8332f` |

```ts
// packages/core/src/risk-score.ts
function riskBand(score: number): RiskBand {
  if (score < 33) return 'BAIXO';
  if (score < 60) return 'MEDIO';
  if (score < 80) return 'ALTO';
  return 'CRITICO';
}
```

---

## Recompute automático

O worker `apps/worker` recomputa o risco de todos os bairros **a cada hora** via BullMQ:

```ts
// apps/worker/src/index.ts
await riskQueue.add('hourly', {}, { repeat: { every: 3600_000 } });
```

A janela padrão é de **30 dias** (`windowDays = 30`) — incidentes com `occurred_at > now() - 30d` são incluídos no cálculo.

---

## `risk_scores` — snapshots append-only

Cada execução do worker **insere novos registros** em `risk_scores`; não há upsert. Consumidores devem ler o score mais recente com:

```sql
SELECT DISTINCT ON (ref_id) scope, ref_id, score, computed_at
FROM risk_scores
WHERE scope = 'NEIGHBORHOOD'
ORDER BY ref_id, computed_at DESC;
```

### Retenção (trabalho futuro)

Atualmente não há política de retenção ou expiração automática de registros antigos em `risk_scores`. Com execução horária, a tabela crescerá linearmente com o número de bairros. Como trabalho futuro recomendado:

- Adicionar job de limpeza periódica que remove registros com `computed_at < now() - 7 days`.
- Ou particionar a tabela por `computed_at` (tabela particionada por data).
- Ou usar uma política de retenção via `pg_partman`.

---

## API pública (`packages/core`)

```ts
import {
  riskContribution,
  aggregateRisk,
  normalizeRisk,
  riskBand,
  RISK_BAND_COLOR,
  RISK_DECAY_LAMBDA,
} from '@radar-urbano/core';

// Contribuição de um incidente
const c = riskContribution({ categoryWeight: 0.9, trustScore: 75, ageDays: 10 });

// Agregar lista
const raw = aggregateRisk(inputs, areaFactor);

// Normalizar
const score = normalizeRisk(raw, cityMax);

// Faixa e cor
const band = riskBand(score); // 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
const color = RISK_BAND_COLOR[band]; // hex string
```
