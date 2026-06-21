# Agente 04 — Correções Visuais e UX

> Auditoria baseada nos arquivos reais: `apps/web/src/components/MapShell.tsx`, `Map.tsx` e `apps/web/src/app/painel/page.tsx`.

---

## 1. LISTA DE BUGS (problemas confirmados no código)

### BUG-01 — Legenda do mapa: gradiente sem rótulos de escala [ALTA]

**Onde:** `MapShell.tsx` linhas 109–125 (bloco `bottom-4 left-4`).

**Problema:** A legenda exibe apenas uma barra de gradiente e o texto "Densidade de risco", sem nenhuma indicação de quais cores correspondem a quê. O usuário não sabe o que é "baixo" ou "alto" risco. A escala cromática vai de `#3fb6a8` (verde-azulado) a `#a8332f` (vermelho), mas isso não está explicado.

**Impacto:** Usuário lê o heatmap sem contexto. A plataforma perde credibilidade — parece decoração, não dado.

---

### BUG-02 — Popup do mapa: copy técnico, sem contexto humano [ALTA]

**Onde:** `Map.tsx` função `buildPopupHTML` (linhas 33–44).

**Problema:** O popup mostra exatamente:

```
Furto de celular
Furto de celular · CONFIRMED
RU-M9XD · confiança 57
```

Quatro problemas em sequência:

- O título e a categoria repetem a mesma informação.
- `CONFIRMED` é string de banco de dados, não linguagem humana.
- `RU-M9XD` (código interno) aparece em destaque sem explicação.
- `confiança 57` — o usuário não sabe se 57 é bom ou ruim, e em qual escala.

---

### BUG-03 — Cartão lateral (feed): linha de metadados sem contexto [ALTA]

**Onde:** `MapShell.tsx` linhas 164–167.

**Problema:**

```
{item.categoryLabel} · {item.status} · {relTime(item.occurredAt)}
```

Produz: `Furto de celular . CONFIRMED . há 15 min`

O `status` é valor raw do banco (`CONFIRMED`, `PENDING`, `REJECTED`). Não há informação sobre quem confirmou, quantas pessoas reportaram, nem o bairro. O `relTime` existe mas fica perdido entre dois outros campos sem hierarquia visual.

---

### BUG-04 — Busca: campo sem funcionalidade [ALTA]

**Onde:** `MapShell.tsx` linhas 61–70.

**Problema:** O `<input>` de busca existe no HTML mas não tem `onChange`, `onKeyDown`, nenhum handler, nenhum estado, nenhuma API conectada. É um campo decorativo. O usuário digita e nada acontece.

---

### BUG-05 — Filtro de tempo: botão "Últimas 24h" sem funcionalidade [MÉDIA]

**Onde:** `MapShell.tsx` linha 71–75.

**Problema:** O botão com seta `▾` não abre dropdown, não filtra nada, não tem `aria-expanded`. Parece funcional mas é apenas cosmético.

---

### BUG-06 — Painel: KPI "Bairros monitorados" com dado tautológico [BAIXA]

**Onde:** `painel/page.tsx` linha 100.

**Problema:**

```
hint={`${stats.monitoredNeighborhoods} de ${stats.monitoredNeighborhoods} · 100%`}
```

Exibe "X de X · 100%" sempre — o numerador e denominador são a mesma variável. Isso não transmite informação útil.

---

### BUG-07 — Legenda: sem pin de marcadores [MÉDIA]

**Onde:** `MapShell.tsx` legenda e `Map.tsx` criação de marcadores.

**Problema:** Os pins de ocorrência no mapa (losango rotacionado, colorido por categoria) não têm correspondência na legenda. O usuário vê pinos coloridos no mapa mas a legenda só fala do heatmap. As categorias de pin (furto, violência, acidente etc.) nunca são explicadas visualmente.

---

### BUG-08 — Popup clique no mapa: sem campos `occurredAt`, `confirmations` [MÉDIA]

**Onde:** `Map.tsx` `buildPopupHTML` e `onClick` handler (linha 170–175).

**Problema:** O popup aberto por clique no mapa usa a mesma função `buildPopupHTML`, que não recebe nem exibe a data/hora da ocorrência, número de confirmações ou bairro. O tipo `RecentIncident` tem `occurredAt` mas ele não é renderizado no popup.

---

## 2. MELHORIAS DE UX (além dos bugs)

### MUX-01 — Confiança em linguagem humana [ALTA]

O campo `trustScore` (0–100) precisa ser traduzido para o usuário. Proposta:

| Score  | Texto humano                       | Cor            |
| ------ | ---------------------------------- | -------------- |
| 0–29   | Não verificado — apenas 1 report   | cinza          |
| 30–59  | Poucos relatos — use com cautela   | âmbar          |
| 60–79  | Confirmado por moradores da região | verde-petroleo |
| 80–100 | Alta confiança — múltiplas fontes  | verde escuro   |

O número bruto pode aparecer como detalhe (`(57/100)`) mas nunca como informação principal.

---

### MUX-02 — Cartão de ocorrência com hierarquia humana [ALTA]

Ver seção 3 (wireframes).

---

### MUX-03 — Filtros estilo Waze: por categoria, ocultar/mostrar [ALTA]

Ver seção 3 (wireframes).

---

### MUX-04 — Legenda com escala e pins de categoria [MÉDIA]

Ver seção 3 (wireframes).

---

### MUX-05 — Busca com autocomplete de bairros e categorias [MÉDIA]

Conectar o campo de busca a uma API `/api/search?q=` que retorne:

- Bairros (ex: "Tijuca", "Copacabana")
- Ruas (ex: "Rua das Laranjeiras")
- Categorias de ocorrência (ex: "Furto de veículo")

Ao selecionar, o mapa centraliza no resultado e aplica filtro automático.

---

### MUX-06 — Status em português simples [MÉDIA]

Substituir valores raw de banco por linguagem humana em todos os pontos de exibição:

| Valor DB     | Texto exibido              |
| ------------ | -------------------------- |
| `CONFIRMED`  | Confirmado pela comunidade |
| `PENDING`    | Aguardando confirmação     |
| `REJECTED`   | Descartado                 |
| `UNVERIFIED` | Não verificado             |

---

### MUX-07 — Painel: contextualizar KPI de bairros [BAIXA]

Corrigir a hint do KPI de bairros para mostrar dado real: ex. "160 de 163 bairros ativos". Requer separar o total de bairros do RJ (constante) do total monitorado (variável).

---

## 3. NOVOS COMPONENTES — WIREFRAMES ASCII

---

### COMPONENTE A — Cartão de Ocorrência (feed lateral)

**Hoje:**

```
[■] Furto de celular
    Furto de celular · CONFIRMED · há 15 min
```

**Proposta:**

```
┌─────────────────────────────────────────┐
│ [■ FURTO]                    há 15 min  │
│                                         │
│  Furto de celular                       │
│  Centro · Av. Rio Branco                │
│                                         │
│  Reportado por 3 pessoas da região.     │
│  ✓ Confirmado pela comunidade           │
│                                         │
│  [████████░░] Confiança alta            │
└─────────────────────────────────────────┘
```

**Estrutura de dados necessária no `RecentIncident`:**

```typescript
type RecentIncident = {
  id: string;
  refCode: string; // RU-M9XD (exibir em tooltip, não em destaque)
  title: string; // "Furto de celular"
  categoryLabel: string; // "Furto"
  categoryColor: string; // "#d2702f"
  status: string; // DB value → traduzir via mapa
  statusLabel: string; // "Confirmado pela comunidade"
  trustScore: number; // 0–100 → traduzir para faixa
  trustLabel: string; // "Confiança alta"
  confirmations: number; // 3  → "Reportado por 3 pessoas"
  neighborhood: string; // "Centro"
  street?: string; // "Av. Rio Branco" (opcional)
  occurredAt: string; // ISO → relTime
  lng: number;
  lat: number;
};
```

**Hierarquia visual (3 linhas de informação):**

```
LINHA 1 (topo):   [badge categoria]         [tempo relativo]
LINHA 2 (título): Título da ocorrência (font-medium, 14px)
LINHA 3 (local):  Bairro · Rua (font-normal, 12px, cinza)
LINHA 4 (social): "Reportado por N pessoas da região."
LINHA 5 (status): ✓ Status em português  |  barra de confiança
```

---

### COMPONENTE B — Popup do Mapa

**Hoje:**

```
Furto de celular
Furto de celular · CONFIRMED
RU-M9XD · confiança 57
```

**Proposta:**

```
┌──────────────────────────────────────┐
│ ████ (barra colorida categoria)      │
│                                      │
│  Furto de celular            há 2h   │
│  Centro · Av. Rio Branco             │
│                                      │
│  3 pessoas reportaram esta           │
│  ocorrência na região.               │
│                                      │
│  Confirmado pela comunidade          │
│  [████████░░] Confiança alta (80/100)│
│                                ↗ Ver │
└──────────────────────────────────────┘
   ↑ refCode visível apenas em tooltip
   no link "Ver" (acessibilidade)
```

**HTML do popup reescrito (pseudocódigo):**

```html
<div class="popup-card">
  <div class="popup-band" style="background: {categoryColor}"></div>
  <div class="popup-body">
    <div class="popup-header">
      <strong class="popup-title">{title}</strong>
      <span class="popup-time">{relTime(occurredAt)}</span>
    </div>
    <p class="popup-location">{neighborhood} · {street}</p>
    <p class="popup-social">
      {confirmations} {confirmations === 1 ? 'pessoa reportou' : 'pessoas reportaram'} esta
      ocorrência na região.
    </p>
    <div class="popup-status">
      <span class="status-icon">✓</span>
      <span>{statusLabel}</span>
    </div>
    <div class="popup-trust">
      <div class="trust-bar" style="width: {trustScore}%"></div>
      <span>{trustLabel} ({trustScore}/100)</span>
    </div>
  </div>
</div>
```

---

### COMPONENTE C — Legenda do Mapa (expandida)

**Hoje:**

```
LEGENDA
[████████] Densidade de risco
Clique no mapa para ver a ocorrência mais próxima.
```

**Proposta:**

```
┌──────────────────────────────────┐
│ LEGENDA                          │
│                                  │
│  Intensidade de ocorrências      │
│  [verde] baixa  ··  [vermelho] alta
│  [░░░░░░░░░░░░░░░░░] gradiente   │
│                                  │
│  Tipos de ocorrência             │
│  [■] Furto / Roubo               │
│  [■] Violência                   │
│  [■] Acidente de trânsito        │
│  [■] Abandono / Infraestrutura   │
│  [■] Outros                      │
│                                  │
│  Clique em um pin para detalhes. │
└──────────────────────────────────┘
```

**Comportamento:**

- Legenda recolhível em mobile (botão `▾ Legenda`).
- Os pins de categoria devem ter a mesma cor e forma que aparece no mapa.
- "Clique em um pin" substitui "Clique no mapa" — é mais preciso.

---

### COMPONENTE D — Painel de Filtros (estilo Waze)

**Trigger:** botão "Filtros" na barra superior (substituir ou complementar "Camadas").

**Layout do painel de filtros:**

```
┌──────────────────────────────────────────────┐
│  FILTROS                             [X fechar]
│                                              │
│  Período                                     │
│  ○ Última hora  ● Últimas 24h  ○ 7 dias      │
│                                              │
│  Categorias (mostrar/ocultar)               │
│  [✓] Furto / Roubo          [■ laranja]     │
│  [✓] Violência              [■ vermelho]    │
│  [✓] Acidente de trânsito   [■ azul]        │
│  [✓] Infraestrutura         [■ cinza]       │
│  [ ] Outros                 [■ cinza claro] │
│                                              │
│  Nível de confiança mínimo                  │
│  [░░░░░░░░░░░░░░] ≥ 30%  (slider)          │
│                                              │
│  [Salvar como padrão]   [Aplicar filtros]   │
└──────────────────────────────────────────────┘
```

**Comportamento:**

- Filtros são aplicados via parâmetros na URL (`?categories=furto,violencia&period=24h&minTrust=30`).
- "Salvar como padrão" persiste em `localStorage` ou na sessão do usuário autenticado.
- Ao fechar o painel, os filtros ativos ficam resumidos na barra superior:
  ```
  [Últimas 24h ▾] [3 categorias ▾] [Confiança ≥30% ×]
  ```
  Cada badge tem `×` para remover rapidamente.

---

### COMPONENTE E — Campo de Busca com Autocomplete

**Hoje:** campo decorativo sem handler.

**Proposta:**

```
┌─────────────────────────────────────────────┐
│  ⌕  Buscar bairro, rua ou ocorrência…       │
├─────────────────────────────────────────────┤
│  BAIRROS                                    │
│  📍 Centro                                  │
│  📍 Copacabana                              │
│                                             │
│  TIPOS DE OCORRÊNCIA                        │
│  🔶 Furto de celular (23 hoje)              │
│  🔶 Roubo de veículo (7 hoje)               │
│                                             │
│  RUAS                                       │
│  📍 Av. Rio Branco, Centro                  │
└─────────────────────────────────────────────┘
```

**Comportamento:**

- Debounce de 300ms no `onChange`.
- API: `GET /api/search?q={query}` retorna `{ neighborhoods, categories, streets }`.
- Ao selecionar bairro: mapa centraliza e aplica filtro de bbox.
- Ao selecionar categoria: ativa filtro de categoria automaticamente.
- Ao selecionar rua: mapa centraliza na rua e mostra pins da área.
- Campo limpa ao pressionar `Esc`.

---

## 4. REESCRITA DO SIGNIFICADO DE "CONFIANÇA"

**Hoje (técnico):** `confiança 57`

**O que significa "confiança"** em linguagem humana:

A confiança de uma ocorrência reflete o quão verificada ela é pela comunidade. É calculada com base em três fatores: quantas pessoas reportaram o mesmo tipo de evento na mesma área, se moradores próximos confirmaram o relato e se a descrição é consistente com outros reports recentes.

**Como exibir para o usuário:**

```
Confiança alta — várias pessoas da região confirmaram.
Confiança média — poucos relatos, mas consistentes.
Confiança baixa — um único report, ainda não verificado.
```

**Nunca exibir:** "confiança 57" ou "trustScore: 0.57" — esses números não têm significado intuitivo.

**Regra de tradução:**

| Score  | Rótulo                     | Mensagem contextual                    |
| ------ | -------------------------- | -------------------------------------- |
| 80–100 | Confiança alta             | Confirmado por múltiplos moradores.    |
| 60–79  | Confirmado pela comunidade | Reportado e confirmado na região.      |
| 30–59  | Poucos relatos             | Use com cautela — poucos reports.      |
| 0–29   | Não verificado             | Apenas 1 report. Pode não ser preciso. |

A barra visual de confiança pode exibir o número entre parênteses como detalhe acessível (`aria-label="Confiança: 57 de 100"`), mas o rótulo verbal é sempre a informação principal.

---

## 5. PRIORIZAÇÃO

### ALTA — Corrigir antes de qualquer release público

| ID     | Item                          | Motivo                                                  |
| ------ | ----------------------------- | ------------------------------------------------------- |
| BUG-01 | Legenda sem rótulos           | Mapa ilegível sem referência de escala                  |
| BUG-02 | Popup com copy técnico        | Primeira impressão do usuário é este popup              |
| BUG-03 | Cartão lateral com status raw | Aparece em loop no feed — degradação constante          |
| BUG-04 | Busca inoperante              | Feature prometida que não funciona                      |
| MUX-01 | Confiança em linguagem humana | Palavra "confiança 57" gera desconfiança, não confiança |
| MUX-02 | Cartão com hierarquia humana  | UX central do produto                                   |
| MUX-03 | Filtros de categoria          | Funcionalidade core para uso diário                     |

### MÉDIA — Sprint seguinte

| ID     | Item                             | Motivo                                            |
| ------ | -------------------------------- | ------------------------------------------------- |
| BUG-05 | Filtro de tempo funcional        | Existe na UI, frustra o usuário por não funcionar |
| BUG-07 | Legenda sem pins de categoria    | Mapa fica com elementos inexplicados              |
| BUG-08 | Popup sem data/hora              | Dado disponível no tipo mas não exibido           |
| MUX-05 | Busca com autocomplete           | Melhora navegação mas exige backend novo          |
| MUX-06 | Status em português              | Polimento linguístico necessário                  |
| MUX-04 | Legenda expandida com categorias | Educação do usuário sobre o mapa                  |

### BAIXA — Backlog

| ID     | Item                           | Motivo                              |
| ------ | ------------------------------ | ----------------------------------- |
| BUG-06 | KPI de bairros tautológico     | Visual correto mas dado sem valor   |
| MUX-07 | KPI de bairros contextualizado | Melhora painel mas não é bloqueante |

---

## 6. OBSERVAÇÕES DE ARQUITETURA

1. **Campo `confirmations` ausente no tipo `RecentIncident`** — o componente de cartão humano exige esse campo (`"Reportado por 3 pessoas"`). A API `/api/incidents/recent` precisa incluí-lo.

2. **Campo `neighborhood` ausente no tipo `RecentIncident`** — necessário para exibir localização no cartão e popup.

3. **`statusLabel` deve ser gerado no servidor** — não confiar que o cliente traduza status. O ideal é a API retornar já o rótulo em português, ou o cliente usar um mapa de tradução centralizado (um único `STATUS_LABELS` exportado de `lib/labels.ts`).

4. **`buildPopupHTML` usa concatenação de strings** — adequado para o MapLibre (que exige HTML string), mas propenso a bugs de escape. A função `escapeHtml` existe e está sendo usada — manter. Ao adicionar novos campos, garantir que todos passem por `escapeHtml`.

5. **Filtros via URL params** — a abordagem de persistir filtros em query string (`?categories=furto&period=24h`) permite compartilhar links filtrados e é compatível com a arquitetura Next.js App Router existente.
