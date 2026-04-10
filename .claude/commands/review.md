Rodar uma revisão completa de código das mudanças atuais.

1. `git diff main` — pegar todas as mudanças desde o branch de main
2. Usar o security-reviewer agent:
   "Use o security-reviewer agent para revisar essas mudanças para issues de segurança"
3. Verificar manualmente:
   - A implementação atende os acceptance criteria do SPEC.md?
   - Loading, error e empty states estão implementados?
   - Existem testes para a nova funcionalidade?
   - O código segue os padrões de docs/architecture.md?
   - Existem novos padrões que devem ser adicionados a docs/anti-patterns.md?
4. Reportar achados organizados por: crítico → alto → médio → sugestões
