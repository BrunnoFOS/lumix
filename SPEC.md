# Lumix — Product Specification

**Version:** 1.0 (MVP)
**Last updated:** 2026-04-10
**Status:** In development

---

## 1. Product Identity

**What it is:**
Lumix é um sistema de monitoramento de usinas fotovoltaicas para a equipe Lumix
gerenciar clientes, unidades consumidoras (UCs), faturas de energia e relatórios
de performance. Clientes (empresas com usinas solares) acompanham geração, economia
e baixam relatórios mensais.

**The core loop (must always work):**
Cliente faz login → vê dashboard com geração total do mês, comparativo real vs estimado,
indicador de performance (Bom/Regular/Ruim) e economia estimada em R$.

**What success looks like at MVP:**
1. Admin consegue cadastrar empresa, UCs e gerar relatórios para qualquer cliente
2. Cliente vê dashboard com dados reais de geração e baixa PDFs de relatórios
3. Dados de fatura podem ser inseridos manualmente ou via upload de imagem

---

## 2. Core Features

### Feature 1: Autenticação com Perfis
**What it is:** Login com email/senha. Dois perfis: Admin (equipe Lumix) e Cliente (empresa). Redirecionamento automático para dashboard adequado.
**Who uses it:** Todos
**Acceptance criteria:**
- [ ] Login com email e senha funciona para ambos os perfis
- [ ] Admin é redirecionado para `(admin)/dashboard`
- [ ] Cliente é redirecionado para `(cliente)/dashboard`
- [ ] Rotas admin bloqueadas para clientes e vice-versa
- [ ] Logout limpa sessão e redireciona para login
- [ ] Página de reset de senha funciona
**Build wave:** Wave 1

---

### Feature 2: Gestão de Clientes (Admin)
**What it is:** Admin cria, edita e exclui empresas clientes. Suporte a matriz/filial (múltiplos CNPJs vinculados). Listagem com filtros e busca.
**Who uses it:** Admin
**Acceptance criteria:**
- [ ] Criar empresa com todos os campos (nome, CNPJ, endereço, contato)
- [ ] Validação de CNPJ (formato e dígitos)
- [ ] Vincular filial a uma matriz existente
- [ ] Editar dados de empresa existente
- [ ] Desativar empresa (soft delete via campo `ativa`)
- [ ] Listar empresas com busca por nome/CNPJ e filtro por status
- [ ] Ver detalhes da empresa com suas UCs e filiais
**Build wave:** Wave 2

---

### Feature 3: Gestão de Unidades Consumidoras (Admin)
**What it is:** Admin cadastra UCs por empresa com todos os dados técnicos (módulos, inversores, enquadramento tarifário). Corrigir cadastros incompletos.
**Who uses it:** Admin
**Acceptance criteria:**
- [ ] Criar UC vinculada a uma empresa
- [ ] Todos os campos técnicos preenchíveis (potência, módulos, inversores, distribuidora)
- [ ] Editar UC existente
- [ ] Desativar UC
- [ ] Listar UCs com filtro por empresa e distribuidora
- [ ] Validação de campos obrigatórios (código UC, titular, distribuidora, potência)
- [ ] Indicador visual de cadastros incompletos (campos opcionais em branco)
**Build wave:** Wave 2

---

### Feature 4: Dashboard do Cliente
**What it is:** Dashboard principal do cliente mostrando geração total (kWh), comparativo real vs estimado, indicador de performance e economia do mês.
**Who uses it:** Cliente
**Acceptance criteria:**
- [ ] Card de geração total do período em kWh
- [ ] Gráfico comparativo geração real vs estimada (últimos 12 meses)
- [ ] Indicador visual de performance (Bom = verde, Regular = amarelo, Ruim = vermelho)
- [ ] Card de economia estimada/real do mês em R$
- [ ] Filtro de período (mês/ano)
- [ ] Dados carregam corretamente para a empresa do cliente logado
- [ ] Empty state quando não há dados de geração
**Build wave:** Wave 3

---

### Feature 5: Gestão de Relatórios (Admin)
**What it is:** Admin visualiza todos os relatórios, insere dados de fatura manualmente, aciona geração de relatório e acompanha status de envio.
**Who uses it:** Admin
**Acceptance criteria:**
- [ ] Listar relatórios por cliente e período
- [ ] Filtro por status de envio (pendente/enviado/erro)
- [ ] Inserir dados de fatura manualmente (formulário com campos de energia)
- [ ] Acionar geração manual de relatório para um cliente/UC
- [ ] Ver status do envio (badge colorido)
- [ ] Visualizar detalhes do relatório gerado
**Build wave:** Wave 3

---

### Feature 6: Histórico de Relatórios (Cliente)
**What it is:** Cliente vê lista de relatórios mensais anteriores e baixa PDF de cada um.
**Who uses it:** Cliente
**Acceptance criteria:**
- [ ] Lista de relatórios ordenada por data (mais recente primeiro)
- [ ] Cada item mostra: mês, geração, performance, economia
- [ ] Botão de download do PDF
- [ ] Empty state quando não há relatórios
**Build wave:** Wave 3

---

### Feature 7: Dados da Usina (Cliente)
**What it is:** Visualização somente leitura dos dados cadastrais da UC e do sistema fotovoltaico.
**Who uses it:** Cliente
**Acceptance criteria:**
- [ ] Exibir dados da UC (código, titular, distribuidora, enquadramento)
- [ ] Exibir dados técnicos (potência, módulos, inversores, data de instalação)
- [ ] Exibir geração estimada mensal
- [ ] Somente leitura — nenhum botão de edição
**Build wave:** Wave 3

---

### Feature 8: Upload de Fatura (Cliente)
**What it is:** Cliente anexa imagem da fatura de energia. O sistema armazena e, futuramente, uma API externa processará os dados para gerar relatório.
**Who uses it:** Cliente
**Acceptance criteria:**
- [ ] Upload de imagem (JPG, PNG, PDF) via drag & drop ou seleção
- [ ] Preview da imagem antes de confirmar
- [ ] Validação de tipo e tamanho (máx 10MB)
- [ ] Seleção de mês de referência
- [ ] Armazenamento no Supabase Storage
- [ ] Status "pendente" até processamento
- [ ] Lista de faturas enviadas com status
**Build wave:** Wave 3

---

### Feature 9: Tabela Tarifária (Admin)
**What it is:** Admin visualiza e atualiza tarifas TUSD/TE por distribuidora e posto tarifário.
**Who uses it:** Admin
**Acceptance criteria:**
- [ ] Listar tarifas por distribuidora
- [ ] Filtro por modalidade tarifária
- [ ] Criar nova tarifa com vigência
- [ ] Editar tarifa existente
- [ ] Valor total calculado automaticamente (TUSD + TE)
- [ ] Indicador de tarifa vigente vs expirada
**Build wave:** Wave 3

---

## 3. User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| admin | Equipe Lumix | CRUD completo em empresas, UCs, relatórios, faturas e tarifas. Vê dados de todos os clientes. |
| cliente | Empresa com usina solar | Lê dashboard, histórico e dados da usina. Faz upload de fatura. Vê apenas dados da sua empresa. |

**Role assignment:** Definido no campo `role` da tabela `profiles`. Admins são criados manualmente no banco. Novos signups entram como `cliente`.

---

## 4. Data Model (Summary)

Schema completo em docs/schema.md.

Key entities:
- **profiles:** Usuários do sistema com role (admin/cliente) e empresa vinculada
- **empresas:** Empresas clientes com suporte a matriz/filial
- **unidades_consumidoras:** UCs com dados técnicos completos do sistema fotovoltaico
- **dados_geracao:** Dados de geração de energia por UC e período
- **faturas:** Dados de fatura de energia (manual ou via upload)
- **relatorios:** Relatórios gerados com PDF, geração, economia e status de envio
- **tarifas:** Tarifas TUSD/TE por distribuidora e posto tarifário

Key relationships:
- empresa has many unidades_consumidoras
- empresa has many profiles (usuários)
- empresa has many filiais (self-reference)
- unidade_consumidora has many dados_geracao, faturas, relatorios
- relatorio pode estar vinculado a uma fatura

---

## 5. External Services

| Service | Purpose | When added |
|---------|---------|------------|
| Supabase Auth | Autenticação email/senha | Wave 1 |
| Supabase Storage | Upload de imagens de fatura | Wave 3 |
| API externa (TBD) | Processamento OCR de faturas e geração de relatórios | Pós-MVP |

---

## 6. Build Waves

### Wave 1 — Foundation
**Goal:** Esqueleto funcional. Usuário autentica e chega à tela correta.

Tasks:
- [ ] Scaffold Next.js 15 com App Router, TypeScript, Tailwind 4
- [ ] Instalar e configurar shadcn/ui
- [ ] Configurar Supabase client (@supabase/ssr)
- [ ] Configurar env/.env.local com variáveis do Supabase
- [ ] Criar schema do banco via migrations (todas as tabelas de docs/schema.md)
- [ ] Aplicar RLS policies de docs/schema.md
- [ ] Configurar Supabase Auth (email/senha)
- [ ] Criar trigger handle_new_user para auto-criar profile
- [ ] Build auth pages (login, signup, reset password)
- [ ] Build middleware para proteger rotas autenticadas
- [ ] Implementar redirect por role (admin → (admin)/, cliente → (cliente)/)
- [ ] Build shell do admin (sidebar: Dashboard, Clientes, Unidades, Relatórios, Faturas, Tarifas)
- [ ] Build shell do cliente (header: Dashboard, Histórico, Usina, Fatura)
- [ ] Inserir dados seed no banco para visualização

**Done when:** Usuário pode fazer signup, login e ver o shell vazio correto para seu perfil. Dados seed existem nas tabelas.

---

### Wave 2 — CRUD Admin Essencial
**Goal:** Admin consegue gerenciar clientes e UCs completamente.

Tasks:
- [ ] CRUD completo de empresas (criar, listar, editar, desativar)
- [ ] Validação de CNPJ
- [ ] Suporte a matriz/filial na criação de empresa
- [ ] CRUD completo de UCs (criar, listar, editar, desativar)
- [ ] Formulário de UC com todos os campos técnicos
- [ ] Indicador de cadastro incompleto
- [ ] Busca e filtros nas listagens
- [ ] Testes para Server Actions de empresas e UCs

**Done when:** Admin consegue cadastrar empresa com filiais e UCs com dados técnicos completos.

---

### Wave 3 — Features Completas
**Goal:** Todas as features do MVP funcionam end-to-end.

Tasks:
- [ ] Dashboard do cliente com cards de KPI e gráfico de geração
- [ ] Indicador de performance (Bom/Regular/Ruim)
- [ ] Página de histórico de relatórios com download de PDF
- [ ] Página de dados da usina (somente leitura)
- [ ] Upload de imagem de fatura (Supabase Storage)
- [ ] Gestão de relatórios pelo admin (listar, gerar, ver status)
- [ ] Inserção manual de dados de fatura pelo admin
- [ ] Tabela tarifária (CRUD de tarifas por distribuidora)
- [ ] Testes para cada feature

**Done when:** Todos os acceptance criteria da Seção 2 estão atendidos.

---

### Wave 4 — Production Readiness
**Goal:** App estável, polido e pronto para usuários reais.

Tasks:
- [ ] Error handling para todas as operações user-facing
- [ ] Loading states em todas as operações async
- [ ] Empty states para listas sem dados
- [ ] Validação de formulários com mensagens de erro em português
- [ ] Responsividade mobile em todas as telas
- [ ] Testes E2E para caminhos críticos
- [ ] Performance audit (sem re-renders desnecessários, sem N+1 queries)
- [ ] Deploy no Vercel + Supabase produção
- [ ] Configurar variáveis de ambiente em produção

**Done when:** App está live e o core loop funciona em produção.

---

## 7. Out of Scope (MVP)

- **Processamento OCR automático de faturas** — será via API externa, implementado pós-MVP
- **Geração automática de relatórios** — MVP é geração manual pelo admin
- **Notificações por email** — relatórios são acessados via plataforma
- **Multi-idioma** — apenas português brasileiro
- **Dark mode** — não planejado
- **App mobile nativo** — responsive web é suficiente
- **Integração com inversores** — dados de geração são inseridos manualmente

---

## 8. Open Questions

- [ ] Qual API externa será usada para processamento de faturas/OCR?
- [ ] Os PDFs de relatório serão gerados no servidor ou via serviço externo?
- [ ] Existe template/layout específico para o PDF do relatório?
- [ ] Quais distribuidoras devem vir pré-cadastradas nas tarifas?

---

## Spec Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-10 | Initial spec | Project kickoff |
