# Governança — Radar Urbano

Este documento descreve como o projeto Radar Urbano é governado: os papéis existentes, como as
decisões são tomadas, como as pessoas progridem na comunidade e como propor mudanças
significativas ao projeto.

---

## Papéis e Responsabilidades

### Maintainers

Os Maintainers são as pessoas com autoridade final sobre o projeto. Eles são responsáveis por:

- **Decisão final** em questões técnicas, estratégicas e de direção do produto.
- **Gerenciamento de releases** — versionamento, changelogs e publicação de novas versões.
- **Gestão de acesso** ao repositório, secrets e infraestrutura.
- **Aplicação do Código de Conduta** e resolução de conflitos graves.
- **Aprovação de RFCs** para mudanças de grande impacto.
- Revisão e merge de PRs em qualquer área do projeto.

Os Maintainers atuais estão listados no arquivo [`CODEOWNERS`](.github/CODEOWNERS) (quando
disponível) e na seção de colaboradores do repositório GitHub.

### Core Contributors

Core Contributors são colaboradores com histórico consistente de contribuições de qualidade em
uma ou mais áreas do projeto. Eles possuem:

- **Direito de review e merge** em suas áreas de especialidade (ex.: `apps/web`, `packages/db`,
  `apps/worker`, documentação).
- **Responsabilidade de revisar PRs** abertos em suas áreas dentro do SLA de 2 dias úteis.
- Participação ativa nas discussões de RFC e decisões técnicas.
- Capacidade de triagem de issues (aplicar labels, fechar duplicatas, pedir mais informações).

Core Contributors não têm autoridade para fazer merge de mudanças que afetem arquitetura global,
segurança ou governança sem aprovação de um Maintainer.

### Community Contributors

Qualquer pessoa que contribua com o projeto via Pull Request, issue, discussão ou documentação
é considerada uma Community Contributor. Não há requisitos formais para iniciar — basta seguir
o [Código de Conduta](CODE_OF_CONDUCT.md) e o [Guia de Contribuição](CONTRIBUTING.md).

Community Contributors:

- Podem abrir issues, PRs e participar de discussões livremente.
- Têm seus PRs revisados por Core Contributors ou Maintainers.
- Não têm permissão de merge ou acesso administrativo ao repositório.

---

## Processo de Promoção

### De Community Contributor para Core Contributor

A promoção não é automática — ela é baseada em reconhecimento pela qualidade e consistência das
contribuições. O processo é:

1. **Elegibilidade:** A pessoa demonstrou contribuições relevantes em uma área específica ao
   longo de pelo menos **3 meses**, incluindo PRs mergeados e participação ativa em discussões.
2. **Indicação:** Qualquer Maintainer ou Core Contributor pode indicar a pessoa abrindo uma
   issue privada (ou discussão interna) descrevendo as contribuições.
3. **Decisão:** Os Maintainers avaliam a indicação por consenso (ver [Tomada de decisão](#tomada-de-decisão)).
   Se não houver consenso, uma votação simples é realizada (maioria dos Maintainers ativos).
4. **Convite:** A pessoa indicada é convidada formalmente. A promoção só ocorre com aceitação
   explícita — ninguém é promovido sem consentimento.
5. **Comunicação:** A adição é anunciada publicamente no repositório (ex.: atualização de
   CODEOWNERS ou release notes).

### De Core Contributor para Maintainer

O caminho para Maintainer é mais exigente e requer:

1. Atuação consistente como Core Contributor por pelo menos **6 meses**.
2. Demonstração de visão alinhada com os objetivos do projeto (civic tech, transparência, dados
   abertos).
3. Indicação por **dois Maintainers existentes**.
4. Aprovação por **unanimidade** dos Maintainers ativos.
5. Período de onboarding de 30 dias com acesso gradual antes de receber todas as permissões.

### Offboarding

Maintainers e Core Contributors que ficarem inativos por mais de **6 meses** sem comunicação
prévia podem ter seus acessos revisados. O processo é iniciado com uma mensagem privada para
verificar interesse em continuar. A remoção de acesso não implica nenhuma conotação negativa —
as contribuições históricas continuam reconhecidas.

---

## Tomada de Decisão

### Decisões cotidianas

A maioria das decisões (merge de PRs, triagem de issues, pequenas melhorias) é tomada de forma
distribuída pelos Core Contributors e Maintainers responsáveis pela área, sem necessidade de
consulta ampla.

### Consenso

Para decisões que afetam múltiplas áreas do projeto, buscamos **consenso** entre os Maintainers
e Core Contributors relevantes:

1. A proposta é apresentada em uma issue ou discussão pública, com contexto suficiente.
2. Um período de **7 dias** é aberto para comentários e sugestões.
3. Se não houver objeções fundamentadas ao final do período, a proposta é considerada aprovada
   por consenso silencioso.

### Voto de Maintainers

Quando o consenso não é atingido após discussão, os **Maintainers votam**:

- Cada Maintainer ativo tem um voto.
- Decisões regulares requerem **maioria simples** (mais de 50%).
- Decisões que afetam governança, segurança ou arquitetura global requerem **maioria qualificada**
  (≥ 2/3 dos Maintainers ativos).
- Em caso de empate, o Maintainer com maior tempo de projeto tem voto de minerva.
- O resultado da votação é registrado publicamente na issue ou discussão correspondente.

---

## Processo de RFC (Request for Comments)

Mudanças de grande impacto devem passar pelo processo de RFC antes da implementação. Uma RFC é
obrigatória para:

- Mudanças de arquitetura global (novo serviço, novo pacote principal, troca de tecnologia central).
- Alterações de schema de banco de dados que quebrem compatibilidade.
- Mudanças na política de governança ou Código de Conduta.
- Novas integrações de dados ou fontes que impliquem responsabilidades legais ou de privacidade.
- Qualquer mudança que afete a API pública do projeto de forma incompatível.

### Como abrir uma RFC

1. **Crie uma issue** no repositório usando o template de RFC (quando disponível) ou com o label
   `rfc`.
2. **Preencha as seções obrigatórias:**
   - **Motivação:** por que essa mudança é necessária?
   - **Proposta detalhada:** o que será criado, modificado ou removido?
   - **Alternativas consideradas:** quais outras abordagens foram avaliadas e por que foram
     descartadas?
   - **Impactos e riscos:** o que pode dar errado? Quais áreas são afetadas?
   - **Plano de migração:** como usuários e operadores serão afetados e como migrar?
3. **Período de discussão:** mínimo de **14 dias** abertos para comentários da comunidade.
4. **Decisão final:** após o período de discussão, os Maintainers tomam a decisão por consenso
   ou votação (ver acima).
5. **Implementação:** somente após aprovação formal da RFC, o desenvolvimento pode começar.
   A RFC aprovada é referenciada nos PRs de implementação.

### RFC urgente

Em casos de vulnerabilidades críticas de segurança ou bloqueios operacionais graves, o processo
pode ser acelerado com um período de discussão reduzido (mínimo 48 horas) e aprovação por
maioria qualificada dos Maintainers.

---

## Código de Conduta

Toda participação no projeto — código, issues, discussões, revisões — está sujeita ao nosso
[Código de Conduta](CODE_OF_CONDUCT.md). Violações podem resultar em remoção temporária ou
permanente do projeto, independentemente do papel da pessoa.

---

## Alterações neste Documento

Este documento de governança pode ser alterado por meio do processo de RFC descrito acima.
Toda alteração deve ser aprovada por maioria qualificada dos Maintainers e comunicada à
comunidade com antecedência mínima de 7 dias antes de entrar em vigor.
