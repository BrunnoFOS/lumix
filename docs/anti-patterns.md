# Lumix — Anti-Patterns

**Last updated:** 2026-04-10

Estes não são preferências de estilo. São modos de falha. Cada um causa
bugs reais, problemas de segurança ou pesadelos de manutenção.

---

## Security Anti-Patterns

### ❌ Bypass de RLS com service role no client

**Nunca usar a service role key em código client-side.**

Why it breaks: A service role key bypassa TODAS as políticas RLS.
Qualquer usuário que extrair do bundle pode ler, escrever ou deletar
qualquer registro — incluindo dados de OUTRAS empresas e faturas.

Fix: Service role client vai apenas em código server-side (Server Actions,
API routes, server utilities). Nunca em components ou hooks.

---

### ❌ Confiar em role checks client-side para autorização

**Nunca usar o role armazenado no client para decidir acesso a dados.**

Why it breaks: Dados client-side podem ser forjados. Um "cliente" poderia
se passar por "admin" e ver dados de todas as empresas.

Fix: RLS policies são a camada real de autorização. Checks no frontend
são apenas hints de UI (mostrar/ocultar botões).

---

### ❌ Hardcoding secrets no código

**Nunca hardcodar API keys, service role keys ou credentials no código.**

Why it breaks: Git history é permanente. Mesmo deletando depois, o secret
existe no histórico. Scanners automatizados encontram em minutos.

Fix: Usar environment variables via `process.env.VAR_NAME`.

---

## Database Anti-Patterns

### ❌ Inventar colunas ou tabelas fora do docs/schema.md

**Nunca adicionar colunas ou tabelas que não estejam em docs/schema.md.**

Why it breaks: Schema não documentado cria estado fantasma. A próxima sessão
começa sem conhecer a coluna rogue. Migrations ficam inconsistentes.

Fix: Atualizar docs/schema.md PRIMEIRO, depois escrever a migration.

---

### ❌ Queries N+1 em server components

**Nunca buscar uma lista e fazer uma query separada para cada item.**

Why it breaks: 100 UCs = 101 queries. Loads exponencialmente lentos.

Fix: Usar relationship queries do Supabase:
`select('*, empresa:empresas(nome, cnpj), relatorios(id, status_envio)')`.

---

### ❌ SELECT * em queries de produção

**Nunca usar SELECT * em queries que rodam em produção.**

Why it breaks: Retorna colunas desnecessárias, inclusive futuras colunas
sensíveis. Mais dados no wire, query plans imprevisíveis.

Fix: Selecionar apenas colunas necessárias:
`select('id, nome, cnpj, cidade, ativa')`.

---

### ❌ Confundir mes_referencia com timestamp

**Nunca comparar mes_referencia com funções de timestamp. É um date (primeiro dia do mês).**

Why it breaks: Queries como `WHERE mes_referencia = now()` nunca retornam nada
porque now() inclui hora. O índice composto não é usado corretamente.

Fix: Sempre usar `mes_referencia = '2026-04-01'` (primeiro dia do mês).
Em código: `new Date(year, month, 1).toISOString().split('T')[0]`.

---

## Architecture Anti-Patterns

### ❌ Mutations em Client Components

**Nunca escrever direto no banco de Client Components.**

Why it breaks: Expõe modelo de dados no browser. Bypassa validação server-side.
CSRF vulnerabilities.

Fix: Server Action em `lib/actions/[feature].ts`. Chamar do Client Component.

---

### ❌ API routes para mutations internas

**Não criar API routes para mutations que originam dentro do app.**

Why it breaks: Round-trip HTTP extra, CSRF manual, sem optimistic updates do Next.js.

Fix: Server Actions para mutations internas.
API routes apenas para webhooks: `/api/webhooks/...`

---

### ❌ Misturar layouts admin e cliente

**Nunca usar condicionais `if (isAdmin)` dentro de componentes para
mostrar/ocultar seções inteiras. Usar os layouts separados.**

Why it breaks: Componentes ficam inchados, difíceis de testar, e o bundle
do cliente inclui código admin que nunca será usado. Riscos de vazamento
de dados se a condicional falhar.

Fix: `(admin)/` e `(cliente)/` são layouts completamente separados.
Componentes compartilhados vão em `components/shared/`.

---

### ❌ Acessar dados de outra empresa sem filtro de empresa_id

**Toda query de cliente DEVE filtrar por empresa_id. Mesmo com RLS, a query
deve ser explícita.**

Why it breaks: RLS é a última barreira. Se uma policy for mal configurada,
a query sem filtro vazaria dados de todas as empresas.

Fix: Sempre incluir `.eq('empresa_id', userEmpresaId)` nas queries do cliente.
Defense in depth: RLS + filtro explícito.

---

## UI Anti-Patterns

### ❌ Hardcoded colors, fonts ou spacing

**Nunca usar hex codes ou pixel values direto nos componentes.**

Why it breaks: Um valor hardcoded vira 40. Quando a cor muda, 40 lugares
para atualizar. Claude não conhece valores não documentados.

Fix: `text-primary` → brand.md tokens. Tudo via Tailwind config.

---

### ❌ Missing loading e error states

**Nunca implementar feature sem loading state e error state.**

Why it breaks: Usuários reais têm conexão lenta. API calls falham.
Componente sem tratamento causa erros React que crasham a subtree.

Fix: Todo componente async: skeleton de loading, mensagem de erro inline,
empty state se pode mostrar zero itens.

---

### ❌ Formatar CNPJ ou valores monetários só no frontend

**Nunca confiar que o CNPJ salvo no banco está formatado. Sempre formatar na exibição.**

Why it breaks: CNPJs entram com e sem máscara. Se formatar no save, queries
de busca ficam inconsistentes. Se confiar no formato salvo, UI quebra.

Fix: Salvar CNPJ sem máscara (só números) no banco. Formatar com
`formatCNPJ()` na exibição. Valores em R$ com `formatCurrency()`.

---

## Adding New Anti-Patterns

Quando detectar um novo erro recorrente:
1. Adicionar neste arquivo com explicação completa do WHY IT BREAKS
2. Commitar para que futuras sessões herdem a lição
3. Se pode ser detectado automaticamente, considerar hook ou regra de lint
