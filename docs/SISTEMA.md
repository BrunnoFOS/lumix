# Lumix — Documentação Completa do Sistema

---

## 1. Visão Geral

O **Lumix** é um sistema web de monitoramento de usinas fotovoltaicas. Ele permite que a equipe Lumix (admin) gerencie empresas clientes, unidades consumidoras, faturas de energia, relatórios de performance e tarifas. Empresas clientes acompanham a geração de energia, economia e baixam relatórios mensais.

### Core Loop
> Cliente faz login → vê dashboard com geração total (kWh), comparativo real vs estimado, indicador de performance (Bom/Regular/Ruim) e economia estimada (R$).

### Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router, React Server Components) |
| Banco de dados | Supabase (PostgreSQL + RLS) |
| Autenticação | Supabase Auth (email/senha) |
| Armazenamento | Supabase Storage (PDFs e imagens de fatura) |
| Estilização | Tailwind CSS 4 + shadcn/ui |
| Gráficos | Recharts |
| Testes | Vitest (unitários) |
| Deploy | Vercel |

---

## 2. Perfis de Acesso

### Admin (Equipe Lumix)
- CRUD completo em empresas, UCs, faturas, relatórios e tarifas
- Cria e gerencia usuários dentro de cada empresa (máx. 2 por empresa)
- Altera senhas de usuários clientes
- Gera relatórios manuais
- Insere dados de fatura manualmente
- Vê dados de todas as empresas no dashboard
- Exporta dados em CSV

### Cliente (Empresa com usina solar)
- Visualiza dashboard com KPIs de geração, economia e performance
- Acessa histórico de relatórios (apenas os marcados como "enviado")
- Visualiza dados técnicos da usina (somente leitura)
- Faz upload de imagem/PDF da fatura de energia
- **Matriz** vê dados de todas as suas filiais
- **Filial** vê apenas seus próprios dados

---

## 3. Funcionalidades Detalhadas

### 3.1 Autenticação e Controle de Acesso

**O que faz:** Login com email/senha. Dois perfis (admin/cliente) com redirecionamento automático.

**Fluxo:**
1. Usuário acessa `/login` e submete credenciais
2. Supabase Auth valida e cria sessão via cookie
3. Proxy middleware (`proxy.ts`) verifica sessão em toda request
4. Profile do usuário é consultado para determinar role
5. Admin → `/admin/dashboard` | Cliente → `/cliente/dashboard`
6. Rotas protegidas: admin não acessa `/cliente/*` e vice-versa
7. RLS no banco garante isolamento dos dados

**Dados necessários:**
- `profiles`: id (= auth.users.id), role, nome, email, empresa_id
- Trigger `handle_new_user()` cria profile automaticamente no signup

**Páginas:**
- `/login` — formulário de login
- `/signup` — criação de conta (entra como "cliente")
- `/reset-password` — recuperação de senha por email

---

### 3.2 Gestão de Empresas (Admin)

**O que faz:** Admin cadastra, edita, desativa e arquiva empresas clientes. Suporte a estrutura matriz/filial.

**Fluxo:**
1. Admin acessa `/admin/clientes` → lista de empresas com busca e filtros
2. Cria nova empresa com CNPJ validado (algoritmo de dígitos verificadores)
3. Auto-preenchimento via APIs externas: CNPJ (BrasilAPI) e CEP (ViaCEP)
4. Define se é matriz ou filial (filial aponta para uma matriz via `matriz_id`)
5. Pode desativar (soft delete via `ativa=false`) ou arquivar (`arquivada=true`)
6. Na página de detalhes, vê filiais, UCs e gerencia usuários

**Dados necessários (tabela `empresas`):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | text | Razão social |
| cnpj | text (UNIQUE) | CNPJ sem máscara |
| tipo | 'matriz' \| 'filial' | Tipo da empresa |
| matriz_id | uuid (nullable) | FK para matriz se for filial |
| endereco, cidade, estado, cep | text | Endereço |
| telefone, email | text | Contato |
| responsavel | text | Nome do responsável |
| ativa | boolean | Se está ativa |
| arquivada | boolean | Se está arquivada |

**Interligações:**
- `empresas` ← `profiles.empresa_id` (usuários da empresa)
- `empresas` ← `unidades_consumidoras.empresa_id` (UCs da empresa)
- `empresas` ← `relatorios.empresa_id` (relatórios)
- `empresas.matriz_id` → `empresas.id` (auto-referência filiais)

**Exportação:** CSV com nome, CNPJ, tipo, cidade, UF, status

---

### 3.3 Gestão de Usuários por Empresa (Admin)

**O que faz:** Admin cria, exclui e reseta senha de usuários vinculados a cada empresa. Limite de 2 usuários por empresa.

**Fluxo:**
1. Admin acessa `/admin/clientes/[id]` → seção "Usuários"
2. Vê lista de usuários com nome, email, telefone, data de criação
3. Cria novo usuário: nome, email, senha (mín. 6 caracteres), telefone
4. Sistema verifica limite (máx. 2 por empresa)
5. Usa `supabase.auth.admin.createUser()` para criar no auth
6. Profile é atualizado com `empresa_id` para vincular à empresa
7. Reset de senha: inline, apenas admin pode alterar
8. Exclusão: com confirmação, remove do auth via `admin.deleteUser()`

**Dados necessários:**
- Tabela `profiles`: id, nome, email, empresa_id, role='cliente', telefone
- Supabase Auth: email, password (gerenciado pelo admin)

**Regras:**
- Máximo 2 usuários por empresa
- Apenas admin pode criar/excluir/resetar senha
- Usuário não pode alterar sua própria senha (feito pelo admin)

---

### 3.4 Gestão de Unidades Consumidoras (Admin)

**O que faz:** Admin cadastra UCs por empresa com todos os dados técnicos do sistema fotovoltaico.

**Fluxo:**
1. Admin acessa `/admin/unidades` → lista com busca, filtro por empresa e status
2. Cria UC vinculada a uma empresa com dados técnicos completos
3. Pode desativar ou arquivar UCs
4. Na página de detalhes, vê specs técnicos completos

**Dados necessários (tabela `unidades_consumidoras`):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| empresa_id | uuid | FK para empresa dona |
| codigo_uc | text | Código na distribuidora |
| titular | text | Nome do titular |
| distribuidora | text | Ex: CEMIG, CPFL |
| enquadramento_tarifario | 'monofasico' \| 'bifasico' \| 'trifasico' | Tipo de ligação |
| modalidade_tarifaria | 'convencional' \| 'branca' \| 'verde' \| 'azul' | Modalidade |
| potencia_instalada_kwp | decimal | Potência em kWp |
| quantidade_modulos | integer | Qtd. de módulos |
| modelo_modulos | text | Fabricante/modelo |
| potencia_modulo_w | integer | Potência por módulo (W) |
| quantidade_inversores | integer | Qtd. de inversores |
| modelo_inversores | text | Fabricante/modelo |
| potencia_inversor_kw | decimal | Potência por inversor (kW) |
| data_instalacao | date | Data de instalação |
| geracao_estimada_mensal_kwh | decimal | Estimativa mensal (kWh) |
| ativa, arquivada | boolean | Status |

**Interligações:**
- `unidades_consumidoras.empresa_id` → `empresas.id`
- `unidades_consumidoras.id` ← `dados_geracao.uc_id`
- `unidades_consumidoras.id` ← `faturas.uc_id`
- `unidades_consumidoras.id` ← `relatorios.uc_id`

**Exportação:** CSV via tabela de UCs

---

### 3.5 Gestão de Faturas (Admin + Cliente)

**O que faz:** Admin insere dados de fatura manualmente com campos detalhados de energia fora ponta. Cliente faz upload de imagem/PDF da fatura.

#### Fluxo Admin (inserção manual):
1. Admin acessa `/admin/faturas/nova`
2. Seleciona UC e mês de referência
3. Preenche campos de identificação (denominação, contrato, ciclo)
4. Preenche campos de Energia Fora Ponta (energia faturada, tarifa, compensada, consumida, injetada)
5. Preenche valores totais (valor faturado, consumo, economia)
6. Anexa PDF via drag & drop (upload para Supabase Storage)
7. Status = "processada"

#### Fluxo Cliente (upload):
1. Cliente acessa `/cliente/fatura`
2. Seleciona UC e mês de referência
3. Arrasta imagem/PDF (JPG, PNG, PDF — máx. 10MB)
4. Preview da imagem antes de confirmar
5. Upload para Supabase Storage em `faturas/{empresaId}/{ucId}/{mes}.{ext}`
6. Status = "pendente" (aguarda processamento pelo admin)
7. Lista de faturas enviadas com status

**Dados necessários (tabela `faturas`):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| uc_id | uuid | UC da fatura |
| mes_referencia | date | Primeiro dia do mês |
| denominacao | text | Denominação na fatura |
| contrato | text | Número do contrato |
| valor_faturado | decimal(10,2) | Valor faturado (R$) |
| inicio_ciclo | date | Início do ciclo |
| fim_ciclo | date | Fim do ciclo |
| energia_faturada_fp | decimal(10,2) | Energia faturada Fora Ponta (kWh) |
| valor_tarifa_fp | decimal(10,6) | Tarifa Fora Ponta (R$/kWh) |
| kwh_compensado_fp | decimal(10,2) | kWh compensado Fora Ponta |
| tarifa_compensada_fp | decimal(10,6) | Tarifa da compensada FP (R$/kWh) |
| energia_consumida_fp | decimal(10,2) | Energia consumida Fora Ponta (kWh) |
| energia_injetada_fp | decimal(10,2) | Energia injetada Fora Ponta (kWh) |
| valor_total | decimal(10,2) | Valor total da fatura (R$) |
| consumo_kwh | decimal(10,2) | Consumo total (kWh) |
| economia_estimada | decimal(10,2) | Economia estimada (R$) |
| pdf_url | text | URL do PDF da fatura |
| imagem_url | text | URL da imagem (upload do cliente) |
| status | 'pendente' \| 'processada' \| 'erro' | Status do processamento |
| inserido_por | uuid | FK para quem inseriu |

**Página de detalhes:** `/admin/faturas/[id]` mostra todos os campos organizados em cards: Identificação, Energia Fora Ponta, Valores e totais. Botões para baixar PDF e ver imagem.

**Exportação:** CSV com empresa, UC, mês, contrato, valor, consumo, status

---

### 3.6 Gestão de Relatórios (Admin)

**O que faz:** Admin gera relatórios por UC/período, acompanha status de envio. Cliente vê apenas relatórios enviados.

**Fluxo de geração:**
1. Admin acessa `/admin/relatorios` → lista com busca e filtro por status
2. Clica "Gerar relatório" → seleciona UC e mês
3. Sistema busca automaticamente:
   - Dados da UC (código, empresa, geração estimada)
   - Dados de geração do período (`dados_geracao`)
   - Fatura do período (economia estimada)
4. Cria relatório com título formatado: "Relatório {mês} {ano} - {código UC}"
5. Status = "pendente"
6. Admin marca como "enviado" quando entrega ao cliente

**Dados necessários (tabela `relatorios`):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| uc_id | uuid | UC do relatório |
| empresa_id | uuid | Empresa (desnormalizado) |
| mes_referencia | date | Mês/ano de referência |
| titulo | text | Título do relatório |
| pdf_url | text | URL do PDF gerado |
| geracao_kwh | decimal | Geração do período |
| geracao_estimada_kwh | decimal | Estimado |
| economia_reais | decimal | Economia (R$) |
| indice_performance | 'bom' \| 'regular' \| 'ruim' | Indicador |
| status_envio | 'pendente' \| 'enviado' \| 'erro' | Status |
| gerado_por | 'automatico' \| 'manual' | Como foi gerado |
| fatura_id | uuid (nullable) | Fatura usada como base |

**Interligações:**
- Relatório puxa dados de `dados_geracao` e `faturas` do mesmo período/UC
- `relatorios.fatura_id` → `faturas.id` (opcional)
- Cliente vê apenas `status_envio = 'enviado'`

**Exportação:** CSV com empresa, UC, mês, geração, economia, performance, status

---

### 3.7 Tabela Tarifária (Admin)

**O que faz:** Admin gerencia tarifas TUSD/TE por distribuidora e posto tarifário, com edição parcial campo a campo.

**Fluxo:**
1. Admin acessa `/admin/tarifas` → lista com busca por distribuidora e filtro por modalidade
2. Cria tarifa: distribuidora, modalidade, posto tarifário, TUSD, TE, vigência
3. `valor_total` é calculado automaticamente (TUSD + TE)
4. **Edição inline:** clica no valor de TUSD ou TE na tabela para editar individualmente
5. Ao salvar campo individual, `valor_total` é recalculado
6. Vigência: `vigencia_inicio` obrigatório, `vigencia_fim` define se está expirada

**Dados necessários (tabela `tarifas`):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| distribuidora | text | Nome da distribuidora |
| modalidade | 'convencional' \| 'branca' \| 'verde' \| 'azul' | Modalidade |
| posto_tarifario | 'ponta' \| 'fora_ponta' \| 'intermediario' \| 'unico' | Posto |
| valor_tusd | decimal(10,6) | TUSD (R$/kWh) |
| valor_te | decimal(10,6) | TE (R$/kWh) |
| valor_total | decimal(10,6) | TUSD + TE (calculado) |
| vigencia_inicio | date | Início da vigência |
| vigencia_fim | date (nullable) | Fim (null = vigente) |
| ativa | boolean | Vigente ou expirada |

**Exportação:** CSV com distribuidora, modalidade, posto, TUSD, TE, total, vigência, status

---

### 3.8 Dashboard do Cliente

**O que faz:** Dashboard principal com KPIs de geração, economia e performance, e gráfico comparativo dos últimos 12 meses.

**Fluxo:**
1. Cliente acessa `/cliente/dashboard`
2. Sistema identifica empresa(s) acessíveis:
   - **Matriz:** agrega dados da própria empresa + todas as filiais
   - **Filial:** apenas seus próprios dados
3. Busca UCs ativas de todas as empresas acessíveis
4. Para o mês selecionado (ou atual), calcula:
   - **Geração total:** soma de `dados_geracao.geracao_kwh` de todas as UCs
   - **Estimado:** soma de `dados_geracao.geracao_estimada_kwh`
   - **Economia:** soma de `faturas.economia_estimada`
   - **Performance:** média de `performance_ratio`
     - ≥ 80% → Bom (verde)
     - ≥ 60% → Regular (amarelo)
     - < 60% → Ruim (vermelho)
5. Gráfico: barras de geração real vs estimado (últimos 12 meses)

**Dados necessários:**
- `dados_geracao`: geracao_kwh, geracao_estimada_kwh, performance_ratio, indice_performance
- `faturas`: economia_estimada
- `unidades_consumidoras`: geracao_estimada_mensal_kwh
- `empresas`: tipo (para determinar acesso matriz/filial)

**Filtros:** Seletor de mês/ano para mudar o período exibido nos cards

---

### 3.9 Dashboard do Admin

**O que faz:** Visão geral do sistema com contadores globais e dados individuais por empresa.

**Cards de overview:**
- Total de empresas (não-arquivadas)
- Total de UCs (não-arquivadas)
- Relatórios pendentes (`status_envio = 'pendente'`)
- Faturas pendentes (`status = 'pendente'`)

**Seção "Dados por empresa":** Para cada empresa ativa, mostra:
- Nome da empresa
- Badge de performance (se disponível)
- Geração total do mês (kWh)
- Economia total do mês (R$)
- Quantidade de UCs
- Relatórios pendentes
- Link para detalhes da empresa

---

### 3.10 Histórico de Relatórios (Cliente)

**O que faz:** Lista de relatórios mensais enviados pela equipe Lumix, com download de PDF.

**Fluxo:**
1. Cliente acessa `/cliente/historico`
2. Busca relatórios com `status_envio = 'enviado'` para todas as empresas acessíveis
3. Exibe lista ordenada por data (mais recente primeiro)
4. Cada item mostra: mês, UC, geração, economia, performance, botão download PDF
5. Empty state quando não há relatórios

**Dados necessários:**
- `relatorios`: titulo, mes_referencia, geracao_kwh, economia_reais, indice_performance, pdf_url
- Filtrado por `empresa_id` IN (empresas acessíveis) e `status_envio = 'enviado'`

---

### 3.11 Dados da Usina (Cliente)

**O que faz:** Exibição somente leitura dos dados cadastrais e técnicos das UCs.

**Fluxo:**
1. Cliente acessa `/cliente/usina`
2. Busca UCs ativas de todas as empresas acessíveis
3. Exibe em 3 cards por UC:
   - **Dados cadastrais:** titular, código, distribuidora, endereço, enquadramento, modalidade
   - **Equipamentos:** potência, módulos (qtd x modelo), inversores (qtd x modelo)
   - **Geração:** estimativa mensal, data de instalação, observações

**Dados necessários:**
- `unidades_consumidoras`: todos os campos técnicos
- Nenhum botão de edição — somente leitura

---

### 3.12 Exportação CSV

**O que faz:** Exporta os dados da tabela atual para arquivo CSV (compatível com Excel).

**Disponível em:**
- Lista de clientes (empresas)
- Lista de unidades consumidoras
- Lista de faturas
- Lista de relatórios
- Lista de tarifas

**Implementação:**
- Geração client-side via `lib/export-csv.ts`
- UTF-8 BOM para compatibilidade com Excel
- Exporta dados filtrados (respeita busca/filtros aplicados)

---

## 4. Modelo de Dados e Relacionamentos

```
profiles ──── pertence a ────→ empresas
                                  │
                          ┌───────┼───────┐
                          │       │       │
                       filiais  UCs    relatórios
                          │       │
                          │   ┌───┼───┐
                          │   │       │
                       dados_geracao  faturas
                                        │
                                    relatórios (fatura_id)

tarifas (independente — referência por distribuidora)
```

### Cardinalidades
- 1 empresa → N profiles (máx. 2 clientes)
- 1 empresa → N unidades_consumidoras
- 1 empresa → N filiais (auto-referência)
- 1 UC → N dados_geracao (1 por mês)
- 1 UC → N faturas (1 por mês)
- 1 UC → N relatórios
- 1 relatório → 0..1 fatura (opcional)

### Restrições de Unicidade
- `empresas.cnpj` — UNIQUE
- `(uc_id, mes_referencia)` em `dados_geracao` — UNIQUE
- `(uc_id, mes_referencia)` em `faturas` — UNIQUE
- `(distribuidora, modalidade, posto_tarifario, vigencia_inicio)` em `tarifas` — UNIQUE

---

## 5. Segurança

### Row Level Security (RLS)
Todas as 7 tabelas têm RLS habilitado. Funções `SECURITY DEFINER` (`get_user_role()`, `get_user_empresa_id()`) evitam recursão.

| Tabela | Admin | Cliente |
|--------|-------|---------|
| profiles | CRUD total | Lê/edita apenas seu próprio |
| empresas | CRUD total | Lê apenas sua empresa + filiais |
| unidades_consumidoras | CRUD total | Lê apenas UCs da sua empresa |
| dados_geracao | CRUD total | Lê apenas dados das suas UCs |
| faturas | CRUD total | Lê suas + insere para suas UCs |
| relatorios | CRUD total | Lê apenas status_envio='enviado' |
| tarifas | CRUD total | Lê todas (referência) |

### Validações
- CNPJ: algoritmo de dígitos verificadores (client + server)
- Senhas: mínimo 6 caracteres
- Uploads: tipos permitidos (JPG, PNG, PDF), tamanho máx. 10MB
- Valores monetários: `decimal(10,2)` — nunca float
- Tarifas: `decimal(10,6)` para precisão em R$/kWh
- Defense in depth: filtro por `empresa_id` nas queries + RLS no banco

---

## 6. Acesso Matriz/Filial

### Lógica de Acesso
Implementada via `getEmpresaIdsAcessiveis(empresaId)`:

```
Se empresa.tipo == 'matriz':
  retorna [empresa_id, filial_1_id, filial_2_id, ...]
  
Se empresa.tipo == 'filial':
  retorna [empresa_id]  (apenas sua própria)
```

### Impacto nas Queries
Todas as queries do cliente usam `.in("empresa_id", empresaIds)`:
- Dashboard: agrega geração/economia de todas as empresas acessíveis
- Usina: mostra UCs de todas as empresas acessíveis
- Histórico: mostra relatórios de todas as empresas acessíveis
- Faturas: mostra faturas de todas as UCs acessíveis

---

## 7. Integrações Externas

| Serviço | Uso | Status |
|---------|-----|--------|
| Supabase Auth | Autenticação email/senha | Ativo |
| Supabase Storage | Upload de imagens/PDFs de fatura | Ativo |
| BrasilAPI | Consulta CNPJ (auto-fill empresa) | Ativo |
| ViaCEP | Consulta CEP (auto-fill endereço) | Ativo |
| IBGE | Lista de cidades por UF | Ativo |
| API OCR (TBD) | Processamento de imagem de fatura | Futuro |
| Gerador de PDF (TBD) | Geração de PDF de relatório | Futuro |

---

## 8. Variáveis de Ambiente

| Variável | Propósito | Exposta ao browser? |
|----------|-----------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon (respeitada pelo RLS) | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin (bypassa RLS) | Não |

Arquivo: `env/.env.local` (nunca commitar)

---

## 9. Estrutura de Rotas

### Públicas
| Rota | Descrição |
|------|-----------|
| `/login` | Login |
| `/signup` | Criação de conta |
| `/reset-password` | Recuperação de senha |

### Admin (`/admin/*`)
| Rota | Descrição |
|------|-----------|
| `/admin/dashboard` | Visão geral + dados por empresa |
| `/admin/clientes` | Lista de empresas |
| `/admin/clientes/novo` | Cadastrar empresa |
| `/admin/clientes/[id]` | Detalhes + usuários + UCs + filiais |
| `/admin/clientes/[id]/editar` | Editar empresa |
| `/admin/unidades` | Lista de UCs |
| `/admin/unidades/nova` | Cadastrar UC |
| `/admin/unidades/[id]` | Detalhes da UC |
| `/admin/unidades/[id]/editar` | Editar UC |
| `/admin/faturas` | Lista de faturas |
| `/admin/faturas/nova` | Inserir fatura (manual) |
| `/admin/faturas/[id]` | Detalhes da fatura |
| `/admin/relatorios` | Lista de relatórios |
| `/admin/tarifas` | Tabela tarifária (com edição inline) |

### Cliente (`/cliente/*`)
| Rota | Descrição |
|------|-----------|
| `/cliente/dashboard` | Dashboard com KPIs e gráfico |
| `/cliente/historico` | Relatórios enviados + download PDF |
| `/cliente/usina` | Dados técnicos da UC (read-only) |
| `/cliente/fatura` | Upload de fatura + lista de enviadas |

---

## 10. Funcionalidades Futuras (Pós-MVP)

- **OCR automático de faturas:** API externa processa imagem → preenche `dados_extraidos` (JSONB)
- **Geração automática de relatórios:** trigger na criação de fatura
- **Notificações por email:** envio de relatórios ao cliente
- **Geração de PDF:** serviço para gerar PDF formatado dos relatórios
- **Integração com inversores:** dados de geração via API dos fabricantes
- **Dashboard em tempo real:** Supabase Realtime para atualização live
