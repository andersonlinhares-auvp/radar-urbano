# Guia de Contribuição — Radar Urbano

Obrigado por seu interesse em contribuir com o Radar Urbano! Este documento descreve os processos
e padrões que adotamos para manter a qualidade e a colaboração saudável no projeto.

## Índice

- [Setup rápido](#setup-rápido)
- [Fluxo de branches](#fluxo-de-branches)
- [Conventional Commits](#conventional-commits)
- [Revisão obrigatória](#revisão-obrigatória)
- [Abertura de issues](#abertura-de-issues)
- [Padrões de documentação](#padrões-de-documentação)

---

## Setup rápido

Antes de contribuir, certifique-se de ter o ambiente local configurado corretamente. Consulte o
guia detalhado em [`docs/setup/local-development.md`](docs/setup/local-development.md).

**Requisitos mínimos:**

- Node.js ≥ 20.11 (LTS)
- pnpm ≥ 9
- Docker e Docker Compose (para banco de dados local)

```bash
# Clone o repositório
git clone https://github.com/radarurbano/radar-urbano.git
cd radar-urbano

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env

# Suba o banco de dados local
docker compose up -d db

# Rode as migrations
pnpm db:migrate

# Inicie o servidor de desenvolvimento
pnpm dev
```

---

## Fluxo de branches

### Branch principal

A branch `main` é **protegida** e representa sempre o estado estável e implantável do projeto.
Commits diretos na `main` não são permitidos — todo código entra exclusivamente via Pull Request
revisado e aprovado.

### Branches de trabalho

Crie sempre uma branch específica para cada unidade de trabalho, seguindo os prefixos abaixo:

| Prefixo     | Quando usar                                  | Exemplo                        |
| ----------- | -------------------------------------------- | ------------------------------ |
| `feat/`     | Nova funcionalidade ou melhoria de produto   | `feat/mapa-heatmap-incidentes` |
| `fix/`      | Correção de bug ou comportamento incorreto   | `fix/calculo-risk-score-zero`  |
| `docs/`     | Documentação, guias, READMEs                 | `docs/setup-local-development` |
| `chore/`    | Tarefas de manutenção sem impacto no produto | `chore/atualizar-dependencias` |
| `refactor/` | Refatoração sem mudança de comportamento     | `refactor/servico-incidentes`  |
| `test/`     | Adição ou correção de testes                 | `test/cobertura-trust-score`   |
| `ci/`       | Ajustes em pipelines de CI/CD                | `ci/cache-docker-layers`       |

**Regras gerais:**

- O `<slug>` deve ser curto, em kebab-case e em português ou inglês (consistente com o contexto).
- Branches devem ter vida curta — abra o PR assim que o trabalho estiver pronto para revisão.
- Delete a branch remota após o merge do PR.

### Fluxo típico

```bash
# Crie sua branch a partir da main atualizada
git checkout main
git pull origin main
git checkout -b feat/minha-funcionalidade

# Faça commits incrementais
git add <arquivos>
git commit -m "feat(scope): descrição do que foi feito"

# Envie para o remote e abra o PR
git push -u origin feat/minha-funcionalidade
```

---

## Conventional Commits

Todos os commits devem seguir a especificação [Conventional Commits](https://www.conventionalcommits.org/).
Isso permite geração automática de changelogs e versionamento semântico.

### Formato

```
<tipo>(<escopo opcional>): <descrição curta>

[corpo opcional]

[rodapé(s) opcional(is)]
```

### Tipos aceitos

| Tipo       | Descrição                                            | Exemplo                                    |
| ---------- | ---------------------------------------------------- | ------------------------------------------ |
| `feat`     | Nova funcionalidade                                  | `feat(map): add heatmap layer`             |
| `fix`      | Correção de bug                                      | `fix(api): handle null incident date`      |
| `docs`     | Alteração somente em documentação                    | `docs: update contributing guide`          |
| `chore`    | Manutenção, sem impacto em produção ou testes        | `chore: bump pnpm to 9.15`                 |
| `test`     | Adição ou correção de testes                         | `test(core): add risk-score edge cases`    |
| `ci`       | Mudanças em workflows de CI/CD                       | `ci: cache node_modules in GitHub Actions` |
| `refactor` | Refatoração sem mudança de comportamento ou correção | `refactor(db): simplify query builder`     |
| `perf`     | Melhoria de desempenho                               | `perf(map): lazy-load tile layers`         |

### Regras adicionais

- **Breaking changes:** adicione `!` após o tipo/escopo (`feat!:`) e descreva no rodapé com
  `BREAKING CHANGE: <descrição>`.
- **Escopo:** use o nome do pacote ou área afetada (`web`, `worker`, `db`, `core`, `ingestion`).
- A descrição deve estar em inglês (identificadores de código) ou português — mantenha consistência
  dentro do mesmo repositório; preferimos inglês nos commits.
- **Cada commit encerra com:**

  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```

  (apenas quando aplicável — commits gerados com auxílio de IA devem indicar co-autoria).

---

## Revisão obrigatória

### Critérios para merge

Todo Pull Request só pode ser mergeado quando **todas** as condições abaixo forem atendidas:

1. **≥ 1 review aprovado** de um Maintainer ou Core Contributor da área afetada.
2. **CI verde** — todos os checks de lint, type-check, build e testes devem passar.
3. **Sem conflitos** com a `main`.
4. **Documentação atualizada** no mesmo PR (ver [Padrões de documentação](#padrões-de-documentação)).

### Boas práticas para quem revisa

- Revise o código em até **2 dias úteis** após a solicitação para não bloquear o contribuidor.
- Prefira comentários construtivos com sugestões concretas a reprovações sem explicação.
- Use os prefixos de comentário: `nit:` (sugestão menor), `blocker:` (impede merge),
  `question:` (dúvida sem implicação de bloqueio).

### Boas práticas para quem submete o PR

- Mantenha os PRs focados — um PR deve resolver uma coisa só.
- Adicione descrição clara no template do PR explicando o contexto e o que foi feito.
- Marque o PR como **Draft** enquanto ainda estiver em desenvolvimento.
- Responda a todos os comentários antes de solicitar nova revisão.

---

## Abertura de issues

Use sempre os **templates de issue** disponíveis ao criar uma nova issue no GitHub. Eles garantem
que as informações necessárias estejam presentes desde o início.

### Tipos de issue disponíveis

| Template            | Quando usar                                               |
| ------------------- | --------------------------------------------------------- |
| **Bug Report**      | Comportamento incorreto ou inesperado                     |
| **Feature Request** | Sugestão de nova funcionalidade                           |
| **Documentação**    | Erro ou lacuna na documentação                            |
| **Segurança**       | Não use issues públicas — veja [SECURITY.md](SECURITY.md) |

### Requisitos para Bug Reports

Um bom bug report deve conter:

1. **Descrição clara** do problema observado.
2. **Passos para reprodução** — numerados, detalhados, reproduzíveis.
3. **Comportamento esperado** vs. **comportamento observado**.
4. **Ambiente:** versão do Node.js, SO, browser (se aplicável), versão do Radar Urbano.
5. **Logs e screenshots** relevantes.

Issues sem passos de reprodução podem ser fechadas por falta de informação.

### Etiquetas (labels)

As issues são etiquetadas automaticamente por tipo e prioridade. Não modifique etiquetas
manualmente a não ser que você seja Maintainer.

---

## Padrões de documentação

### Documentação no mesmo PR

Toda mudança de comportamento, nova funcionalidade ou alteração de API **deve** incluir a
atualização da documentação relevante **no mesmo PR**. PRs que alteram funcionalidade sem
atualizar docs podem ser reprovados na revisão.

Exemplos do que deve ser documentado no mesmo PR:

- Nova variável de ambiente → atualizar `.env.example` e `docs/setup/local-development.md`.
- Novo endpoint de API → atualizar `docs/architecture/` ou JSDoc inline.
- Nova coluna no banco → atualizar `packages/db/README.md` ou documentação de schema.
- Novo comando de script → atualizar `package.json` e o guia relevante em `docs/`.

### Idiomas

O projeto adota uma convenção clara de idiomas:

| Contexto                          | Idioma                       |
| --------------------------------- | ---------------------------- |
| Interface do produto (UI, labels) | Português (pt-BR)            |
| Documentação para usuários finais | Português (pt-BR)            |
| Documentação técnica (docs/)      | Português (pt-BR)            |
| Código-fonte (variáveis, funções) | Inglês                       |
| Comentários inline no código      | Inglês                       |
| Mensagens de commit               | Inglês (preferencialmente)   |
| Nomes de branches                 | Inglês ou pt-BR (kebab-case) |

### Formatação

- Documentos `.md` são formatados pelo Prettier (configurado no pre-commit hook via Husky).
- Não é necessário formatar manualmente — o hook cuida disso ao commitar.
- Use headings hierárquicos (`##`, `###`) e listas consistentes.
- Links internos devem ser relativos (ex.: `[setup](docs/setup/local-development.md)`).

---

## Dúvidas?

Abra uma issue com o template **Documentação** ou entre em contato pelo canal de discussões do
projeto. Agradecemos sua contribuição ao Radar Urbano!
