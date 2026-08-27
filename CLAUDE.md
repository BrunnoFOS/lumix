# Lumix

Sistema de monitoramento de usinas fotovoltaicas. A equipe Lumix (admin) gerencia
clientes, UCs e relatórios. Empresas clientes acompanham geração e baixam relatórios.

## Context Boot Sequence

At the start of every session, read these files before doing anything else:

@docs/schema.md
@docs/brand.md
@docs/architecture.md
@docs/anti-patterns.md

These files are the source of truth. They override general knowledge.

---

## Key Commands

```bash
npm run dev          # Start local dev server on port 3000
npm run test         # Run Vitest test suite
npm run test:watch   # Tests in watch mode
npm run build        # Production build + type check
npm run typecheck    # Type check only
npm run lint         # ESLint
npx supabase db push # Apply pending migrations
npx supabase db reset # Reset local DB
```

---

## Project-Specific Rules

### Architecture
- Dois layouts separados: `(admin)/` e `(cliente)/` — nunca misturar com condicionais
- All mutations via Server Actions in lib/actions/ — never write to Supabase from Client Components
- Data fetching in Server Components by default
- Recharts for charts, shadcn/ui for all components

### Database
IMPORTANT: RLS é obrigatório. Admin vê tudo. Cliente filtra por empresa_id.
Toda query de cliente DEVE ter filtro explícito por empresa_id (defense in depth).

- Never invent columns or tables not in docs/schema.md
- mes_referencia is always first day of month (date, not timestamp)
- Monetary values use decimal(10,2) — never floats

### Design & Styling
IMPORTANT: Cores da marca: laranja (#F97316), amarelo (#F59E0B), branco.
Use design tokens from docs/brand.md only. Never hardcode hex colors.

- shadcn/ui for all primitives. Extend; don't replace.
- Lucide React for icons. Recharts for charts.
- All labels, messages and UI text in Portuguese (pt-BR)

---

## Testing Requirements

YOU MUST run `npm run test` after every change before committing.
- All tests must pass before opening a PR
- Write tests for Server Actions before marking any feature done
- Vitest for unit tests, Playwright for E2E on critical paths

---

## Workflow

- Branches: feature/[name], fix/[name], chore/[name]
- Commits: feat: ..., fix: ..., chore: ...
- After UI changes: take a screenshot to verify
- Use /clear between unrelated features

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Server-only admin operations |

Env file location: `env/.env.local`. Never commit .env files.

---

## What Success Looks Like

Core loop: Cliente faz login → vê dashboard com geração em kWh, comparativo
real vs estimado, indicador de performance e economia em R$.
If this breaks, stop everything and fix it first.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
