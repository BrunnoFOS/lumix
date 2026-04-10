# Lumix — Architecture

**Last updated:** 2026-04-10

---

## Tech Stack

| Layer | Tool | Version | Rationale |
|-------|------|---------|-----------|
| Framework | Next.js | 15 | App Router + RSC + Server Actions — renderização moderna e DX excelente |
| Database | Supabase | latest | PostgreSQL gerenciado + Auth + RLS + Storage — sem backend separado |
| Auth | Supabase Auth | latest | Email/senha com suporte a roles via profiles. Integrado com RLS |
| Styling | Tailwind CSS | 4 | Utility-first, rápido para dashboards com muitos dados |
| UI Components | shadcn/ui | latest | Componentes acessíveis e customizáveis. Base sólida para tables e forms |
| Charts | Recharts | latest | Gráficos responsivos para dashboard de geração de energia |
| State (server) | React Server Components | - | Default para data fetching. revalidatePath para invalidação |
| State (client) | React useState/useReducer | - | Apenas para UI state local. Sem store global |
| Testing (unit) | Vitest | latest | Rápido, compatível com ESM e TypeScript |
| Testing (E2E) | Playwright | latest | E2E para fluxos críticos (login, dashboard, upload) |
| Deployment | Vercel | latest | Deploy automático, edge functions, preview deploys |
| File Upload | Supabase Storage | latest | Upload de imagens de fatura pelo cliente |

---

## Folder Structure

```
lumix-projeto/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Rotas públicas de autenticação
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   ├── (admin)/                      # Rotas protegidas — perfil Admin
│   │   ├── layout.tsx                # Shell admin (sidebar, header)
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Dashboard admin — overview geral
│   │   ├── clientes/
│   │   │   ├── page.tsx              # Lista de empresas
│   │   │   ├── novo/
│   │   │   │   └── page.tsx          # Criar empresa
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Detalhes da empresa
│   │   │       └── editar/
│   │   │           └── page.tsx      # Editar empresa
│   │   ├── unidades/
│   │   │   ├── page.tsx              # Lista de UCs
│   │   │   ├── nova/
│   │   │   │   └── page.tsx          # Cadastrar UC
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Detalhes da UC
│   │   │       └── editar/
│   │   │           └── page.tsx      # Editar UC
│   │   ├── relatorios/
│   │   │   ├── page.tsx              # Lista de relatórios
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Detalhes do relatório
│   │   ├── faturas/
│   │   │   ├── page.tsx              # Lista de faturas
│   │   │   └── nova/
│   │   │       └── page.tsx          # Inserir dados de fatura
│   │   └── tarifas/
│   │       └── page.tsx              # Gestão de tarifas
│   ├── (cliente)/                    # Rotas protegidas — perfil Cliente
│   │   ├── layout.tsx                # Shell cliente (header simplificado)
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Dashboard do cliente — geração, performance
│   │   ├── historico/
│   │   │   └── page.tsx              # Histórico de relatórios
│   │   ├── usina/
│   │   │   └── page.tsx              # Dados da usina (somente leitura)
│   │   └── fatura/
│   │       └── page.tsx              # Upload de imagem de fatura
│   ├── api/                          # API routes (apenas webhooks externos)
│   │   └── webhooks/
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing / redirect para login
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── admin/                        # Componentes específicos do admin
│   │   ├── ClienteForm.tsx
│   │   ├── ClienteTable.tsx
│   │   ├── UCForm.tsx
│   │   ├── UCTable.tsx
│   │   ├── RelatorioTable.tsx
│   │   ├── FaturaForm.tsx
│   │   └── TarifaTable.tsx
│   ├── cliente/                      # Componentes específicos do cliente
│   │   ├── DashboardCards.tsx
│   │   ├── GeracaoChart.tsx
│   │   ├── PerformanceIndicator.tsx
│   │   ├── RelatorioList.tsx
│   │   └── UsinaDetails.tsx
│   └── shared/                       # Componentes compartilhados
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── StatusBadge.tsx
│       └── DataTable.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # Server-side Supabase client
│   │   ├── client.ts                 # Browser-side Supabase client
│   │   └── middleware.ts             # Auth middleware helper
│   ├── actions/                      # Server Actions
│   │   ├── auth.ts                   # Login, signup, logout
│   │   ├── empresas.ts               # CRUD empresas
│   │   ├── unidades.ts               # CRUD unidades consumidoras
│   │   ├── relatorios.ts             # Geração e gestão de relatórios
│   │   ├── faturas.ts                # CRUD faturas, upload
│   │   └── tarifas.ts                # CRUD tarifas
│   └── utils.ts                      # Formatação de valores, datas, CNPJ
├── hooks/                            # Custom React hooks
│   └── use-user.ts                   # Hook para dados do usuário logado
├── types/                            # TypeScript type definitions
│   └── database.ts                   # Types gerados do Supabase schema
├── env/
│   └── .env.local                    # Variáveis de ambiente (NÃO commitar)
├── docs/                             # Contexto para Claude Code
│   ├── schema.md
│   ├── brand.md
│   ├── architecture.md
│   └── anti-patterns.md
├── .claude/                          # Configuração Claude Code
│   ├── agents/
│   ├── skills/
│   └── commands/
├── CLAUDE.md
├── SPEC.md
└── BUILD_GUIDE.md
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files (components) | PascalCase | `ClienteForm.tsx` |
| Files (other) | kebab-case | `auth-utils.ts` |
| Folders | kebab-case | `unidades/`, `shared/` |
| Components | PascalCase | `DashboardCards`, `UCTable` |
| Functions | camelCase | `getEmpresas`, `formatCNPJ` |
| Variables | camelCase | `isAdmin`, `empresaList` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_ROLE` |
| DB tables | snake_case | `unidades_consumidoras`, `dados_geracao` |
| DB columns | snake_case | `created_at`, `empresa_id` |
| Server Actions | `verb + Noun` | `createEmpresa`, `updateTarifa` |
| API routes | kebab-case path | `/api/webhooks/relatorio` |

---

## Key Patterns

### Authentication Flow

1. Usuário submete formulário de login
2. Supabase Auth valida credenciais e define session cookie via `@supabase/ssr`
3. `middleware.ts` verifica sessão em toda request para rotas `(admin)/` e `(cliente)/`
4. Se sessão inválida: redirect para `/login`
5. Se sessão válida: verificar `profiles.role` para redirecionar ao layout correto
6. Admin → `(admin)/dashboard`, Cliente → `(cliente)/dashboard`
7. RLS policies aplicam acesso no banco — auth é gateway, não guarda final

### Data Fetching Strategy

**Server Components (default):**
Usar para todos os dados que podem ser buscados no render.
```typescript
const supabase = await createServerClient()
const { data: empresas } = await supabase
  .from('empresas')
  .select('id, nome, cnpj, cidade, estado, ativa')
  .order('nome')
```

**Client Components (exceções):**
- Upload de imagem de fatura (interação do usuário)
- Filtros de período no dashboard (interatividade)
- Tabelas com paginação client-side

**Mutations (Server Actions only):**
Todas as escritas passam por Server Actions em `lib/actions/`.
Nunca escrever direto no Supabase de Client Components.

### State Management

- **Server state:** React Server Components + revalidatePath
- **Client UI state:** React useState/useReducer. Sem store global.
- **Auth state:** Session via Supabase + context provider no root layout
- **Form state:** React Hook Form para formulários complexos (UC, empresa), useState para simples

### Error Handling

- Server Actions retornam `{ data, error }` — nunca throw
- Erros exibidos inline perto do componente que causou
- Sem falhas silenciosas: todo erro é tratado ou exibido
- Erros do Supabase mapeados para mensagens amigáveis em português
- Erros de rede mostram opção de retry

### Loading States

- `loading.tsx` do Next.js para loading de rota
- React Suspense com skeleton components para loading de componente
- Skeletons vivem ao lado dos componentes reais
- Optimistic updates para ações rápidas (toggle ativa/inativa)

---

## Environment Variables

| Variable | Purpose | Client-safe? | Where set |
|----------|---------|--------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | env/.env.local + Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes | env/.env.local + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin access | NO | env/.env.local + Vercel |

IMPORTANT: `NEXT_PUBLIC_` prefix = exposto ao browser. Nunca colocar secrets aqui.
Nunca commitar arquivos .env. Usar .env.local localmente e variáveis da plataforma em produção.

---

## Decisions Log

- 2026-04-10 · Rotas separadas `(admin)/` e `(cliente)/` em vez de layout único com condicionais · Layouts dedicados simplificam a lógica e permitem shells completamente diferentes
- 2026-04-10 · Valores monetários em decimal(10,2) em vez de inteiros (centavos) · Faturas de energia já trabalham com reais, conversão de centavos adicionaria complexidade desnecessária
- 2026-04-10 · `mes_referencia` como date (primeiro dia do mês) em vez de campos separados mês/ano · Simplifica queries de range e ordenação
- 2026-04-10 · Recharts para gráficos em vez de Chart.js · Melhor integração com React, API declarativa, responsivo por padrão
- 2026-04-10 · Upload de fatura via Supabase Storage em vez de serviço externo · Já temos Supabase, reduz complexidade. Processamento OCR é via API externa separada
