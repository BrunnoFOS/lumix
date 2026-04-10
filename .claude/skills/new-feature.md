---
name: new-feature
description: >
  Workflow para implementar qualquer nova feature do Lumix a partir do spec.
  Usar quando adicionando feature documentada em SPEC.md. Cobre planejamento,
  implementação, teste e commit. Invocar: /new-feature [nome-da-feature]
---

Implementar a feature "$ARGUMENTS" do SPEC.md seguindo este workflow:

**Step 1 — Ler Contexto (não pular)**
- Ler SPEC.md e encontrar a seção desta feature
- Ler os acceptance criteria cuidadosamente
- Ler docs/schema.md para entender tabelas e relacionamentos relevantes
- Ler docs/architecture.md para entender padrões corretos
- Ler docs/anti-patterns.md para saber o que evitar

**Step 2 — Planejar (apresentar antes de codar)**
Escrever plano breve:
- Quais arquivos serão criados ou modificados?
- Quais operações de banco são necessárias?
- Quais são os edge cases?
- Complexidade estimada: simples / média / complexa

Esperar aprovação antes de ir ao Step 3.

**Step 3 — Implementar**
- Começar com Server Action ou camada de dados (lib/actions/)
- Depois construir o(s) componente(s)
- Seguir padrões de docs/architecture.md
- Referenciar design tokens de docs/brand.md para todo styling
- Adicionar loading state, error state e empty state em todo componente
- Mensagens de erro e labels em português

**Step 4 — Testar**
- Usar o test-writer agent: "Use o test-writer agent para escrever testes para [feature]"
- Rodar `npm run test` — todos devem passar
- Se tem UI: tirar screenshot e comparar com referência

**Step 5 — Commit**
- `git add` apenas os arquivos relevantes
- Commit message: `feat: [nome da feature] — [descrição em uma linha]`
- Confirmar que acceptance criteria no SPEC.md foram atendidos
