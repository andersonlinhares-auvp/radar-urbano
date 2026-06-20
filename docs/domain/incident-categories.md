# Categorias de incidentes

O Radar Urbano classifica ocorrências em **19 categorias**, definidas em `packages/core/src/categories.ts` como o array `CATEGORIES`. Cada categoria possui um `riskWeight` (0–1) que pondera sua contribuição no cálculo do Risk Score.

Os ícones seguem a biblioteca **Lucide** (nomes de componentes).

---

## Tabela de categorias

### Grupo: patrimônio

| Slug                 | Label                | Ícone            | Cor       | riskWeight | Descrição                                           |
| -------------------- | -------------------- | ---------------- | --------- | ---------- | --------------------------------------------------- |
| `roubo-celular`      | Roubo de celular     | `smartphone`     | `#D2702F` | 0,6        | Subtração de celular com violência ou grave ameaça. |
| `furto-celular`      | Furto de celular     | `smartphone`     | `#E0A93B` | 0,4        | Subtração de celular sem violência (ex.: descuido). |
| `assalto-mao-armada` | Assalto à mão armada | `shield-alert`   | `#A8332F` | 0,85       | Roubo mediante uso de arma.                         |
| `tentativa-assalto`  | Tentativa de assalto | `shield`         | `#D2702F` | 0,6        | Tentativa de roubo não consumada.                   |
| `arrastao`           | Arrastão             | `users`          | `#A8332F` | 0,8        | Ação coletiva de roubo a múltiplas vítimas.         |
| `roubo-veiculo`      | Roubo de veículo     | `car`            | `#A8332F` | 0,8        | Subtração de veículo com violência ou ameaça.       |
| `furto-veiculo`      | Furto de veículo     | `car`            | `#E0A93B` | 0,55       | Subtração de veículo sem violência.                 |
| `roubo-carga`        | Roubo de carga       | `truck`          | `#A8332F` | 0,8        | Subtração de carga transportada.                    |
| `golpe`              | Golpe                | `alert-triangle` | `#E0A93B` | 0,4        | Fraude ou estelionato (presencial ou digital).      |

### Grupo: violência armada

| Slug                 | Label                   | Ícone       | Cor       | riskWeight | Descrição                                             |
| -------------------- | ----------------------- | ----------- | --------- | ---------- | ----------------------------------------------------- |
| `disparo-arma`       | Disparo de arma de fogo | `crosshair` | `#A8332F` | 0,9        | Disparo de arma de fogo registrado.                   |
| `tiroteio`           | Tiroteio                | `crosshair` | `#A8332F` | 0,95       | Troca de tiros em via ou área pública.                |
| `confronto-policial` | Confronto policial      | `siren`     | `#A8332F` | 0,9        | Operação ou confronto envolvendo forças de segurança. |

### Grupo: pessoa

| Slug                      | Label                   | Ícone         | Cor       | riskWeight | Descrição                                             |
| ------------------------- | ----------------------- | ------------- | --------- | ---------- | ----------------------------------------------------- |
| `sequestro-relampago`     | Sequestro relâmpago     | `user-x`      | `#A8332F` | 0,9        | Privação de liberdade de curta duração para extorsão. |
| `violencia-contra-mulher` | Violência contra mulher | `heart-crack` | `#A8332F` | 0,85       | Agressão física, psicológica ou sexual contra mulher. |
| `assedio`                 | Assédio                 | `user-minus`  | `#D2702F` | 0,5        | Assédio moral ou sexual em espaço público.            |

### Grupo: mobilidade

| Slug              | Label           | Ícone          | Cor       | riskWeight | Descrição                                   |
| ----------------- | --------------- | -------------- | --------- | ---------- | ------------------------------------------- |
| `vandalismo`      | Vandalismo      | `spray-can`    | `#E0A93B` | 0,35       | Dano a patrimônio público ou privado.       |
| `area-alagada`    | Área alagada    | `waves`        | `#E0A93B` | 0,45       | Alagamento que afeta circulação ou imóveis. |
| `via-interditada` | Via interditada | `construction` | `#E0A93B` | 0,3        | Bloqueio ou interdição de via.              |

### Grupo: outros

| Slug    | Label | Ícone         | Cor       | riskWeight | Descrição                                          |
| ------- | ----- | ------------- | --------- | ---------- | -------------------------------------------------- |
| `outro` | Outro | `help-circle` | `#5A6470` | 0,2        | Ocorrência não classificada nas demais categorias. |

---

## Paleta de cores por grupo

| Grupo              | Cor predominante | Hex                   |
| ------------------ | ---------------- | --------------------- |
| `violencia_armada` | Crítico          | `#A8332F`             |
| `pessoa`           | Crítico / Alto   | `#A8332F` / `#D2702F` |
| `patrimonio`       | Alto / Atenção   | `#D2702F` / `#E0A93B` |
| `mobilidade`       | Atenção          | `#E0A93B`             |
| `outros`           | Ardósia          | `#5A6470`             |

---

## Uso programático

```ts
import { CATEGORIES, CATEGORY_BY_SLUG, getCategory } from '@radar-urbano/core';

// Lista todas as categorias
CATEGORIES.forEach((c) => console.log(c.slug, c.riskWeight));

// Busca por slug
const cat = CATEGORY_BY_SLUG['tiroteio'];

// Busca com erro em slug inválido
const cat2 = getCategory('slug-invalido'); // lança Error
```

O tipo `CategorySlug` (union literal de todos os 19 slugs) e a interface `IncidentCategory` estão em `packages/core/src/types.ts`.
