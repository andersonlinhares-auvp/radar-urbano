# Trust Score

O **Trust Score** (Pontuação de Confiança) mede o grau de credibilidade de um relato de incidente. É um inteiro de **0 a 100** calculado pela função `computeTrustScore` em `packages/core/src/trust-score.ts`.

---

## Fórmula geral

```
score = W_confirm × C + W_source × S + W_author × A + W_evidence × E + W_recurrence × R
```

O resultado é multiplicado por 100 e arredondado para inteiro.

### Pesos (WEIGHTS)

| Fator        | Variável | Peso | Descrição                                      |
| ------------ | -------- | ---- | ---------------------------------------------- |
| Confirmações | C        | 0,30 | Saldo líquido de confirmações vs. disputas     |
| Fonte        | S        | 0,25 | Confiabilidade da origem do relato             |
| Autor        | A        | 0,15 | Reputação histórica do usuário autor           |
| Evidências   | E        | 0,15 | Presença de foto e/ou vídeo                    |
| Recorrência  | R        | 0,15 | Frequência de relatos similares na área/janela |

---

## Fator C — Confirmações (saturação exponencial)

```
C = 1 - exp(-K_CONFIRM × max(0, confirms - disputes))
```

**Constante:** `K_CONFIRM = 0.5`

A função de saturação `saturating(x, k) = 1 - exp(-k × x)` garante retornos decrescentes — a diferença entre 0 e 1 confirmação tem muito mais impacto do que entre 10 e 11.

| confirms − disputes | C (aprox.) |
| ------------------- | ---------- |
| 0                   | 0,000      |
| 1                   | 0,393      |
| 2                   | 0,632      |
| 4                   | 0,865      |
| 8                   | 0,982      |

---

## Fator S — Fonte

```
S = SOURCE_FACTOR[sourceKind]
```

| `sourceKind` | S    |
| ------------ | ---- |
| `OFFICIAL`   | 1,00 |
| `PARTNER`    | 0,80 |
| `NEWS`       | 0,60 |
| `COMMUNITY`  | 0,40 |

---

## Fator A — Autor

```
A = clamp(authorReputation / REP_MAX, 0, 1)
```

**Constante:** `REP_MAX = 100`

`authorReputation` é o valor do campo `users.reputation` (0–100). Um usuário com reputação 50 contribui A = 0,5 para o fator autor.

---

## Fator E — Evidências

```
E = clamp((hasPhoto ? 0.5 : 0) + (hasVideo ? 0.5 : 0), 0, 1)
```

| Evidências   | E    |
| ------------ | ---- |
| Nenhuma      | 0,00 |
| Só foto      | 0,50 |
| Só vídeo     | 0,50 |
| Foto + vídeo | 1,00 |

---

## Fator R — Recorrência (saturação exponencial)

```
R = 1 - exp(-K_RECUR × recurrenceCount)
```

**Constante:** `K_RECUR = 0.5`

`recurrenceCount` é o número de relatos similares (mesma categoria ou bairro) dentro de uma janela temporal/espacial.

| recurrenceCount | R (aprox.) |
| --------------- | ---------- |
| 0               | 0,000      |
| 1               | 0,393      |
| 3               | 0,777      |
| 6               | 0,950      |
| 10              | 0,993      |

---

## Exemplos numéricos

### Exemplo 1 — Relato oficial com evidências e confirmações

```
sourceKind:        OFFICIAL   → S = 1.00
confirms:          3
disputes:          0           → C = 1 - exp(-0.5 × 3) ≈ 0.777
authorReputation:  80          → A = 0.80
hasPhoto:          true
hasVideo:          false       → E = 0.50
recurrenceCount:   2           → R = 1 - exp(-0.5 × 2) ≈ 0.632

score = 0.30 × 0.777 + 0.25 × 1.00 + 0.15 × 0.80 + 0.15 × 0.50 + 0.15 × 0.632
      = 0.233 + 0.250 + 0.120 + 0.075 + 0.095
      = 0.773 → 77 (arredondado)
```

### Exemplo 2 — Relato anônimo de comunidade sem evidências

```
sourceKind:        COMMUNITY  → S = 0.40
confirms:          0
disputes:          0           → C = 0.000
authorReputation:  50          → A = 0.50
hasPhoto:          false
hasVideo:          false       → E = 0.00
recurrenceCount:   0           → R = 0.000

score = 0.30 × 0 + 0.25 × 0.40 + 0.15 × 0.50 + 0.15 × 0 + 0.15 × 0
      = 0 + 0.100 + 0.075 + 0 + 0
      = 0.175 → 18
```

---

## Reputação do autor: `nextReputation`

A função `nextReputation` atualiza a reputação do autor após a moderação de um relato:

```ts
function nextReputation(current: number, outcome: 'CONFIRMED' | 'REJECTED'): number {
  const baseDelta = 6;
  const damping = 1 / (1 + Math.abs(current - 50) / 50);
  const delta = baseDelta * damping * (outcome === 'CONFIRMED' ? 1 : -1.5);
  return clamp(Math.round(current + delta), 0, REP_MAX);
}
```

### Comportamento assimétrico (deliberado)

A penalidade por relato **REJECTED** é **1,5× maior** do que o bônus por relato **CONFIRMED**:

```
CONFIRMED: delta = +6 × damping
REJECTED:  delta = -9 × damping   (fator -1.5)
```

**Rationale:** Relatos falsos causam alarme desnecessário, desgaste da confiança da plataforma e sobrecarga de moderadores. O custo de um relatório falso deve ser proporcionalmente maior do que o ganho de um correto, desincentivando uso abusivo.

### Damping de retornos decrescentes

O fator `damping = 1 / (1 + |current − 50| / 50)` reduz o delta conforme a reputação se afasta do centro (50):

- Reputação 50 (neutro): `damping = 1.00` → delta máximo
- Reputação 80: `damping = 1 / (1 + 30/50) = 0.625` → delta reduzido
- Reputação 20: `damping = 0.625` → igualmente reduzido
- Reputação 100 (máximo): `damping = 0.50`
- Reputação 0 (mínimo): `damping = 0.50`

Isso evita que reputações extremas subam/desçam muito rápido, tornando o sistema mais estável.

### Tabela de exemplos — `nextReputation`

| `current` | `outcome`   | `damping` | `delta` | Novo valor |
| --------- | ----------- | --------- | ------- | ---------- |
| 50        | `CONFIRMED` | 1,000     | +6      | 56         |
| 50        | `REJECTED`  | 1,000     | -9      | 41         |
| 80        | `CONFIRMED` | 0,625     | +3,75   | 84         |
| 80        | `REJECTED`  | 0,625     | -5,625  | 74         |
| 20        | `CONFIRMED` | 0,625     | +3,75   | 24         |
| 20        | `REJECTED`  | 0,625     | -5,625  | 14         |

### Limites

Reputação é sempre clampada em `[0, 100]`. Um usuário mal-intencionado não pode ter reputação negativa; um usuário exemplar não ultrapassa 100.
