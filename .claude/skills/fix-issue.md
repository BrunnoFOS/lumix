---
name: fix-issue
description: >
  Workflow para investigar e corrigir uma issue do GitHub no Lumix.
  Do detalhe da issue até o PR mergeado. Invocar: /fix-issue [numero-da-issue]
disable-model-invocation: true
---

Corrigir a GitHub issue #$ARGUMENTS seguindo este workflow:

1. `gh issue view $ARGUMENTS` — ler detalhes completos da issue
2. Entender o problema. Identificar o que está quebrado e onde.
3. Buscar no codebase pelos arquivos relevantes (usar Grep/Glob)
4. Ler docs/schema.md e docs/architecture.md se o fix toca dados ou padrões
5. Escrever um teste falhando que reproduz a issue ANTES de fazer qualquer fix
6. Rodar o teste para confirmar que falha: `npm run test`
7. Implementar o fix — endereçar causa raiz, não apenas sintoma
8. Rodar o teste de novo para confirmar que passa: `npm run test`
9. Rodar suite completa de testes: `npm run test`
10. Commit: `fix: [descrição curta do que foi corrigido]`
11. `gh pr create --title "fix: [descrição]" --body "[o que estava errado, o que mudou, como testar]"`
