# Política de Segurança — Radar Urbano

## Versões Suportadas

Apenas a versão mais recente disponível na branch `main` recebe correções de segurança.
Versões anteriores (tags de release mais antigas) não são mantidas ativamente para fins de
segurança.

| Versão              | Suportada |
| ------------------- | --------- |
| `main` (última)     | ✅ Sim    |
| Releases anteriores | ❌ Não    |

Recomendamos que todos os operadores mantenham suas instâncias atualizadas com a versão mais
recente do repositório.

---

## Como Reportar uma Vulnerabilidade

**Não abra issues públicas para reportar vulnerabilidades de segurança.** Issues públicas expõem
a vulnerabilidade antes que ela seja corrigida, podendo colocar outras instâncias em risco.

### Canal oficial de reporte

Envie um e-mail detalhado para:

**seguranca@radarurbano.org**

### O que incluir no reporte

Para nos ajudar a entender e reproduzir o problema rapidamente, inclua:

1. **Descrição da vulnerabilidade** — o que foi encontrado e qual o risco potencial.
2. **Componente afetado** — pacote, endpoint, serviço ou funcionalidade.
3. **Passos para reprodução** — detalhados e numerados.
4. **Prova de conceito** — código, screenshot ou vídeo demonstrando o problema (opcional, mas
   muito útil).
5. **Impacto estimado** — confidencialidade, integridade, disponibilidade.
6. **Sugestão de mitigação** — se você já tiver uma ideia de como corrigir (opcional).

### SLA de resposta

| Etapa                                | Prazo                                  |
| ------------------------------------ | -------------------------------------- |
| Confirmação de recebimento           | ≤ 72 horas                             |
| Avaliação inicial de severidade      | ≤ 7 dias                               |
| Correção e comunicação ao reportador | ≤ 30 dias (dependendo da complexidade) |
| Divulgação pública coordenada        | Após a correção disponível             |

Agradecemos a paciência durante o processo de análise e correção. Em casos de vulnerabilidades
críticas com risco iminente, o prazo de correção pode ser acelerado.

### Divulgação responsável

Seguimos a prática de **divulgação responsável coordenada (coordinated vulnerability disclosure)**:

1. O reportador nos notifica em privado.
2. Trabalhamos na correção em conjunto (se o reportador desejar colaborar).
3. Após a correção disponível na `main`, publicamos um aviso de segurança (GitHub Security
   Advisory) com os créditos ao reportador, caso ele consinta.
4. Pedimos que o reportador aguarde a divulgação pública até que a correção seja lançada.

Nenhuma ação legal será tomada contra pesquisadores que reportem vulnerabilidades de boa fé,
seguindo esta política.

---

## O Que NÃO Reportar Publicamente

Os itens abaixo **não devem ser reportados em issues públicas, fóruns ou redes sociais**:

- Credenciais, chaves de API ou segredos encontrados em qualquer parte do repositório.
- Vulnerabilidades em dependências de terceiros ainda não corrigidas pelos respectivos
  mantenedores (reporte ao projeto upstream e nos avise).
- Comportamentos que dependem de configuração incorreta do operador (ex.: instância sem HTTPS).
- Vulnerabilidades que requerem acesso físico ao servidor ou comprometimento prévio do sistema.

Para qualquer dúvida sobre se algo deve ser reportado publicamente ou não, envie um e-mail para
**seguranca@radarurbano.org** antes de publicar.

---

## Escopo

Esta política cobre os seguintes componentes do Radar Urbano:

| Componente                               | Escopo              |
| ---------------------------------------- | ------------------- |
| `apps/web` — aplicação Next.js           | ✅ Incluso          |
| `apps/worker` — workers BullMQ           | ✅ Incluso          |
| `packages/db` — schema e client          | ✅ Incluso          |
| `packages/core` — lógica de domínio      | ✅ Incluso          |
| `packages/data-ingestion` — adapters     | ✅ Incluso          |
| Infraestrutura de CI/CD (GitHub Actions) | ✅ Incluso          |
| Dependências de terceiros (npm)          | ⚠️ Reporte upstream |
| Instâncias auto-hospedadas por terceiros | ❌ Fora do escopo   |

---

## Créditos

Agradecemos a todos que contribuíram responsavelmente para a segurança do Radar Urbano.
Pesquisadores que reportarem vulnerabilidades válidas serão reconhecidos publicamente (com
consentimento) no Security Advisory correspondente.
