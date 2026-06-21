# Agente 02 — Login e Cadastro

**Radar Urbano · Design de Autenticação · Jun 2026**

---

## 1. Visão geral e princípios

A autenticação é o primeiro contato real do usuário com a plataforma após a landing. É o momento em que a promessa vira produto. O design precisa:

- **Confiar primeiro.** Nada de avisos assustadores, captchas bloqueantes ou campos desnecessários. O usuário já veio com intenção.
- **Ser rápido.** Quem está em segurança pública geralmente está com pressa ou estresse. Cada campo a mais é uma barreira.
- **Manter identidade.** O visual Petróleo/Radar não some na tela de login — ela é parte do produto.
- **Não parecer vigilância.** Sem linguagem de "monitoramento", "rastreamento" ou excesso de termos legais em destaque.

### Paleta aplicada à autenticação

| Token           | Valor   | Uso                                     |
| --------------- | ------- | --------------------------------------- |
| `--petroleo`    | #0E5C63 | Botão primário, links ativos, foco      |
| `--petroleo-lt` | #3FB6A8 | Acento, ícone do logo, indicadores      |
| `--areia`       | #ECE8DF | Background da coluna esquerda (desktop) |
| `--noite`       | #11181F | Background escuro, header do painel     |
| `--paper`       | #F4F1EA | Background do formulário                |
| `--texto`       | #11181F | Texto principal                         |
| `--muted`       | #5A6470 | Labels, texto de apoio                  |
| `--borda`       | #DAD5C9 | Bordas de input, divisores              |
| `--erro`        | #A8332F | Mensagens de erro                       |
| `--sucesso`     | #3E8E7E | Confirmação, código válido              |

### Tipografia

- **Títulos de tela:** IBM Plex Serif, weight 500
- **Labels e corpo:** IBM Plex Sans, weight 400/500
- **Códigos, slugs, timestamps:** IBM Plex Mono, weight 500

---

## 2. Fluxo de autenticação (mapa de estados)

```
[ Landing / CTA ]
        │
        ├──────────────────────────────────┐
        │                                  │
   [ Entrar ]                        [ Criar conta ]
        │                                  │
   ┌────┴────┐                     ┌───────┴──────┐
   │         │                     │              │
 Google    E-mail               Google         E-mail
   │       + senha                 │           + nome
   │         │                     │           + senha
   │       (erro?)                 │              │
   │         ├── senha errada       │         [ Código enviado ]
   │         ├── e-mail não existe  │              │
   │         └── conta bloqueada    │         [ Digitar código ]
   │                               │              │
   └───────────────┬───────────────┘         (código inválido?)
                   │                              │
              [ Dashboard ]               [ Reenviar / tentar novamente ]
                                                  │
                                            [ Dashboard ]
```

**Observação:** O fluxo de recuperação de senha (esqueci a senha) é derivado do e-mail de login — não expõe se o e-mail existe ou não na base (mensagem neutra). Fora do escopo deste documento mas deve seguir o mesmo padrão visual.

---

## 3. Desktop — Layout em colunas

### 3.1 Estrutura geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VIEWPORT: min 1024px                                                       │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  COLUNA ESQUERDA  (55%)              │  COLUNA DIREITA  (45%)               │
│  bg: #11181F (noite)                 │  bg: #F4F1EA (paper)                 │
│                                      │                                      │
│  [conteúdo de marca e contexto]      │  [formulário]                        │
│                                      │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### 3.2 Wireframe — Tela de Login (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                            │
│  ┌────────────────────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │  bg: #11181F                           │  │  bg: #F4F1EA                            │  │
│  │                                        │  │                                         │  │
│  │  ┌─ logo ──────────────────────────┐   │  │  ┌─ topo ──────────────────────────┐   │  │
│  │  │  ◉ RADARURBANO                  │   │  │  │  Não tem conta? [Criar conta →]  │   │  │
│  │  └─────────────────────────────────┘   │  │  └─────────────────────────────────┘   │  │
│  │                                        │  │                                         │  │
│  │                                        │  │                                         │  │
│  │  [ilustração / mapa abstrato]          │  │  ┌─ título ────────────────────────┐   │  │
│  │                                        │  │  │  Bem-vindo de volta             │   │  │
│  │  ┌─────────────────────────────────┐   │  │  │  (IBM Plex Serif, 32px)         │   │  │
│  │  │  grade radar (svg animado)      │   │  │  └─────────────────────────────────┘   │  │
│  │  │  pings de incidentes            │   │  │  Entre para ver o que está             │  │
│  │  │  sweep animado                  │   │  │  acontecendo no seu bairro.            │  │
│  │  └─────────────────────────────────┘   │  │                                         │  │
│  │                                        │  │                                         │  │
│  │  ┌─ copy institucional ────────────┐   │  │  ┌─ botão google ──────────────────┐   │  │
│  │  │  "Informação compartilhada      │   │  │  │  [G]  Entrar com Google         │   │  │
│  │  │   pela comunidade para tornar   │   │  │  └─────────────────────────────────┘   │  │
│  │  │   a cidade mais segura."        │   │  │                                         │  │
│  │  └─────────────────────────────────┘   │  │  ── ou ──────────────────────────────  │  │
│  │                                        │  │                                         │  │
│  │  ┌─ stats / prova social ──────────┐   │  │  ┌─ campo e-mail ──────────────────┐   │  │
│  │  │  4.200 relatos  ·  92 bairros   │   │  │  │  E-mail                         │   │  │
│  │  │  última semana                  │   │  │  │  ┌───────────────────────────┐  │   │  │
│  │  └─────────────────────────────────┘   │  │  │  │ usuario@email.com         │  │   │  │
│  │                                        │  │  │  └───────────────────────────┘  │   │  │
│  │  ┌─ rodapé esq ────────────────────┐   │  │  └─────────────────────────────────┘   │  │
│  │  │  Open source  ·  Política       │   │  │                                         │  │
│  │  │  privacidade  ·  GitHub         │   │  │  ┌─ campo senha ───────────────────┐   │  │
│  │  └─────────────────────────────────┘   │  │  │  Senha                          │   │  │
│  │                                        │  │  │  ┌──────────────────────────┐   │   │  │
│  └────────────────────────────────────────┘  │  │  │ ••••••••                [👁]│   │   │  │
│                                              │  │  └──────────────────────────┘   │   │  │
│                                              │  │  └─────────────────────────────────┘   │  │
│                                              │  │                                         │  │
│                                              │  │  [Esqueci a senha]         (link muted) │  │
│                                              │  │                                         │  │
│                                              │  │  ┌─ botão primário ────────────────┐   │  │
│                                              │  │  │        Entrar →                 │   │  │
│                                              │  │  │  (bg: #0E5C63, text: #F4F1EA)   │   │  │
│                                              │  │  └─────────────────────────────────┘   │  │
│                                              │  │                                         │  │
│                                              │  └─────────────────────────────────────┘  │  │
│                                              └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Wireframe — Cadastro Passo 1: Dados (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│  ┌─ COLUNA ESQUERDA (55%) ──────────────┐  ┌─ COLUNA DIREITA (45%) ───────────────────┐│
│  │  (mesmo visual do login, radar anim.)│  │  bg: #F4F1EA                             ││
│  │                                      │  │                                           ││
│  │  copy adaptado para cadastro:        │  │  ┌─ topo ─────────────────────────────┐  ││
│  │                                      │  │  │  Já tem conta? [Entrar →]           │  ││
│  │  "Faça parte da rede."               │  │  └────────────────────────────────────┘  ││
│  │                                      │  │                                           ││
│  │  "Cada relato importa.               │  │  ┌─ indicador de progresso ───────────┐  ││
│  │   Seja parte da comunidade           │  │  │  ●──────○──────○                   │  ││
│  │   que mantém o Rio mais              │  │  │  Dados   Código  Pronto            │  ││
│  │   seguro."                           │  │  └────────────────────────────────────┘  ││
│  │                                      │  │                                           ││
│  │                                      │  │  Criar conta                              ││
│  │  ┌─ detalhe de bairros ──────────┐   │  │  (IBM Plex Serif, 32px)                  ││
│  │  │  [ Botafogo · Madureira ·     │   │  │                                           ││
│  │  │    Santa Cruz · Ipanema · ... │   │  │  ┌─ botão google ─────────────────────┐  ││
│  │  │    +89 outros ]               │   │  │  │  [G]  Cadastrar com Google         │  ││
│  │  └──────────────────────────────┘   │  │  └────────────────────────────────────┘  ││
│  │                                      │  │                                           ││
│  └──────────────────────────────────────┘  │  ── ou ──────────────────────────────── ││
│                                            │                                           ││
│                                            │  ┌─ campo nome ───────────────────────┐  ││
│                                            │  │  Como quer ser chamado?             │  ││
│                                            │  │  ┌──────────────────────────────┐  │  ││
│                                            │  │  │  Primeiro nome               │  │  ││
│                                            │  │  └──────────────────────────────┘  │  ││
│                                            │  │  (só primeiro nome — mais humano)   │  ││
│                                            │  └────────────────────────────────────┘  ││
│                                            │                                           ││
│                                            │  ┌─ campo e-mail ─────────────────────┐  ││
│                                            │  │  E-mail                             │  ││
│                                            │  │  ┌──────────────────────────────┐  │  ││
│                                            │  │  │  usuario@email.com           │  │  ││
│                                            │  │  └──────────────────────────────┘  │  ││
│                                            │  └────────────────────────────────────┘  ││
│                                            │                                           ││
│                                            │  ┌─ campo senha ──────────────────────┐  ││
│                                            │  │  Senha                              │  ││
│                                            │  │  ┌──────────────────────────────┐  │  ││
│                                            │  │  │  ••••••••               [👁] │  │  ││
│                                            │  │  └──────────────────────────────┘  │  ││
│                                            │  │  ┌─ força da senha ──────────────┐ │  ││
│                                            │  │  │  ████████░░░░  Boa            │ │  ││
│                                            │  │  └──────────────────────────────┘ │  ││
│                                            │  └────────────────────────────────────┘  ││
│                                            │                                           ││
│                                            │  ┌─ botão primário ───────────────────┐  ││
│                                            │  │     Continuar →                    │  ││
│                                            │  └────────────────────────────────────┘  ││
│                                            │                                           ││
│                                            │  Ao criar conta você concorda com os     ││
│                                            │  [termos de uso] e [política de dados]   ││
│                                            │  (12px, muted — não em destaque)         ││
│                                            │                                           ││
│                                            └───────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Wireframe — Cadastro Passo 2: Verificação por Código (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  ┌─ COLUNA ESQUERDA ─────────────────────┐  ┌─ COLUNA DIREITA ─────────────────────┐  │
│  │  (radar animado, identidade mantida)  │  │  bg: #F4F1EA                         │  │
│  │                                       │  │                                       │  │
│  │  copy de reforço:                     │  │  ┌─ progresso ────────────────────┐   │  │
│  │                                       │  │  │  ●──────●──────○               │   │  │
│  │  "Quase lá."                          │  │  │  Dados   Código  Pronto         │   │  │
│  │                                       │  │  └────────────────────────────────┘   │  │
│  │  "Enviamos um código para             │  │                                        │  │
│  │   confirmar que você é você           │  │  Confirme seu e-mail                  │  │
│  │   — não um robô."                     │  │  (IBM Plex Serif, 32px)               │  │
│  │                                       │  │                                        │  │
│  │  (ícone de envelope com ping          │  │  Enviamos um código de 6 dígitos para │  │
│  │   animado em teal)                    │  │  usuario@email.com                    │  │
│  │                                       │  │  [Mudar e-mail]  (link pequeno)       │  │
│  │                                       │  │                                        │  │
│  └───────────────────────────────────────┘  │  ┌─ input de código ───────────────┐   │  │
│                                             │  │                                  │   │  │
│                                             │  │  ┌──┐ ┌──┐ ┌──┐  ┌──┐ ┌──┐ ┌──┐│   │  │
│                                             │  │  │  │ │  │ │  │  │  │ │  │ │  ││   │  │
│                                             │  │  └──┘ └──┘ └──┘  └──┘ └──┘ └──┘│   │  │
│                                             │  │   1    2    3      4    5    6   │   │  │
│                                             │  │  (IBM Plex Mono, 28px, auto-tab) │   │  │
│                                             │  └────────────────────────────────┘   │  │
│                                             │                                        │  │
│                                             │  [Reenviar código]  Reenviar em 45s   │  │
│                                             │  (link desabilitado com countdown)    │  │
│                                             │                                        │  │
│                                             │  ┌─ botão primário ────────────────┐   │  │
│                                             │  │     Verificar →                 │   │  │
│                                             │  └────────────────────────────────┘   │  │
│                                             │                                        │  │
│                                             │  [← Voltar]  (link muted, discreto)   │  │
│                                             │                                        │  │
│                                             └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Wireframe — Cadastro Passo 3: Sucesso (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  ┌─ COLUNA ESQUERDA ─────────────────────┐  ┌─ COLUNA DIREITA ─────────────────────┐  │
│  │  radar animado — agora com mais       │  │  bg: #F4F1EA                         │  │
│  │  pings visíveis (bem-vindo à rede)    │  │                                       │  │
│  │                                       │  │  ┌─ progresso ────────────────────┐   │  │
│  │  "Você agora faz parte da rede."      │  │  │  ●──────●──────●               │   │  │
│  │                                       │  │  │  Dados   Código  Pronto         │   │  │
│  │                                       │  │  └────────────────────────────────┘   │  │
│  │                                       │  │                                        │  │
│  │                                       │  │  ✓ Conta criada                       │  │
│  │                                       │  │  (ícone check teal, 32px Serif)       │  │
│  │                                       │  │                                        │  │
│  │                                       │  │  Olá, [Nome]. Seu acesso está pronto. │  │
│  │                                       │  │                                        │  │
│  │                                       │  │  O que você quer fazer agora?         │  │
│  │                                       │  │                                        │  │
│  │                                       │  │  ┌─ ação primária ─────────────────┐   │  │
│  │                                       │  │  │  Ver o mapa do Rio →            │   │  │
│  │                                       │  │  └────────────────────────────────┘   │  │
│  │                                       │  │                                        │  │
│  │                                       │  │  ┌─ ação secundária ───────────────┐   │  │
│  │                                       │  │  │  Registrar um relato            │   │  │
│  │                                       │  │  └────────────────────────────────┘   │  │
│  │                                       │  │                                        │  │
│  └───────────────────────────────────────┘  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Mobile — Layout simplificado

### 4.1 Princípios mobile

Referências: Nubank, Neon, iFood — onboarding leve, identidade presente mas sem peso, uma ação por tela, copy humano.

- **Sem colunas.** Layout vertical, full-width.
- **Marca presente no topo** — logo + identidade visual, não sumida.
- **Ilustração reduzida** — um elemento do radar, não a tela cheia.
- **Teclado-friendly** — campos grandes, botão fixado no fundo da tela quando o teclado abre.
- **Google em destaque** — no mobile, OAuth é o caminho mais fácil e deve aparecer primeiro.

### 4.2 Wireframe — Login (Mobile, 390px)

```
┌──────────────────────────┐
│  bg: #11181F (topo hero) │
│                          │
│  ◉ RADARURBANO           │
│  (logo centralizado)     │
│                          │
│  ┌────────────────────┐  │
│  │  [radar mini svg]  │  │
│  │  sweep animado     │  │
│  │  2 pings visíveis  │  │
│  └────────────────────┘  │
│                          │
│  "Bem-vindo de volta"    │
│  (IBM Plex Serif, 26px,  │
│   cor: #F4F1EA)          │
│                          │
└──────────────────────────┘
│  bg: #F4F1EA (corpo)     │
│                          │
│  ┌──────────────────────┐│
│  │ [G]  Entrar c/ Google││
│  └──────────────────────┘│
│                          │
│  ─── ou ───────────────  │
│                          │
│  E-mail                  │
│  ┌──────────────────────┐│
│  │ usuario@email.com    ││
│  └──────────────────────┘│
│                          │
│  Senha                   │
│  ┌──────────────────────┐│
│  │ ••••••••       [👁]  ││
│  └──────────────────────┘│
│                          │
│  [Esqueci a senha]       │
│                          │
│  ┌──────────────────────┐│
│  │     Entrar →         ││  ← bg: #0E5C63
│  └──────────────────────┘│
│                          │
│  Não tem conta?          │
│  [Criar conta]           │
│                          │
└──────────────────────────┘
```

### 4.3 Wireframe — Cadastro Passo 1: Dados (Mobile)

```
┌──────────────────────────┐
│  bg: #11181F             │
│                          │
│  ◉ RADARURBANO           │
│                          │
│  [radar mini, 80px]      │
│                          │
│  "Faça parte da rede."   │
│  (Serif, 24px, #F4F1EA)  │
│                          │
└──────────────────────────┘
│  bg: #F4F1EA             │
│                          │
│  ──●──────○──────○──     │
│   1/3   2/3   3/3        │
│                          │
│  ┌──────────────────────┐│
│  │ [G]  Cadastrar c/ G. ││
│  └──────────────────────┘│
│                          │
│  ─── ou ───────────────  │
│                          │
│  Como quer ser chamado?  │
│  ┌──────────────────────┐│
│  │ Primeiro nome        ││
│  └──────────────────────┘│
│                          │
│  E-mail                  │
│  ┌──────────────────────┐│
│  │ usuario@email.com    ││
│  └──────────────────────┘│
│                          │
│  Senha                   │
│  ┌──────────────────────┐│
│  │ ••••••••       [👁]  ││
│  └──────────────────────┘│
│  ████████░░  Boa         │
│                          │
│  Ao criar conta você     │
│  concorda com os         │
│  [termos] e [privacidade]│
│  (12px, muted)           │
│                          │
│  ┌──────────────────────┐│
│  │     Continuar →      ││
│  └──────────────────────┘│
│                          │
│  Já tem conta? [Entrar]  │
│                          │
└──────────────────────────┘
```

### 4.4 Wireframe — Verificação por Código (Mobile)

```
┌──────────────────────────┐
│  bg: #11181F             │
│                          │
│  ◉ RADARURBANO           │
│                          │
│  [ícone envelope teal    │
│   com ping animado]      │
│                          │
│  "Quase lá."             │
│  (Serif, 24px, #F4F1EA)  │
│                          │
└──────────────────────────┘
│  bg: #F4F1EA             │
│                          │
│  ──●──────●──────○──     │
│                          │
│  Confirme seu e-mail     │
│  (IBM Plex Sans, 18px)   │
│                          │
│  Código enviado para:    │
│  usuario@email.com       │
│  [Mudar e-mail]          │
│                          │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │  │ │  │ │  │ │  │ │  │ │  │ │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│  (Mono 28px, auto-foco)  │
│                          │
│  [Reenviar código]       │
│  Reenviar em 45s         │
│                          │
│                          │
│                          │
│                          │
│  ┌──────────────────────┐│  ← botão fixado no
│  │     Verificar →      ││     fundo (sticky)
│  └──────────────────────┘│
└──────────────────────────┘
```

### 4.5 Wireframe — Sucesso (Mobile)

```
┌──────────────────────────┐
│  bg: #0E5C63             │
│                          │
│  ◉ RADARURBANO           │
│                          │
│  [check mark animado     │
│   grande, #3FB6A8]       │
│                          │
│  "Conta criada."         │
│  (Serif, 28px, #F4F1EA)  │
│                          │
│  "Olá, [Nome]."          │
│  (Sans, 16px, #C8CDD2)   │
│                          │
└──────────────────────────┘
│  bg: #F4F1EA             │
│                          │
│  O que quer fazer agora? │
│                          │
│  ┌──────────────────────┐│
│  │  Ver o mapa →        ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  Registrar um relato ││  ← outline
│  └──────────────────────┘│
│                          │
└──────────────────────────┘
```

---

## 5. Componentes

### 5.1 InputField

**Variantes:** default, focused, filled, error, disabled

```
Estado default:
┌────────────────────────────────────┐
│  Label (IBM Plex Sans 13px, muted) │
│  ┌──────────────────────────────┐  │
│  │  Placeholder...              │  │
│  └──────────────────────────────┘  │
│  borda: 1px solid #DAD5C9          │
│  bg: #FFFFFF  border-radius: 4px   │
└────────────────────────────────────┘

Estado focused:
│  borda: 2px solid #0E5C63
│  ring: 0 0 0 3px rgba(14,92,99,0.12)

Estado error:
│  borda: 2px solid #A8332F
│  [! Mensagem de erro] (13px, #A8332F, abaixo do campo)

Estado disabled:
│  bg: #F0EDE7  borda: #DAD5C9  cor: #9AA4AE  cursor: not-allowed
```

### 5.2 PasswordField

Campo de senha com botão de toggle visibilidade.

- Ícone olho: `eye` / `eye-off` (Lucide ou Heroicons)
- Botão acessível: `aria-label="Mostrar senha"` / `"Ocultar senha"`
- No mobile: toggle visível e toque fácil (mín. 44x44px touch target)

### 5.3 PasswordStrengthBar

Aparece somente no cadastro, abaixo do campo senha.

```
Fraca:   ██░░░░░░░░  cor: #A8332F   "Fraca"
Regular: █████░░░░░  cor: #E0A93B   "Pode melhorar"
Boa:     ████████░░  cor: #3E8E7E   "Boa"
Forte:   ██████████  cor: #0E5C63   "Ótima"
```

Critérios: comprimento >= 8, maiúsculas, números, símbolos.

### 5.4 ButtonPrimary

```
bg: #0E5C63
text: #F4F1EA
font: IBM Plex Sans 15px font-weight:500
padding: 12px 24px
border-radius: 4px
height: 48px (desktop) / 52px (mobile)
width: full no formulário

:hover  → bg: #0A4A51  (10% mais escuro)
:active → bg: #083E44  scale: 0.98
:focus  → ring: 0 0 0 3px rgba(14,92,99,0.25)
:disabled → opacity: 0.45  cursor: not-allowed
```

### 5.5 ButtonGoogle

```
bg: #FFFFFF
border: 1px solid #DAD5C9
text: #11181F  IBM Plex Sans 15px
padding: 12px 24px
border-radius: 4px
height: 48px (desktop) / 52px (mobile)
ícone: svg SVG oficial Google 20px

:hover → bg: #F4F1EA
:focus → ring: 0 0 0 3px rgba(14,92,99,0.20)
```

### 5.6 Divider "ou"

```
──────────────────  ou  ──────────────────
linha: 1px solid #DAD5C9
texto: IBM Plex Mono 12px #9AA4AE
espaçamento: 20px vertical
```

### 5.7 CodeInput (6 dígitos)

```
6 inputs independentes 48x56px (desktop) / 44x52px (mobile)
gap: 8px (desktop) / 6px (mobile)
font: IBM Plex Mono 28px #11181F, text-align: center
border: 2px solid #DAD5C9  border-radius: 4px

:focus → border: 2px solid #0E5C63
:filled → border: 2px solid #0E5C63  bg: #F0F8F7
:error → border: 2px solid #A8332F  agita suavemente (shake animation)
:success → border: 2px solid #3E8E7E  bg: #EDF7F5

Comportamento:
- Auto-avança para o próximo campo ao digitar
- Backspace volta ao campo anterior
- Colar um código de 6 dígitos popula todos automaticamente
- No iOS: inputmode="numeric", pattern="[0-9]*"
```

### 5.8 ProgressStepper

Desktop (horizontal):

```
  ●───────────○───────────○
 Dados      Código      Pronto

● = ativo/concluído: bg #0E5C63, borda none
○ = inativo: bg transparent, borda 2px solid #DAD5C9
linha: 1px solid #DAD5C9
```

Mobile (dots compactos):

```
  ●  ─  ○  ─  ○
```

### 5.9 LinkButton (secundário)

```
color: #0E5C63
font: IBM Plex Sans 14px
text-decoration: none
:hover → text-decoration: underline
padding: 4px 0 (para área de toque)
```

### 5.10 Toast / Feedback inline

```
Erro de login:
┌─────────────────────────────────────────┐
│  ! E-mail ou senha incorretos.          │
│    [Esqueci minha senha]                │
└─────────────────────────────────────────┘
bg: #FEF0EF  border-left: 3px solid #A8332F  border-radius: 4px

Sucesso de reenvio:
┌─────────────────────────────────────────┐
│  ✓ Código reenviado para seu e-mail.    │
└─────────────────────────────────────────┘
bg: #EDF7F5  border-left: 3px solid #3E8E7E
```

---

## 6. Copy — Textos da interface

### 6.1 Login

| Elemento            | Copy                                                               |
| ------------------- | ------------------------------------------------------------------ |
| Título              | Bem-vindo de volta                                                 |
| Subtítulo           | Entre para ver o que está acontecendo no seu bairro.               |
| Label e-mail        | E-mail                                                             |
| Label senha         | Senha                                                              |
| Link esqueceu senha | Esqueci a senha                                                    |
| Botão primário      | Entrar                                                             |
| Botão Google        | Entrar com Google                                                  |
| Link cadastro       | Não tem conta? Criar conta                                         |
| Erro credenciais    | E-mail ou senha incorretos.                                        |
| Erro conta bloq.    | Sua conta está temporariamente bloqueada. Tente em alguns minutos. |

### 6.2 Cadastro — Passo 1

| Elemento           | Copy                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| Título             | Criar conta                                                            |
| Subtítulo          | Faça parte da comunidade.                                              |
| Label nome         | Como quer ser chamado?                                                 |
| Placeholder nome   | Primeiro nome                                                          |
| Label e-mail       | E-mail                                                                 |
| Label senha        | Senha                                                                  |
| Botão primário     | Continuar                                                              |
| Botão Google       | Cadastrar com Google                                                   |
| Termos (rodapé)    | Ao criar conta você concorda com os termos de uso e política de dados. |
| Link login         | Já tem conta? Entrar                                                   |
| Erro e-mail já usa | Já existe uma conta com esse e-mail. Entrar                            |

### 6.3 Cadastro — Passo 2 (código)

| Elemento             | Copy                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Título               | Confirme seu e-mail                                                                                     |
| Descrição            | Enviamos um código de 6 dígitos para [email]. Verifique a caixa de entrada — e o spam, só por garantia. |
| Link mudar e-mail    | Mudar e-mail                                                                                            |
| Reenvio (ativo)      | Reenviar código                                                                                         |
| Reenvio (aguardando) | Reenviar em 45s                                                                                         |
| Botão primário       | Verificar                                                                                               |
| Link voltar          | ← Voltar                                                                                                |
| Erro código inválido | Código incorreto. Tente novamente.                                                                      |
| Erro código expirado | Código expirado. Solicite um novo.                                                                      |

### 6.4 Cadastro — Passo 3 (sucesso)

| Elemento       | Copy                                 |
| -------------- | ------------------------------------ |
| Título         | Conta criada.                        |
| Saudação       | Olá, [Nome]. Seu acesso está pronto. |
| Chamada        | O que você quer fazer agora?         |
| CTA primário   | Ver o mapa do Rio →                  |
| CTA secundário | Registrar um relato                  |

### 6.5 Copy institucional (coluna esquerda desktop)

```
Logo:
RADARURBANO

Tagline:
"Informação compartilhada pela comunidade
 para tornar a cidade mais segura."

Stats (atualizado pelo backend):
4.200 relatos · 92 bairros · última semana
```

---

## 7. Estados de loading

### 7.1 Botão em carregamento

O botão primário substitui o texto por um spinner inline. O estado é imediato — sem delay.

```
┌──────────────────────────────┐
│    [spinner 18px]  Entrando… │
└──────────────────────────────┘
```

- Spinner: border circular 2px, cor #F4F1EA, giratório, 600ms linear
- Botão: opacity 0.8, `pointer-events: none`, `aria-busy="true"`
- Campos do formulário: `disabled` durante a requisição

### 7.2 Verificação do código

Ao submeter o código, cada caixa escurece levemente e o botão entra em loading.

```
Estados das caixas durante verificação:
bg: #F0EDE7  (levemente acinzentado)
border: 2px solid #DAD5C9
cursor: not-allowed
```

### 7.3 Reenvio de código

O link "Reenviar código" fica desabilitado com contador regressivo (45s). Após o reenvio, exibe toast de sucesso por 3 segundos.

### 7.4 Login com Google (OAuth redirect)

Ao clicar em "Entrar com Google", o botão entra em loading e uma mensagem discreta aparece abaixo:

```
[spinner]  Abrindo Google...
```

O redirecionamento para OAuth acontece na mesma aba.

---

## 8. Estados de erro

### 8.1 Erros de campo (inline)

Aparecem abaixo do campo com ícone de alerta. O campo ganha borda vermelha.

```
E-mail:
  ┌──────────────────────────────────┐
  │ texto inválido aqui              │ ← borda #A8332F
  └──────────────────────────────────┘
  ! Digite um e-mail válido.
  (IBM Plex Sans 12px, #A8332F)
```

Acionamento: apenas após o usuário tentar submeter ou sair do campo (blur), nunca durante a digitação.

### 8.2 Erros de autenticação (banner)

Não revelam informação sensível (se o e-mail existe ou não).

```
Login:
  ! E-mail ou senha incorretos.
  (não diz qual dos dois está errado)

Conta bloqueada (após 5 tentativas):
  ! Muitas tentativas. Tente novamente em 10 minutos.

Problema de servidor:
  ! Algo deu errado. Tente novamente em instantes.
```

### 8.3 Erros de código de verificação

```
Código inválido (1ª vez):
  ! Código incorreto. Você tem mais 2 tentativas.

Código inválido (última tentativa):
  ! Código incorreto. Solicitaremos um novo código.
  [Receber novo código] ← CTA inline

Código expirado:
  ! Esse código expirou. [Reenviar agora]
```

### 8.4 Acessibilidade nos erros

- `role="alert"` nos banners de erro para leitores de tela
- `aria-invalid="true"` e `aria-describedby="campo-erro"` nos campos com erro
- Foco programático no primeiro campo com erro após submit

---

## 9. Animações e transições

### 9.1 Transição entre telas (multi-step cadastro)

- Slide horizontal suave: o passo atual sai para a esquerda (translateX: -20px, opacity: 0) e o próximo entra da direita (translateX: 20px, opacity: 0 → 0,0)
- Duração: 240ms, easing: `ease-out`
- O progress stepper atualiza simultaneamente com micro-animação no dot ativo

### 9.2 Entradas de tela (primeira exibição)

- Formulário aparece com fade-in + translateY: 12px → 0
- Duração: 280ms, easing: `ease-out`
- Coluna esquerda: entra 80ms antes do formulário

### 9.3 Radar animado (coluna esquerda desktop / hero mobile)

Já documentado no design system:

```
Sweep: conic-gradient rotacionando 360deg em 5s linear infinite
Pings: scale(0.6→2.4) + opacity(0.9→0) em 2.4s / 3.1s ease-out infinite
```

No contexto das telas de auth, o radar é **menor** (180px desktop, 80px mobile) para não competir com o formulário.

### 9.4 Shake no código inválido

Quando o código está errado, as caixas do CodeInput executam uma micro-animação:

```css
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}
/* duração: 320ms, timing: ease-in-out */
```

### 9.5 Sucesso no código

Quando o código está correto:

1. Cada caixa vira verde (`bg: #EDF7F5, border: #3E8E7E`) sequencialmente (40ms entre cada)
2. Aparece um check icon no lugar do spinner no botão
3. Transição automática para a tela de sucesso após 600ms

### 9.6 Botão hover/click

```
:hover  → transition: background 120ms ease
:active → transform: scale(0.98) + transition 80ms ease
```

---

## 10. Responsividade

### Breakpoints

| Breakpoint | Valor      | Comportamento                                            |
| ---------- | ---------- | -------------------------------------------------------- |
| mobile     | < 640px    | Layout mobile-only (coluna única, hero compacto no topo) |
| tablet     | 640–1023px | Mobile com max-width 480px centralizado, sem colunas     |
| desktop    | >= 1024px  | Layout duas colunas completo                             |

### Adaptações de layout

**Desktop (>= 1024px):**

- Grid 55/45 (esquerda/direita)
- Coluna esquerda: position sticky, height: 100vh
- Formulário centralizado na coluna direita com max-width 420px

**Tablet (640–1023px):**

- Coluna esquerda removida
- Fundo muda para bg: #ECE8DF (areia)
- Logo Radar Urbano aparece no topo da página (navbar compacta)
- Formulário centralizado, max-width 440px, padding 24px

**Mobile (< 640px):**

- Hero escuro no topo (altura: 240–280px adaptável ao conteúdo)
- Formulário na parte branca abaixo
- Botões full-width
- Campos height: 52px (touch target maior)
- Padding horizontal: 20px

---

## 11. Acessibilidade

### 11.1 Contraste de cores

| Combinação                       | Ratio  | Nível |
| -------------------------------- | ------ | ----- |
| #F4F1EA em #0E5C63 (botão)       | 8.2:1  | AAA   |
| #11181F em #F4F1EA (texto/fundo) | 16.4:1 | AAA   |
| #0E5C63 em #F4F1EA (link)        | 5.8:1  | AA    |
| #5A6470 em #F4F1EA (muted)       | 4.6:1  | AA    |
| #A8332F em #F4F1EA (erro)        | 4.9:1  | AA    |

### 11.2 Navegação por teclado

- Tab order lógico: Google → divisor → email → senha → link esqueceu senha → botão submit → link cadastro
- Enter no campo de senha submete o formulário
- Esc fecha toasts
- No CodeInput: Tab pula entre caixas, Backspace volta

### 11.3 Labels e ARIA

```html
<!-- Exemplo estrutural -->
<label for="email">E-mail</label>
<input
  id="email"
  type="email"
  autocomplete="email"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert" aria-live="polite"></span>
```

### 11.4 Autocompletar

| Campo            | autocomplete     |
| ---------------- | ---------------- |
| Nome             | given-name       |
| E-mail           | email            |
| Senha (login)    | current-password |
| Senha (cadastro) | new-password     |
| Código OTP       | one-time-code    |

---

## 12. Modelo de dados e integrações (contexto técnico)

### 12.1 Fluxo Auth.js

```
Login e-mail/senha:
  POST /api/auth/signin  →  CredentialsProvider  →  bcrypt compare
  → JWT session  →  redirect /mapa

Login Google:
  GET /api/auth/signin/google  →  OAuth callback
  → upsert user na base  →  JWT session  →  redirect /mapa

Cadastro:
  POST /api/auth/register
  → create user (hash senha bcrypt)  →  gera código 6 dígitos  →  Resend envia e-mail
  → retorna { pendingVerification: true }

Verificação:
  POST /api/auth/verify-code  →  valida código + TTL 10min
  → marca email_verified = true  →  cria JWT session  →  redirect sucesso
```

### 12.2 Modelo de usuário (campos relevantes para auth)

```
users {
  id              uuid PRIMARY KEY
  name            text NOT NULL
  email           text UNIQUE NOT NULL
  email_verified  timestamp
  password_hash   text (null se só Google)
  provider        text ('credentials' | 'google')
  created_at      timestamp
  last_login      timestamp
  login_attempts  int DEFAULT 0
  locked_until    timestamp
}

verification_codes {
  id         uuid PRIMARY KEY
  user_id    uuid REFERENCES users(id)
  code       char(6) NOT NULL
  expires_at timestamp NOT NULL
  used_at    timestamp
  created_at timestamp
}
```

### 12.3 E-mail de verificação (Resend)

```
Assunto: Seu código de acesso ao Radar Urbano
Remetente: noreply@radarurbano.app

Corpo (texto simples + HTML):
  Olá, [Nome].

  Seu código de acesso é:

       [ 4 8 2 9 1 7 ]

  Válido por 10 minutos. Não compartilhe com ninguém.

  Se você não solicitou esse código, pode ignorar este e-mail.

  — Radar Urbano
```

---

## 13. Checklist de implementação

- [ ] Componente `AuthLayout` com slot esquerdo (branding) e direito (formulário)
- [ ] `AuthLayout` colapsa para mobile-only abaixo de 1024px
- [ ] `InputField` com estados: default, focused, filled, error, disabled
- [ ] `PasswordField` com toggle de visibilidade e acessibilidade
- [ ] `PasswordStrengthBar` com 4 níveis e cores do design system
- [ ] `ButtonPrimary` com estado de loading (spinner inline)
- [ ] `ButtonGoogle` com SVG oficial e todos os estados
- [ ] `CodeInput` (6 slots): auto-tab, backspace, colar, animação shake, estado sucesso
- [ ] `ProgressStepper` horizontal (desktop) e compacto (mobile)
- [ ] Feedback inline de erro por campo (aparece no blur ou submit)
- [ ] Banner de erro de autenticação com `role="alert"`
- [ ] Toast de reenvio de código com auto-dismiss 3s
- [ ] Countdown de 45s para reenvio de código
- [ ] Radar SVG animado (versão mini para auth)
- [ ] Transição slide entre passos do cadastro (240ms ease-out)
- [ ] Animação de sucesso no código verificado (verde sequencial + check)
- [ ] `autocomplete` correto em todos os campos
- [ ] Navegação por teclado verificada (Tab order, Enter submit)
- [ ] Contraste verificado (WCAG AA mínimo, AAA preferencial)
- [ ] Testes em iOS Safari (inputmode, autocomplete OTP)
- [ ] Testes em Android Chrome (comportamento do teclado virtual)
- [ ] Botão fixado no fundo no mobile quando teclado abre (`position: sticky` + `padding-bottom`)
