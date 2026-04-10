# Lumix — Build Guide

Guia para construir o Lumix usando Claude Code.

---

## 1. O que foi criado

| Arquivo / Diretório | Função |
|---------------------|--------|
| `CLAUDE.md` | Arquivo principal que o Claude Code lê automaticamente. Contém regras e referências. |
| `SPEC.md` | Especificação completa do produto — features, critérios de aceite e waves de build. |
| `docs/schema.md` | Schema do banco de dados — todas as tabelas, colunas, tipos e políticas RLS. |
| `docs/brand.md` | Design system — cores (laranja, amarelo, branco), fontes, espaçamentos e tokens. |
| `docs/architecture.md` | Arquitetura técnica — stack, estrutura de pastas, padrões de código. |
| `docs/anti-patterns.md` | O que nunca fazer — erros comuns que causam bugs ou falhas de segurança. |
| `.claude/agents/` | Sub-agentes especializados: security-reviewer, test-writer, ui-reviewer. |
| `.claude/skills/` | Workflows reutilizáveis: new-feature, fix-issue. |
| `.claude/commands/` | Slash commands: /pr, /catchup, /review. |
| `env/.env.local` | Variáveis de ambiente do Supabase (já existente). |

---

## 2. Sua Primeira Sessão com Claude Code

1. Abra o terminal na pasta do projeto (`lumix-projeto`)
2. Digite `claude` e pressione Enter
3. O Claude lê o CLAUDE.md automaticamente — ele agora conhece seu projeto
4. **Teste:** pergunte "O que é este projeto e o que estou construindo?"
   → O Claude deve descrever o Lumix, os perfis admin/cliente e as features
5. **Teste:** pergunte "O que devo construir primeiro?"
   → O Claude deve referenciar SPEC.md e descrever as tasks da Wave 1

---

## 3. Sequência de Build

### Wave 1 — Foundation
Objetivo: esqueleto funcional com autenticação e redirect por perfil.

- Scaffold Next.js 15 (TypeScript, Tailwind 4, shadcn/ui)
- Configurar Supabase (auth, schema, RLS)
- Páginas de auth (login, signup, reset)
- Middleware de proteção de rotas
- Redirect por role (admin/cliente)
- Shell de navegação (sidebar admin, header cliente)
- Dados seed no banco

### Wave 2 — CRUD Admin
Objetivo: admin gerencia clientes e UCs.

- CRUD completo de empresas (com suporte matriz/filial)
- CRUD completo de UCs (com dados técnicos)
- Validação de CNPJ
- Busca e filtros

### Wave 3 — Features Completas
Objetivo: todas as features do MVP funcionando.

- Dashboard do cliente (geração, performance, economia)
- Histórico de relatórios com download PDF
- Dados da usina (somente leitura)
- Upload de fatura (Supabase Storage)
- Gestão de relatórios (admin)
- Inserção manual de fatura (admin)
- Tabela tarifária (admin)

### Wave 4 — Production Readiness
Objetivo: app estável e pronto para produção.

- Error handling em tudo
- Loading e empty states
- Responsividade mobile
- Testes E2E
- Deploy Vercel

---

## 4. Como Trabalhar com Claude Code

**Começando uma feature:**
1. Encontre a feature no SPEC.md e leia os acceptance criteria
2. Diga: "Segundo o SPEC.md, quero construir [nome da feature]. Antes de codar, me mostre o plano."
3. Revise o plano. Faça perguntas. Corrija se algo parecer errado.
4. Diga "pode prosseguir" para começar a implementação.

**Prompts úteis para o Lumix:**
- "Use o security-reviewer agent para verificar o código de autenticação"
- "Use o test-writer agent para escrever testes para a action createEmpresa"
- "O dashboard do cliente não está mostrando os dados. Escreva um teste que reproduza o bug, depois corrija."
- "Preciso adicionar um campo na UC. Atualize docs/schema.md com a nova coluna, depois implemente."
- "Rode /catchup para me lembrar onde parei"
- "Rode /review antes de eu abrir o PR da Wave 2"

**Regra de ouro:**
Atualize os docs/ antes de implementar. SPEC.md → CLAUDE.md → docs/schema.md. Depois construa.

---

## 5. Quando as Coisas Dão Errado

- **Claude sai do rumo** → Pressione Escape imediatamente, redirecione claramente
- **Mesmo erro duas vezes** → `/clear` e reescreva o prompt com mais precisão
- **Feature grande demais** → Quebre em 2-3 tarefas menores no SPEC.md primeiro
- **Algo quebrou** → `git status` para ver o que mudou; `/rewind` para desfazer
- **UI não parece certa** → "Use o ui-reviewer agent para verificar este componente"

---

## 6. Mantendo os Arquivos Atualizados

- **Schema mudou** → Atualize docs/schema.md PRIMEIRO, depois rode a migration
- **Nova feature** → Adicione ao SPEC.md PRIMEIRO, depois peça ao Claude para construir
- **Design mudou** → Atualize docs/brand.md PRIMEIRO, depois implemente
- **Decisão de stack** → Registre em docs/architecture.md antes
- **Padrão novo surgiu** → Atualize CLAUDE.md para codificá-lo permanentemente
