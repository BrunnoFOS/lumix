Criar um pull request para o branch atual.

Antes de criar o PR:
1. Rodar `npm run test` — confirmar todos os testes passando
2. Rodar `npm run lint` — confirmar sem erros de lint
3. Rodar `npm run build` — confirmar build sem erros

Então criar o PR com:
`gh pr create --title "[type]: [descrição]" --body "$(cat <<'EOF'
## O que mudou
[descrever o que foi implementado ou corrigido]

## Por quê
[referência ao SPEC.md feature ou número da GitHub issue]

## Como testar
1. [passo 1]
2. [passo 2]
3. [resultado esperado]

## Screenshots (se UI mudou)
[colar screenshots aqui]
EOF
)"`
