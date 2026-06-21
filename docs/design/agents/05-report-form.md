# Agente 05 — Formulário de Report de Ocorrências

> Documento de design: copy, wireframes ASCII, fluxo completo, modelo de dados, arquitetura de backend.
> Stack: Next.js 15 (App Router) + Tailwind + MapLibre + Postgres/PostGIS (Drizzle) + Auth.js.

---

## 1. Princípios de design

- **Velocidade acima de tudo.** Um report deve ser possível em menos de 30 segundos, como no Waze.
- **Sem formulários longos.** Máximo 3 campos obrigatórios: tipo, localização e "foi agora ou antes". Todo o resto é opcional e progressivo.
- **Anonimato é opt-in, não default.** O usuário escolhe de forma explícita, com uma explicação humana do que muda.
- **Sem sensacionalismo.** Linguagem neutra, factual. Nada de ícones de caveira, alertas vermelhos piscando ou textos em maiúsculas.
- **Privacidade por design.** Nenhum dado pessoal identificável é exibido publicamente quando o usuário escolhe anonimato.

---

## 2. Mapeamento de tipos para categorias reais

A interface agrupa as categorias do `packages/core/src/categories.ts` em tipos compreensíveis para o cidadão. O mapeamento para `CategorySlug` é transparente ao usuário.

| Rótulo na interface     | CategorySlug(s) selecionável(is)                                                                       | Grupo            |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ---------------- |
| Roubo / Assalto         | `assalto-mao-armada`, `tentativa-assalto`, `arrastao`, `roubo-celular`, `roubo-veiculo`, `roubo-carga` | patrimonio       |
| Furto (sem violência)   | `furto-celular`, `furto-veiculo`                                                                       | patrimonio       |
| Golpe / Fraude          | `golpe`                                                                                                | patrimonio       |
| Tiro / Confronto        | `disparo-arma`, `tiroteio`, `confronto-policial`                                                       | violencia_armada |
| Violência contra pessoa | `sequestro-relampago`, `violencia-contra-mulher`, `assedio`                                            | pessoa           |
| Acidente / Via          | `area-alagada`, `via-interditada`                                                                      | mobilidade       |
| Vandalismo              | `vandalismo`                                                                                           | mobilidade       |
| Suspeita / Outro        | `outro`                                                                                                | outros           |

**Fluxo de seleção em 2 níveis:** o usuário escolhe o tipo genérico (ex.: "Roubo / Assalto") e, se o tipo tiver mais de uma slug, um segundo passo rápido afina (ex.: "Foi à mão armada?" → `assalto-mao-armada` vs `tentativa-assalto`).

---

## 3. Wireframes ASCII — Fluxo passo a passo

### 3.1 Ponto de entrada — botão flutuante no mapa

```
┌─────────────────────────────────────────────────┐
│  [MAPA MapLibre — tela cheia]                   │
│                                                 │
│                          ╔═══════════════════╗  │
│                          ║  + Reportar algo  ║  │
│                          ╚═══════════════════╝  │
│                                   ↑             │
│                       Botão fixo, canto inf.    │
│                       direito, sempre visível.  │
└─────────────────────────────────────────────────┘
```

Ao tocar/clicar em **+ Reportar algo**, abre um bottom sheet (mobile) ou modal lateral (desktop).

---

### 3.2 Passo 1 — Tipo de ocorrência

```
┌─────────────────────────────────────────────────┐
│  ←  O que aconteceu?                            │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  📵 Roubo /  │  │  🤏 Furto    │            │
│  │   Assalto    │  │  sem violên. │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  ⚠️ Golpe /  │  │  🔫 Tiro /   │            │
│  │   Fraude     │  │  Confronto   │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  🚧 Acidente │  │  🎨 Vanda-   │            │
│  │  / Via       │  │  lismo       │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  👤 Violênc. │  │  ❓ Suspeita │            │
│  │  c/ pessoa   │  │  / Outro     │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Grid 2 colunas, touch-friendly (min 48px de altura).
- Seleção por toque acende o card (cor da categoria, sem piscar).
- Após selecionar tipo com múltiplas slugs → Passo 1b; caso contrário → Passo 2.

---

### 3.3 Passo 1b — Refinamento (somente quando necessário)

Exemplo: usuário escolheu "Roubo / Assalto".

```
┌─────────────────────────────────────────────────┐
│  ←  Como foi?                                   │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ○  À mão armada                               │
│  ○  Com violência física (sem arma)            │
│  ○  Tentativa (não consumada)                  │
│  ○  Arrastão (várias vítimas)                  │
│  ○  Roubaram celular                           │
│  ○  Roubaram veículo                           │
│  ○  Roubaram carga / entrega                   │
│                                                 │
│                          [Continuar →]          │
└─────────────────────────────────────────────────┘
```

- Máximo 7 opções por tipo. Radio list simples.
- "Continuar" só habilita após seleção.

---

### 3.4 Passo 2 — Localização

```
┌─────────────────────────────────────────────────┐
│  ←  Onde aconteceu?                             │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  [MINI-MAPA — pino arrastável]            │  │
│  │                                           │  │
│  │            📍                             │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ● Usar minha localização atual  ← default     │
│  ○ Ajustar no mapa                             │
│  ○ Digitar endereço                            │
│                                                 │
│  Bairro detectado: Copacabana                   │
│  (calculado automaticamente pelo PostGIS)       │
│                                                 │
│                          [Continuar →]          │
└─────────────────────────────────────────────────┘
```

- Ao abrir, tenta `navigator.geolocation` com timeout de 5 s.
- Se negado ou timeout → mostra centro do bairro do último report do usuário (fallback: centro do RJ).
- O pino é arrastável para ajuste fino; coordenadas atualizam em tempo real.
- Bairro é resolvido client-side via reverse-geocoding rápido (chamada a `/api/neighborhoods/point?lat=&lng=`) — exibido como confirmação visual, não campo editável.

---

### 3.5 Passo 3 — Quando aconteceu

```
┌─────────────────────────────────────────────────┐
│  ←  Quando foi?                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ● Agora (nos últimos 30 min)     ← default    │
│  ○ Hoje mais cedo                              │
│  ○ Ontem                                       │
│  ○ Outra data  [____/____/______]              │
│                                                 │
│  Se souber a hora aproximada:                   │
│  [Hora] ____:____  (opcional)                  │
│                                                 │
│                          [Continuar →]          │
└─────────────────────────────────────────────────┘
```

- "Agora" preenche `occurredAt = new Date()`.
- "Hoje mais cedo" abre um seletor de hora simples.
- "Outra data" abre um date-picker nativo (`<input type="date">`).
- Reports com `occurredAt` > 7 dias no passado recebem um aviso: _"Reports históricos têm menor impacto no mapa ao vivo, mas ajudam no histórico do bairro."_

---

### 3.6 Passo 4 — Detalhes opcionais

```
┌─────────────────────────────────────────────────┐
│  ←  Mais detalhes (opcional)                    │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Descreva o que viu                             │
│  ┌───────────────────────────────────────────┐  │
│  │  Ex.: "Dois homens em moto, sentido norte" │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│  Máx. 500 caracteres          [  0 / 500  ]    │
│                                                 │
│  ┌────────────────────────────────────────┐    │
│  │  📷  Adicionar foto (opcional)          │    │
│  └────────────────────────────────────────┘    │
│  Fotos aumentam o score de confiança.           │
│  Rostos e placas são ocultados automaticam.     │
│                                                 │
│  Isso já aconteceu aqui antes?                  │
│  ○ Não sei   ● Parece que sim   ○ Com certeza   │
│                                                 │
│                          [Continuar →]          │
└─────────────────────────────────────────────────┘
```

- Textarea livre com limite de 500 chars. Sem campo "título" exposto ao usuário — o título é gerado automaticamente pelo backend (ver seção 7).
- Upload de foto: aceita JPEG/PNG/HEIC, máx. 10 MB por arquivo, máx. 3 fotos.
- **Aviso sobre fotos:** texto explícito de que a imagem pode ser vista por moderadores e outros usuários. Blur de rostos/placas é sugerido mas não obrigatório (processamento pós-upload via worker).
- Campo de recorrência mapeia para `recurrenceCount` no cálculo de trust score.

---

### 3.7 Passo 5 — Confirmação e privacidade

```
┌─────────────────────────────────────────────────┐
│  ←  Antes de enviar                             │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Roubo de celular · Copacabana            │  │
│  │  Agora · com foto                         │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Quem vai ver que foi você?                     │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  ● Identificado  (maior confiança)        │  │
│  │    Seu nome aparece só para moderadores.  │  │
│  │    No feed: "Confirmado pela comunidade"  │  │
│  │                                           │  │
│  │  ○ Anônimo                                │  │
│  │    Nenhum dado seu é armazenado com       │  │
│  │    o report. Menos peso no score.         │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Ao enviar, você concorda com os Termos de      │
│  Uso. Não é boletim de ocorrência.              │
│                                                 │
│           [Enviar report]                       │
└─────────────────────────────────────────────────┘
```

- Default: **identificado** (linkado à sessão Auth.js). Isso é mais honesto — o usuário está logado.
- Se escolher anônimo: `anonymous: true` na payload. O `authorId` ainda é gravado no banco (necessário para auditoria e rate limit), mas **não é retornado em nenhuma API pública** e não influencia exibição no feed.
- Linguagem direta: "Não é boletim de ocorrência" evita mal-entendido legal.

---

### 3.8 Estado de envio e confirmação

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              Enviando...  ⏳                    │
│                                                 │
└─────────────────────────────────────────────────┘

        ↓ sucesso

┌─────────────────────────────────────────────────┐
│                                                 │
│        Report registrado                        │
│                                                 │
│        Código: RU-2026-A3F7                     │
│                                                 │
│  Seu report entra na fila de moderação.         │
│  Aparecerá no mapa assim que confirmado.        │
│                                                 │
│  [Ver no mapa]     [Reportar outro]             │
│                                                 │
└─────────────────────────────────────────────────┘
```

- O `refCode` (ex.: `RU-2026-A3F7`) é retornado pelo `POST /api/incidents` e exibido para o usuário guardar como referência.
- Nenhum e-mail de confirmação disparado automaticamente neste fluxo (evita fricção; moderadores recebem digest interno).

---

## 4. Estados de erro

| Situação                                         | Mensagem exibida                                                                            | Ação sugerida                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Geolocalização negada pelo browser               | "Não conseguimos sua localização. Ajuste o pino no mapa."                                   | Mostra o mapa com pino arrastável                               |
| Timeout de geolocalização (> 5 s)                | "Localização demorou. Use o mapa para marcar o ponto."                                      | Idem                                                            |
| Foto muito grande (> 10 MB)                      | "Esta foto é grande demais. Tente uma com até 10 MB."                                       | Mantém passo aberto                                             |
| Formato de foto não suportado                    | "Formato não suportado. Use JPG, PNG ou HEIC."                                              | Idem                                                            |
| Rate limit (> 10 reports/min)                    | "Você enviou muitos reports agora. Aguarde um momento."                                     | Bloqueia botão por 60 s                                         |
| Categoria inválida (slug não existe)             | "Tipo de ocorrência inválido. Volte e escolha novamente."                                   | Volta ao Passo 1                                                |
| Coordenadas fora do Rio de Janeiro               | "Localização fora da área coberta. O Radar Urbano funciona no Rio de Janeiro por enquanto." | Mantém passo 2 aberto                                           |
| Erro de rede / 500 do servidor                   | "Algo deu errado. Seu texto foi salvo. Tente novamente."                                    | Botão "Tentar novamente"; preserva rascunho no `sessionStorage` |
| Sessão expirada no meio do fluxo                 | "Sua sessão expirou. Faça login novamente — seu rascunho será recuperado."                  | Redireciona para login; rascunho em `sessionStorage`            |
| Upload de foto falhou                            | "Não conseguimos enviar a foto. O report foi salvo sem ela."                                | Report criado sem evidência; usuário pode adicionar depois      |
| Descrição com conteúdo bloqueado (spam/palavrão) | "Sua descrição foi sinalizada. Revise o texto e tente de novo."                             | Mantém campo com texto; não revela a regra de bloqueio          |

---

## 5. Ajustes no modelo de dados

O schema atual (`packages/db/src/schema.ts`) já suporta o fluxo. Os ajustes abaixo são **adicionais**, sinalizados como opcionais ou recomendados.

### 5.1 Tabela `incidents` — campos existentes usados

```
refCode        → exibido ao usuário como código de acompanhamento
categorySlug   → preenchido pelo mapeamento de tipo → slug
sourceId       → sempre o UUID da source 'COMMUNITY' (fixo no backend)
authorId       → UUID do usuário autenticado (mesmo quando anonymous=true)
title          → gerado automaticamente (ver seção 7.1)
description    → texto livre digitado pelo usuário (Passo 4)
location       → geography(Point,4326) — lng/lat do pino
neighborhoodId → resolvido por ST_Contains no INSERT (já existente)
occurredAt     → calculado pelo Passo 3
status         → 'PENDING' na criação; moderadores avançam
trustScore     → calculado por computeTrustScore() no createIncident()
anonymous      → booleano do Passo 5
```

### 5.2 Tabela `evidence_assets` — já existente

Usada para armazenar fotos enviadas no Passo 4. Nenhuma mudança de schema necessária.

### 5.3 Campos recomendados para adicionar em `incidents`

```sql
-- Adicionar à tabela incidents:

recurrence_hint  text CHECK (recurrence_hint IN ('UNKNOWN', 'LIKELY', 'CERTAIN'))
                 DEFAULT 'UNKNOWN' NOT NULL
-- Guarda a resposta do Passo 4 ("Isso já aconteceu antes?")
-- Usado para enriquecer recurrenceCount no recompute de trustScore

client_hint      jsonb
-- Contexto do cliente: { "platform": "mobile-web" | "desktop", "appVersion": "x.y.z" }
-- Útil para debug e análise de qualidade dos reports
-- Nunca exibido publicamente
```

**Drizzle (schema.ts) — adição sugerida:**

```ts
// em incidents = pgTable('incidents', { ... })
recurrenceHint: text('recurrence_hint').notNull().default('UNKNOWN'),
clientHint: jsonb('client_hint'),
```

### 5.4 Nova tabela `report_drafts` (opcional, para recuperação de rascunho)

Se optar por persistir rascunhos no servidor (em vez de `sessionStorage`):

```sql
CREATE TABLE report_drafts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload      JSONB NOT NULL,
  step         SMALLINT NOT NULL DEFAULT 1,  -- passo atual do wizard
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON report_drafts(user_id);
```

Rascunhos são deletados após 24 h (cron job) ou ao completar o report.
**Recomendação para v1:** usar `sessionStorage` no client (mais simples, sem dados no servidor).

---

## 6. Fluxo de moderação

```
[Usuário envia] → status: PENDING
       ↓
[Queue de moderação]
  ├─ trustScore >= 50 E hasPhoto → Auto-confirmado em 15 min (CONFIRMED)
  ├─ trustScore < 20             → Auto-rejeitado silenciosamente (REJECTED)
  └─ demais                     → Fila para moderador humano
       ↓
[Moderador vê painel interno]
  - Lista PENDING ordenada por: trustScore ASC (mais dúvidosos primeiro)
  - Ações: CONFIRM / REJECT / RESOLVE / pedir mais informações
       ↓
[Ao confirmar]
  → status: CONFIRMED
  → computeTrustScore() reexecutado com confirms += 1
  → nextReputation() aplicado ao author (reputação sobe +6 * damping)
  → Notificação IN_APP ao author (se não-anônimo): "Seu report foi confirmado"
       ↓
[Ao rejeitar]
  → status: REJECTED
  → nextReputation() aplicado: reputação cai -9 * damping
  → Report sumido do mapa e do feed público
  → Notificação ao author (se não-anônimo): "Não foi possível confirmar seu report"
```

### 6.1 Regras de auto-moderação (backend)

| Condição                                                    | Ação automática                                          |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| `trustScore >= 50` E `hasPhoto = true`                      | Confirmar após 15 min se não houver disputes             |
| `trustScore < 20` (reputation baixo, sem foto, sem confirm) | Rejeitar silenciosamente; não exibir no mapa             |
| 3+ reports idênticos (mesma slug, raio 100 m, janela 1 h)   | Confirmar o mais recente; agrupar no mapa                |
| Descrição com padrão de spam (regex + lista de termos)      | Sinalizar para fila humana; não rejeitar automaticamente |
| IP/userId com > 5 reports REJECTED no último mês            | Aplicar rate limit mais restritivo (3 reports/h)         |

---

## 7. Validação anti-spam e score de confiança

### 7.1 Geração automática do `title`

O usuário não vê o campo `title`. O backend gera automaticamente:

```
"${category.label} em ${neighborhood.name}"
// Ex.: "Roubo de celular em Copacabana"
// Ex.: "Disparo de arma de fogo em Madureira"
```

Isso garante consistência e evita conteúdo inadequado no campo mais visível do feed.

### 7.2 Validações de entrada no `POST /api/incidents`

```
categorySlug   → deve existir em CATEGORIES (já validado por getCategory())
lng / lat      → ambos finitos; lat ∈ [-23.1, -22.6]; lng ∈ [-43.8, -43.0] (bounding box RJ)
description    → se presente: trim, máx 500 chars, sanitize HTML (strip tags)
occurredAt     → deve ser ≤ now(); deve ser > (now() - 365 days)
anonymous      → boolean coercido; default false
recurrenceHint → enum UNKNOWN | LIKELY | CERTAIN
```

### 7.3 Trust score na criação

O `computeTrustScore()` já existe em `packages/core/src/trust-score.ts`. Na criação:

```ts
computeTrustScore({
  sourceKind: 'COMMUNITY',
  confirms: 0,
  disputes: 0,
  authorReputation: session.user.reputation, // puxar do banco (hoje fixo em 0)
  hasPhoto: evidenceAssets.length > 0,
  hasVideo: false,
  recurrenceCount: recurrenceCount, // contagem de incidents similares nos últimos 7 dias / 500 m
});
```

**Ajuste necessário:** o `createIncident()` atual passa `authorReputation: 0` fixo. Deve ser substituído pela reputação real do usuário:

```ts
// Buscar antes do insert:
const [user] = await db
  .select({ reputation: users.reputation })
  .from(users)
  .where(eq(users.id, input.authorId));
const authorReputation = user?.reputation ?? 50;
```

### 7.4 Anti-spam — camadas

1. **Rate limit por usuário:** já implementado em `rateLimit('report:{userId}', 10, 60)`. Retorna 429.
2. **Rate limit por IP:** adicionar `rateLimit('report-ip:{ip}', 20, 60)` para cobrir múltiplas contas do mesmo IP.
3. **Deduplicação geoespacial:** antes do INSERT, verificar se existe incident com mesma `categorySlug`, ponto dentro de raio 50 m, e `occurredAt` nos últimos 30 min pelo mesmo `authorId`. Se sim, retornar 409 com `{ error: "Você já reportou algo parecido neste local.", existingId }`.
4. **Sanitização de texto:** remover HTML e URLs da `description` antes de salvar.
5. **Lista de termos bloqueados:** comparação simples (regex) server-side; sinaliza para moderação manual (não bloqueia automaticamente para evitar falsos positivos).
6. **Score de reputação do autor:** usuários com reputação < 20 têm reports marcados automaticamente para revisão humana.

---

## 8. Upload de fotos — arquitetura

```
[Client]
   │  1. Usuário seleciona foto (Passo 4)
   │  2. Client faz POST /api/incidents/upload-evidence
   │     multipart/form-data: { file, contentType }
   ▼
[POST /api/incidents/upload-evidence]
   │  3. Valida: autenticado, mime ∈ [image/jpeg, image/png, image/heif]
   │  4. Valida: tamanho ≤ 10 MB
   │  5. Gera presigned URL para bucket S3/R2 (ou salva em /uploads se auto-hospedado)
   │  6. Retorna { uploadUrl, assetId }
   ▼
[Client]
   │  7. PUT direto no bucket com a foto (sem passar pelo Next.js)
   │  8. Guarda assetId no estado local do wizard
   ▼
[POST /api/incidents] (Passo 5 — Enviar report)
   │  9. Payload inclui assetIds[]
   │  10. Backend registra incident e insere linhas em evidence_assets
   │      linking incidentId + assetId
   ▼
[Worker assíncrono — opcional v1.1]
   │  11. Blur de rostos/placas via API de visão (ex.: AWS Rekognition / self-hosted)
   │  12. Atualiza URL com versão processada
```

**Para v1 (MVP):** upload direto para `/public/uploads` local com `formidable` ou Next.js `FormData`. Sem processamento de blur — adicionar aviso ao usuário ("Evite incluir rostos e placas.").

---

## 9. Privacidade e LGPD

| Dado                       | Onde vai                | Visibilidade pública                                | Base legal (LGPD)                         |
| -------------------------- | ----------------------- | --------------------------------------------------- | ----------------------------------------- |
| `authorId`                 | `incidents.author_id`   | Nunca                                               | Legítimo interesse (auditoria, segurança) |
| Nome do usuário            | `users.name`            | Nunca (em reports)                                  | —                                         |
| Coordenadas exatas         | `incidents.location`    | Arredondadas ±100 m na API pública                  | Consentimento (terms of use)              |
| Foto enviada               | `evidence_assets.url`   | Visível para moderadores e após confirmação no feed | Consentimento explícito no passo 4        |
| `anonymous: true`          | `incidents.anonymous`   | Feed exibe "Relatado anonimamente"                  | Consentimento                             |
| IP do request              | `access_logs.ip`        | Nunca                                               | Legítimo interesse (segurança)            |
| `client_hint` (plataforma) | `incidents.client_hint` | Nunca                                               | Legítimo interesse                        |

**Arredondamento de coordenadas:** a API pública (`/api/incidents/recent`, `/api/incidents/near`) deve retornar `lng` e `lat` com no máximo 3 casas decimais (~111 m de precisão) para não revelar endereços exatos.

**Direito de exclusão (LGPD Art. 18):** ao deletar conta, `incidents.author_id` vira `NULL` (já tratado pelo `ON DELETE SET NULL` implícito — verificar se o schema atual tem). Reports permanecem (dado comunitário), mas desvinculados do usuário.

---

## 10. Integração com `POST /api/incidents` — payload final

```jsonc
// POST /api/incidents
{
  "categorySlug": "roubo-celular",
  "sourceId": "uuid-da-source-COMMUNITY", // fixo; injetado pelo backend a partir de env var SOURCE_COMMUNITY_ID
  "lng": -43.1823,
  "lat": -22.9871,
  "occurredAt": "2026-06-21T14:30:00-03:00",
  "anonymous": false,
  "description": "Dois homens em moto, sentido norte.",
  "recurrenceHint": "LIKELY", // novo campo (seção 5.3)
  "assetIds": ["uuid-foto-1"], // evidências pré-uploadadas
}
```

**Resposta de sucesso (201):**

```jsonc
{
  "id": "uuid-do-incident",
  "refCode": "RU-2026-A3F7",
}
```

---

## 11. Sugestões de backend para próximas iterações

1. **Reputação real do autor no `createIncident`:** substituir `authorReputation: 0` pela leitura de `users.reputation` (ver seção 7.3).
2. **Contagem de recorrência real:** antes do INSERT, fazer `COUNT(*) FROM incidents WHERE categorySlug = $1 AND ST_DWithin(location, $point, 500) AND occurredAt > now() - interval '7 days'` e passar como `recurrenceCount` para `computeTrustScore()`.
3. **Source COMMUNITY como constante de ambiente:** `SOURCE_COMMUNITY_ID` deve ser uma env var ou seed registrado, não hardcoded na rota.
4. **Coordenadas dentro do bounding box do RJ:** validar `lat ∈ [-23.1, -22.6]` e `lng ∈ [-43.8, -43.0]` no `POST /api/incidents`, retornando 422 com mensagem clara.
5. **API de bairro por ponto:** criar `GET /api/neighborhoods/point?lat=&lng=` que faz `SELECT name FROM neighborhoods WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($lng,$lat),4326)) LIMIT 1` — usado no Passo 2 para exibir o bairro detectado ao usuário.
6. **Deduplicação:** implementar a checagem de duplicate antes do INSERT (ver seção 7.4).
7. **Worker de moderação assíncrona:** usar `pg_notify` ou uma fila (BullMQ/Redis) para processar auto-confirmações e atualizar trust score após confirmações da comunidade.
8. **Blur de fotos (v1.1):** integrar um worker que processa evidências novas e aplica blur em rostos/placas antes de tornar a URL pública.

---

## 12. Componentes de interface (Next.js / Tailwind)

| Componente           | Localização sugerida                   | Responsabilidade                                |
| -------------------- | -------------------------------------- | ----------------------------------------------- |
| `<ReportButton />`   | `components/map/ReportButton.tsx`      | Botão flutuante no mapa                         |
| `<ReportDrawer />`   | `components/report/ReportDrawer.tsx`   | Container do bottom sheet / modal               |
| `<StepTypeSelect />` | `components/report/StepTypeSelect.tsx` | Passo 1 — grid de tipos                         |
| `<StepTypeRefine />` | `components/report/StepTypeRefine.tsx` | Passo 1b — refinamento de slug                  |
| `<StepLocation />`   | `components/report/StepLocation.tsx`   | Passo 2 — mini-mapa + opções                    |
| `<StepWhen />`       | `components/report/StepWhen.tsx`       | Passo 3 — quando aconteceu                      |
| `<StepDetails />`    | `components/report/StepDetails.tsx`    | Passo 4 — descrição + foto                      |
| `<StepConfirm />`    | `components/report/StepConfirm.tsx`    | Passo 5 — revisão + anônimo                     |
| `<ReportSuccess />`  | `components/report/ReportSuccess.tsx`  | Tela de confirmação + refCode                   |
| `useReportForm`      | `hooks/useReportForm.ts`               | Estado global do wizard (Zustand ou useReducer) |
| `useGeolocation`     | `hooks/useGeolocation.ts`              | Wrapper de `navigator.geolocation` com timeout  |

---

## 13. Acessibilidade e UX mobile

- Todos os cards do Passo 1 têm `role="button"` e `tabIndex={0}` com suporte a `Enter`/`Space`.
- Bottom sheet tem `aria-modal="true"` e foco preso (focus trap) enquanto aberto.
- Contraste mínimo 4.5:1 em todos os textos sobre fundos coloridos.
- Textos de ajuda (`aria-describedby`) em cada campo.
- Bottom sheet ocupa 90vh em mobile; desabilita scroll da página por baixo.
- Indicador de progresso: barra sutil no topo (`Passo 2 de 5`) sem numeração agressiva.
- Botão "Voltar" em todos os passos; dados preenchidos são preservados.

---

_Documento gerado por Agente 05 do Radar Urbano. Não contém código de aplicação — apenas especificação de design e arquitetura._
