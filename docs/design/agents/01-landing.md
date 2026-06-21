# Agente 01 — Reconstrução da Landing Page

**Radar Urbano · Rio de Janeiro · Jun 2026**

---

## 1. Premissas de tom e posicionamento

- **Humano, próximo, confiável.** Fala com alguém que mora na cidade, não com um "usuário".
- **Sem sensacionalismo.** Nunca usar vermelho como sinal de alarme, palavras como "perigo" no hero, contadores de crime piscando ou qualquer recurso que gere ansiedade.
- **Transparência radical.** Se o dado vem de relato comunitário, dizemos isso. Se é da SSP, dizemos isso. Se ainda não temos cobertura num bairro, também dizemos.
- **Open source visível, não escondido.** O repositório é mencionado na landing, não só no rodapé.
- **Referências de tom aprovadas:** Waze (utilidade prática, linguagem direta), Nubank (confiança sem burocracia), Airbnb (comunidade real), Neon (leveza + clareza financeira).

---

## 2. Estrutura e ordem das seções

```
[01] NAV           — barra de navegação fixa
[02] HERO          — proposta de valor + CTA principal
[03] COMO FUNCIONA — 3 passos simples
[04] O QUE VOCÊ VÊ — casos de uso reais (bairros do RJ)
[05] DADOS E TRANSPARÊNCIA — fontes, moderação, open source
[06] COMUNIDADE    — pessoas ajudam pessoas
[07] OPEN SOURCE   — contribuir com o código
[08] CTA FINAL     — chamada para entrar
[09] RODAPÉ        — links, licença, repositório
```

---

## 3. Tokens do design system utilizados

| Token            | Valor          | Uso                                      |
| ---------------- | -------------- | ---------------------------------------- |
| `--cor-petroleo` | `#0E5C63`      | Links, bordas de destaque, ícones ativos |
| `--cor-verde`    | `#3FB6A8`      | CTAs primários, badges de status         |
| `--cor-fundo`    | `#ECE8DF`      | Background geral (areia)                 |
| `--cor-escura`   | `#11181F`      | Hero dark, navbar                        |
| `--cor-texto`    | `#3A434C`      | Corpo de texto                           |
| `--cor-sutil`    | `#9AA4AE`      | Labels, metadados                        |
| `--cor-ouro`     | `#E0A93B`      | Pins de incidente no mapa                |
| `--fonte-mono`   | IBM Plex Mono  | Labels, badges, números                  |
| `--fonte-sans`   | IBM Plex Sans  | Corpo, navegação, UI                     |
| `--fonte-serif`  | IBM Plex Serif | Títulos editoriais de seção              |

---

## 4. Seção por seção

---

### [01] NAV — Barra de Navegação

**Comportamento:** fixa no topo, fundo `#11181F` com leve blur. Desaparece no scroll para cima, reaparece no scroll para baixo.

**Wireframe:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ◉ RADAR URBANO   │  Como funciona  Comunidade  Open Source  │  [Entrar]  [Criar conta →]  │
└─────────────────────────────────────────────────────────────────┘
```

**Especificações:**

- Logo: SVG do radar sweep + wordmark `RADAR` branco / `URBANO` em `#3FB6A8`, fonte IBM Plex Mono, caixa-alta, letter-spacing 0.14em
- Links internos: IBM Plex Sans 14px, cor `#9AA4AE`, hover `#F4F1EA`
- Botão "Entrar": ghost, borda `#2B343D`, hover fundo `#2B343D`
- Botão "Criar conta →": fundo `#3FB6A8`, texto `#11181F`, font-weight 600, border-radius 6px

**Copy:**

- Links: `Como funciona` · `Comunidade` · `Open Source`
- Mobile: colapsa em menu hambúrguer; "Criar conta" permanece visível

---

### [02] HERO — Proposta de valor

**Fundo:** `#11181F` com grid de pontos sutis (como o design system), radar SVG animado flutuando à direita em desktop.

**Wireframe desktop:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  [label mono: RIO DE JANEIRO · BETA]                                 │
│                                                                      │
│  Saiba o que está acontecendo                     ╭─────────────╮   │
│  ao seu redor antes de sair.                      │  [RADAR SVG │   │
│                                                   │   animado]  │   │
│  Relatos de quem mora lá. Dados públicos.         ╰─────────────╯   │
│  Tudo junto, num só lugar.                                           │
│                                                                      │
│  [◉ Acessar o mapa — gratuito]   [Ver como funciona ↓]              │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  ✓ Sem anúncios   ✓ Open source   ✓ Dados verificados               │
└──────────────────────────────────────────────────────────────────────┘
```

**Copy completo:**

```
[label]  RIO DE JANEIRO · BETA

[h1]  Saiba o que está acontecendo
      ao seu redor antes de sair.

[subtítulo]
A vizinhança avisa. Os dados públicos confirmam.
O Radar Urbano reúne tudo numa plataforma aberta e gratuita
para quem quer se movimentar pela cidade com mais informação.

[CTA primário]  ◉ Acessar o mapa — é gratuito

[CTA secundário]  Ver como funciona ↓

[trust strip]
✓ Sem anúncios   ✓ Código aberto   ✓ Dados verificados   ✓ Feito pela comunidade
```

**Tipografia:**

- `[h1]` IBM Plex Serif, font-weight 500, 72px desktop / 40px mobile, cor `#F4F1EA`, line-height 0.98
- `[subtítulo]` IBM Plex Sans, 20px, cor `#C8CDD2`, max-width 38em
- `[label]` IBM Plex Mono, 12px, letter-spacing 0.2em, cor `#3FB6A8`
- `[trust strip]` IBM Plex Mono, 12px, cor `#5A6470`, separados por `·`

**Ilustração / visual:**

- Radar SVG animado (varredura rotativa em CSS, como definido no design system: `@keyframes ru-sweep`)
- Dois ou três pings pulsando (amarelo `#E0A93B` e verde `#3FB6A8`), representando relatos em bairros reais
- Grid de pontos no fundo (background-image com gradientes sutis)
- Mobile: radar menor centralizado acima do copy

---

### [03] COMO FUNCIONA — 3 passos

**Fundo:** `#ECE8DF` (areia)

**Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [label]  COMO FUNCIONA                                      │
│  [h2]  Três passos. Nada mais.                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  [ícone 1]   │  │  [ícone 2]   │  │  [ícone 3]   │       │
│  │              │  │              │  │              │       │
│  │ 01           │  │ 02           │  │ 03           │       │
│  │ Alguém       │  │ Cruzamos com │  │ Você e toda  │       │
│  │ da sua       │  │ dados        │  │ a comunidade │       │
│  │ vizinhança   │  │ públicos     │  │ ficam        │       │
│  │ reporta.     │  │ verificados. │  │ informados.  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Copy:**

```
[label]  COMO FUNCIONA

[h2]  Três passos. Nada mais.

──────────────────────────────────────────

[Passo 01]
[ícone: silhueta de pessoa com balão de fala + pin]
A comunidade reporta

Alguém que mora ou trabalha no bairro viu algo e registrou
no app: um acidente, uma via bloqueada, uma situação incomum.
Em segundos, o relato aparece no mapa.

──────────────────────────────────────────

[Passo 02]
[ícone: documento + lupa]
Os dados são verificados

Cruzamos o relato com fontes públicas — Secretaria de Segurança,
Waze, Defesa Civil — e aplicamos moderação da comunidade.
O que fica no mapa passou por checagem.

──────────────────────────────────────────

[Passo 03]
[ícone: ondas de sinal saindo de um ponto]
Todos ficam sabendo

Você acessa o mapa, vê o feed do seu bairro e toma decisões
mais informadas: qual caminho seguir, quando sair, o que
compartilhar com quem você gosta.
```

**Especificações visuais:**

- Três cards lado a lado em desktop, empilhados em mobile
- Cada card: fundo `#FBFAF6`, borda `#DAD5C9`, border-radius 6px, padding 28px
- Número do passo: IBM Plex Mono, 48px, cor `#DAD5C9`, alinhado à esquerda (decorativo)
- Título do passo: IBM Plex Sans, 20px, font-weight 600, cor `#11181F`
- Corpo: IBM Plex Sans, 15px, cor `#5A6470`, line-height 1.65
- Ícones: SVG monocromático, 36px, cor `#0E5C63`
- Conector entre passos (desktop): linha pontilhada `#DAD5C9` horizontal passando pelos cards

---

### [04] O QUE VOCÊ VÊ — Casos de uso reais

**Fundo:** `#FBFAF6`

**Conceito:** Mostrar situações cotidianas reais de quem mora no Rio. Não falar em "features" — falar em momentos da vida.

**Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [label]  PARA QUEM USA TODO DIA                             │
│  [h2]  Cada vez que você sai de casa.                        │
│  [corpo]  O Radar funciona nos momentos que importam.        │
│                                                              │
│  [Tab: Volta pra casa] [Escolher rota] [Meu bairro] [Hoje]  │
│                                                              │
│  ┌───────────────────────────────┐  ┌──────────────────────┐ │
│  │  [mini mapa: Tijuca / Centro] │  │  [copy do caso]      │ │
│  │  com pins e heatmap           │  │                      │ │
│  └───────────────────────────────┘  └──────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Copy dos 4 casos de uso:**

---

**[Caso 01] — Tab: "Voltando pra casa"**

```
[eyebrow]  TODA NOITE

[h3]  Antes de sair do trabalho,
      você já sabe o caminho mais tranquilo.

Veja o que está acontecendo agora nos bairros entre
você e sua casa. Relatos recentes, atualização em tempo real.
Sem precisar ligar pra ninguém.

[mini mapa sugerido: Tijuca → Centro → Maracanã com ping em Praça da Bandeira]
```

---

**[Caso 02] — Tab: "Escolhendo a rota"**

```
[eyebrow]  NA HORA DE SAIR

[h3]  Dois caminhos, informações diferentes.
      Você decide.

A Estrada dos Bandeirantes está bloqueada? Tem relato
recente na Linha Amarela? O feed do bairro conta antes
do trânsito virar problema.

[mini mapa sugerido: Barra da Tijuca com heatmap na via principal]
```

---

**[Caso 03] — Tab: "Acompanhar meu bairro"**

```
[eyebrow]  SEMPRE ATUALIZADO

[h3]  O que está acontecendo
      na sua vizinhança agora.

Ipanema, Méier, Santa Cruz, Realengo — cada bairro tem
seu próprio feed. Relatos das últimas horas, acumulados
pelos próprios moradores.

[mini mapa sugerido: Ipanema/Leblon com densidade de pins recentes]
```

---

**[Caso 04] — Tab: "Ocorrências recentes"**

```
[eyebrow]  ÚLTIMAS HORAS

[h3]  O que a comunidade registrou
      hoje na cidade.

Acidente na Presidente Vargas. Interditação em São Conrado.
Operação policial no Complexo do Alemão. Tudo com fonte,
horário e número de confirmações.

[mini mapa sugerido: visão geral do Rio com múltiplos pins em bairros distintos]
```

**Especificações visuais:**

- Tabs: IBM Plex Mono, 12px, letra-spacing 0.08em, borda-bottom ativa em `#0E5C63`
- Layout 2 colunas (60/40): mapa estático à esquerda, copy à direita
- Mapa: screenshot real (ou maquete fiel) do MapLibre com basemap Carto dark + pins + heatmap
- Badge de relato: fundo `#11181F`, texto `#3FB6A8`, monospace — ex: `● 3 relatos · há 12 min`
- Mobile: mapa em cima, copy embaixo; sem tabs, scroll vertical entre casos

---

### [05] DADOS E TRANSPARÊNCIA

**Fundo:** `#11181F` (dark)

**Conceito:** Esta seção é o "contrato de confiança". Explica de onde vêm os dados, como funcionam a moderação e por que o projeto é open source. Tom direto, sem eufemismos.

**Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│  [label: cor petroleo]  TRANSPARÊNCIA                        │
│  [h2 serif]  Você sabe exatamente de onde vem cada dado.     │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ 🔵 Dados       │  │ 🟡 Reports     │  │ 🟢 Moderação   │  │
│  │    Públicos    │  │    da          │  │    Aberta      │  │
│  │                │  │    Comunidade  │  │                │  │
│  │  SSP-RJ        │  │  Moradores,    │  │  Votação da    │  │
│  │  Defesa Civil  │  │  trabalhadores │  │  comunidade    │  │
│  │  INEA, IBGE    │  │  e passantes   │  │  + revisão     │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  │
│                                                              │
│  [callout box]  O código que roda esta plataforma é público. │
│  Qualquer pessoa pode auditar, sugerir ou contribuir.        │
│  [→ Ver no GitHub]                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Copy:**

```
[label]  TRANSPARÊNCIA

[h2]  Você sabe exatamente de onde vem cada dado.

Não trabalhamos com dados comprados, algoritmos ocultos
ou fontes anônimas que você não pode verificar.
Cada relato tem hora, bairro e número de confirmações.
Cada dado público tem a fonte referenciada.

─────────────────────────────────────────────────────────

[Card 1 — Dados Públicos]
[ícone: documento com carimbo]

Fontes oficiais

Integramos dados das secretarias de segurança do Rio,
Defesa Civil, INEA e IBGE. Quando um relato bate com
uma fonte oficial, mostramos os dois — e dizemos qual é qual.

─────────────────────────────────────────────────────────

[Card 2 — Relatos da Comunidade]
[ícone: balão de fala com localização]

A voz de quem está lá

Reports feitos por moradores, trabalhadores e passantes
da cidade. Cada um identificado por bairro, tipo e horário.
Nenhum relatório fica no mapa sem pelo menos uma confirmação.

─────────────────────────────────────────────────────────

[Card 3 — Moderação Transparente]
[ícone: checkmark com pessoas ao redor]

A comunidade modera

Relatos são avaliados por outros usuários da mesma região.
Reports repetidamente incorretos são removidos automaticamente.
O critério de moderação é público e está documentado.

─────────────────────────────────────────────────────────

[callout box — borda esquerda #3FB6A8]
O código que roda esta plataforma é completamente público.
Qualquer pessoa pode ler, auditar, sugerir melhorias ou contribuir.
Não há nada escondido aqui.

[link]  → Ver o repositório no GitHub
```

**Especificações visuais:**

- Fundo `#11181F`, texto `#C8CDD2`, títulos de card `#F4F1EA`
- Cards com borda `#2B343D`, fundo `#1B242E`, border-radius 6px
- Label da seção: IBM Plex Mono, 12px, letra-spacing 0.18em, cor `#3FB6A8`
- Callout box: borda-left 3px `#3FB6A8`, fundo `#0B1116`, padding 24px 28px
- Ícones: SVG monocromático 32px, cor `#3FB6A8`

---

### [06] COMUNIDADE — Pessoas ajudam pessoas

**Fundo:** `#ECE8DF`

**Conceito:** Mostrar o aspecto humano e cívico. Usar depoimentos curtos (ficcionais/placeholder) ou vinhetas do tipo "Fernanda, Tijuca" que expressem situações reais sem sensacionalismo.

**Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [label]  COMUNIDADE                                         │
│  [h2 serif]  Quem avisa, cuida.                              │
│                                                              │
│  [subtítulo]  O Radar só funciona porque tem gente real      │
│               reportando. Essa é a parte mais importante.    │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ [depoimento│  │ [depoimento│  │ [depoimento│             │
│  │    1]      │  │    2]      │  │    3]      │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│                                                              │
│  [stat strip]   [número] bairros cobertos no RJ              │
│                 [número] relatos este mês                    │
│                 [número] pessoas na comunidade               │
│                                                              │
│  [CTA]  Quero contribuir com um relato →                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Copy:**

```
[label]  COMUNIDADE

[h2]  Quem avisa, cuida.

Não somos uma empresa de segurança.
Não vendemos dados. Não monitoramos ninguém.
Somos uma rede de pessoas que acham que
informação compartilhada torna a cidade melhor
para todo mundo.

─────────────────────────────────────────────────────────

[Depoimento 1]
"Saí do trabalho às 22h e vi no Radar que tinha
relato de operação na Linha Vermelha. Fui pela
Avenida Brasil e cheguei em casa sem perrengue."
— Marcos, motorista, Bangu

[Depoimento 2]
"Moro no Méier há 15 anos. Agora consigo ver
o que aconteceu no bairro nas últimas horas
sem depender de grupo de WhatsApp."
— Cláudia, professora, Méier

[Depoimento 3]
"Reportei um alagamento na minha rua e em 20
minutos já tinha confirmação de outros moradores.
Parece bobagem, mas ajudou muita gente a desviar."
— Renato, Jacarepaguá

─────────────────────────────────────────────────────────

[Stat strip — números grandes, fonte mono]
[XX] bairros cobertos no Rio de Janeiro
[XX] relatos registrados este mês
[XX] pessoas contribuindo com a comunidade

[nota abaixo dos stats — texto pequeno, cor sutil]
Números atualizados automaticamente a partir do banco de dados.

─────────────────────────────────────────────────────────

[CTA suave]  Quero contribuir com um relato →
```

**Especificações visuais:**

- Cards de depoimento: fundo `#FBFAF6`, borda `#DAD5C9`, border-left 3px `#0E5C63`
- Aspas: IBM Plex Serif, 48px, cor `#DAD5C9`, decorativas
- Assinatura: IBM Plex Mono, 12px, cor `#8A857A`
- Stat strip: fundo `#11181F`, números IBM Plex Mono 56px, cor `#3FB6A8`, descrição IBM Plex Sans 14px, cor `#9AA4AE`
- CTA: texto `#0E5C63`, sem botão, link com seta — convite leve, sem pressão

---

### [07] OPEN SOURCE — Código aberto

**Fundo:** `#FBFAF6`

**Conceito:** Para quem quiser ir mais fundo: ver o código, contribuir, usar a API, abrir issue. Tom direto, para desenvolvedores e cidadãos técnicos — sem precisar ser dev para entender a proposta.

**Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [label mono]  OPEN SOURCE                                   │
│  [h2]  O código é público. O projeto é de todos.             │
│                                                              │
│  [corpo 2 colunas]                                           │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  │
│  │  Por que open source?    │  │  [bloco de código / repo │  │
│  │  [texto]                 │  │   card estilizado]       │  │
│  │                          │  │                          │  │
│  │  Como contribuir?        │  │  $ git clone ...         │  │
│  │  [lista de formas]       │  │  [estrelas, forks, etc]  │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
│                                                              │
│  [link]  → radar-urbano no GitHub                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Copy:**

```
[label]  OPEN SOURCE

[h2]  O código é público.
      O projeto é de todos.

[coluna esquerda]

Por que open source?

Porque transparência não é só sobre os dados — é sobre
como a plataforma funciona. Você pode ler o código que
processa os relatos, auditar as regras de moderação e
verificar que não coletamos mais do que o necessário.

Como contribuir:

→ Abrir uma issue com sugestão ou bug
→ Contribuir com código (Pull Request)
→ Ajudar na moderação da comunidade
→ Reportar ocorrências no seu bairro
→ Compartilhar com quem mora perto de você

─────────────────────────────────────────────────────────

[coluna direita — card estilizado de repositório]

[fundo #11181F, border #2B343D, border-radius 6px]

◉ radar-urbano / radar-urbano

Plataforma comunitária de segurança urbana.
Next.js 15 · PostGIS · MapLibre · Open Source

[badges]  MIT  ·  Next.js 15  ·  PostgreSQL

$ git clone https://github.com/radar-urbano/radar-urbano

[link botão]  → Abrir no GitHub

─────────────────────────────────────────────────────────

[nota de licença]
Licença MIT. Use, adapte e redistribua — com atribuição.
Dados de usuários nunca são compartilhados ou vendidos.
```

**Especificações visuais:**

- Layout 2 colunas em desktop (55/45), empilhado em mobile
- Card de repositório: fundo `#11181F`, fonte `IBM Plex Mono`, badges em chips `#2B343D`
- Linha de comando: IBM Plex Mono 13px, cor `#3FB6A8`, prefixo `$` em `#5A6470`
- Lista de contribuição: sem bullet points padrão, usar `→` em `#0E5C63`

---

### [08] CTA FINAL

**Fundo:** `#0E5C63` (petróleo — única seção com fundo primário saturado)

**Conceito:** Encerramento caloroso, sem pressão. Convite simples para entrar.

**Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│            [h2 serif, branco]                                │
│      A sua vizinhança já está aqui.                          │
│                                                              │
│   [subtítulo]  Crie sua conta gratuita e                     │
│   comece a ver o que está acontecendo no seu bairro.         │
│                                                              │
│          [Criar conta — é gratuito →]                        │
│                                                              │
│   [link menor]  Já tenho conta · Entrar                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Copy:**

```
[h2]
A sua vizinhança
já está aqui.

[subtítulo]
Crie sua conta gratuita e comece a ver o que
está acontecendo no seu bairro em tempo real.

[CTA principal]
◉ Criar conta — é gratuito →

[link menor]
Já tenho conta? Entrar →

[nota mínima abaixo]
Sem cobrança. Sem anúncios. Sem rastreamento além do necessário.
```

**Especificações visuais:**

- Fundo `#0E5C63`, texto `#F4F1EA`
- `h2`: IBM Plex Serif, 64px desktop / 40px mobile, font-weight 500
- Subtítulo: IBM Plex Sans, 20px, cor `rgba(244,241,234,0.8)`
- Botão: fundo `#F4F1EA`, texto `#0E5C63`, font-weight 700, padding 16px 32px, border-radius 6px, hover fundo `#ECE8DF`
- Link "Entrar": IBM Plex Sans, 15px, cor `rgba(244,241,234,0.6)`, sem botão
- Nota: IBM Plex Mono, 12px, cor `rgba(244,241,234,0.4)`
- Decoração: SVG do radar no canto (opacidade 0.08, branco) para textura sutil

---

### [09] RODAPÉ

**Fundo:** `#11181F`

**Wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│  ◉ RADAR URBANO                    Produto  Comunidade       │
│  Rio de Janeiro, Brasil            Open Source  GitHub       │
│  Licença MIT                       Privacidade  Termos       │
│                                                              │
│  © 2026 Radar Urbano · Código aberto · radar-urbano.app      │
└──────────────────────────────────────────────────────────────┘
```

**Copy:**

```
◉ RADAR URBANO
Plataforma comunitária de inteligência urbana.
Rio de Janeiro, Brasil.

Colunas de links:
  Produto: Como funciona · Feed de bairros · Mapa
  Comunidade: Reportar ocorrência · Regras · Moderação
  Projeto: Open Source · GitHub · Contribuir · Changelog

Rodapé inferior:
© 2026 Radar Urbano · Licença MIT ·
Dados de usuários nunca são vendidos ou compartilhados.
```

---

## 5. Lista completa de componentes

| Componente           | Descrição                                                            |
| -------------------- | -------------------------------------------------------------------- |
| `<NavBar>`           | Fixa, blur, logo + links + 2 CTAs                                    |
| `<HeroSection>`      | Dark, h1 serif, radar SVG animado, trust strip                       |
| `<RadarSVG>`         | Ícone animado (ru-sweep CSS), pings pulsantes (ru-ping CSS)          |
| `<TrustStrip>`       | Linha de badges mono horizontais: ✓ sem anúncios ✓ open source etc.  |
| `<StepCard>`         | Card de "como funciona" com número decorativo, ícone, título e corpo |
| `<StepConnector>`    | Linha pontilhada entre steps em desktop                              |
| `<UseCaseTab>`       | Navegação por tabs entre 4 casos de uso                              |
| `<MapPreview>`       | Screenshot estático ou iframe do mapa com pins e heatmap             |
| `<ReportBadge>`      | Badge mono: "● 3 relatos · há 12 min"                                |
| `<TransparencyCard>` | Card dark com ícone, título e corpo — fontes de dados                |
| `<CalloutBox>`       | Box com borda-left colorida, texto de destaque, link                 |
| `<TestimonialCard>`  | Card com aspas, texto, assinatura e borda-left petróleo              |
| `<StatBlock>`        | Número grande mono + descrição pequena, fundo dark                   |
| `<RepoCard>`         | Card estilizado de repositório GitHub, fundo dark, linha de terminal |
| `<CTASection>`       | Seção full-width petróleo, h2 serif, botão claro, link secundário    |
| `<Footer>`           | Grid de links, copyright, licença                                    |

---

## 6. Sugestões de ilustração e visual

| Posição        | Sugestão                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| Hero (direita) | SVG radar animado com pings nos bairros reais do Rio (Tijuca, Méier, Ipanema)          |
| Como Funciona  | Ícones monocromáticos SVG desenhados no estilo do design system (linha fina, #0E5C63)  |
| Casos de Uso   | Screenshots reais do mapa MapLibre (Carto dark) com bairros reais do RJ carregados     |
| Transparência  | Ícones de documento/checklist, sem fotografias                                         |
| Comunidade     | Nenhuma foto de rosto; usar apenas texto de depoimento — evita problema de diversidade |
| Stats          | Números em tempo real puxados da API (não estáticos no HTML)                           |
| Open Source    | Card visual de repositório, NÃO captura de tela de código real                         |
| CTA Final      | Radar SVG ghosted (opacidade 8%) como textura de fundo                                 |

---

## 7. Melhorias de UX e notas de implementação

### Fluxo de conversão

1. Hero → "Acessar o mapa" leva direto para `/auth/register` (não para uma demo wall)
2. Auth obrigatório antes de ver qualquer dado — comunica isso com transparência já no hero ("crie sua conta gratuita")
3. "Ver como funciona ↓" faz scroll suave para a seção #03 — sem nova página

### Performance

- Mapa no hero: NÃO renderizar MapLibre na landing; usar screenshot estático otimizada (WebP, ~80kb)
- Animação do radar: CSS puro (já definida no design system: `ru-sweep`, `ru-ping`), sem JavaScript
- Depoimentos: texto estático, sem carrossel com biblioteca externa

### Acessibilidade

- Contraste mínimo 4.5:1 em todos os textos (design system já garante no Petróleo)
- `aria-label` nos CTAs: "Criar conta gratuita no Radar Urbano" (não só "Criar conta")
- Mapa preview: `alt="Mapa do Rio de Janeiro com relatos recentes da comunidade"`
- Trust strip: não usar só ícone, sempre acompanhar de texto

### Mobile first

- Nav: hambúrguer com "Criar conta" sempre visível
- Hero: h1 em 40px, radar SVG centralizado acima do copy
- Casos de uso: scroll vertical em vez de tabs
- Stat strip: 1 coluna com números empilhados

### SEO / Meta

```html
<title>Radar Urbano — O que está acontecendo no seu bairro agora</title>
<meta
  name="description"
  content="Plataforma aberta de relatos comunitários e dados públicos para o Rio de Janeiro. Saiba o que está acontecendo ao seu redor antes de sair de casa."
/>
<meta property="og:image" content="/og-radar-urbano.png" />
```

---

## 8. Narrativa de storytelling (resumo editorial)

A landing deve guiar o visitante por uma jornada emocional clara:

1. **Reconhecimento** (Hero): "Esse é o meu problema — eu precisava disso."
2. **Clareza** (Como funciona): "Entendi. É simples e faz sentido."
3. **Prova** (Casos de uso): "Funciona em bairros que eu conheço."
4. **Confiança** (Transparência): "Posso confiar nessa plataforma."
5. **Pertencimento** (Comunidade): "Tem gente como eu aqui."
6. **Convite** (CTA Final): "Quero fazer parte."

Cada seção deve ter apenas **um trabalho** a fazer. Não misturar argumentos.

---

## 9. Copy de erro / estado vazio (para futuro)

Situações que a landing pode precisar comunicar:

- **Bairro sem cobertura ainda:** "Ainda não temos relatos suficientes nessa região. Seja o primeiro a contribuir."
- **Beta / limitação geográfica:** "Por enquanto, foco total no Rio de Janeiro. Outros estados em breve."
- **Autenticação necessária:** "Os dados ficam disponíveis após criar sua conta gratuita."

---

_Documento gerado para o Radar Urbano · Agente 01 · Jun 2026_
_Stack: Next.js 15 · Tailwind · IBM Plex · Design system Petróleo_
