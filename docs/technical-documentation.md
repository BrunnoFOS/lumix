# Lumix — Documentacao Tecnica Completa

**Ultima atualizacao:** 2026-06-12
**Status:** MVP em producao (v1.1)

---

## INVENTARIO DO PROJETO

| Categoria | Quantidade | Localizacao |
|-----------|-----------|-------------|
| Paginas (pages) | 25 | `app/` |
| Componentes | ~57 | `components/` |
| Server Actions | 15 | `lib/actions/` |
| Hooks | 4 | `hooks/` |
| Utilitarios | 3 | `lib/` |
| Supabase clients | 3 | `lib/supabase/` |
| Types | 1 | `types/database.ts` |
| API routes | 2 | `app/api/cron/` |
| Migrations | 23 | `supabase/migrations/` |
| **Total TS/TSX** | **135 arquivos** | |
| **Total linhas** | **~17.954** | |

---

# 1. FUNCIONALIDADES — Documentacao Individual

---

## 1.1 Autenticacao e Autorizacao

### Visao Geral

- **Objetivo:** Login email/senha, registro de novos usuarios, recuperacao de senha, redirecionamento por role
- **Arquivos envolvidos:**
  - `lib/actions/auth.ts` — Server Actions: `login()`, `signup()`, `resetPassword()`, `logout()`
  - `app/(auth)/login/login-form.tsx` — Formulario de login (Client Component)
  - `app/(auth)/signup/signup-form.tsx` — Formulario de signup
  - `app/(auth)/reset-password/reset-form.tsx` — Formulario de reset
  - `app/(auth)/auth/callback/route.ts` — OAuth callback
  - `lib/supabase/middleware.ts` — Refresh de sessao
  - `lib/supabase/server.ts` — Criacao de clients Supabase

### Origem dos Dados

**Banco de Dados:**

- `auth.users` (Supabase Auth) — credenciais
- `profiles` — campo `role` (admin/cliente) para routing

**Servicos Externos:**

- Supabase Auth — `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `exchangeCodeForSession`

### Fluxo de Execucao

```
1. Usuario submete formulario de login
2. login() em auth.ts:6 recebe FormData (email + password)
3. Validacao: email e senha nao podem ser vazios (auth.ts:10-12)
4. Supabase Auth: signInWithPassword (auth.ts:16-18)
5. Se erro -> retorna { error: "Email ou senha incorretos." }
6. Se ok -> busca user via getUser()
7. Busca profile via createServiceClient() (bypassa RLS para evitar recursao)
   -> auth.ts:36-39: serviceClient.from("profiles").select("role").eq("id", user.id)
8. Retorna { redirectTo: "/admin/dashboard" } ou { redirectTo: "/cliente/dashboard" }
9. LoginForm (login-form.tsx:17-19): useEffect detecta redirectTo e chama router.push()
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Senha minima 6 caracteres no signup | `password.length < 6` | `auth.ts:57` |
| Email duplicado no signup retorna erro amigavel | `error.message.includes("already registered")` | `auth.ts:72-73` |
| Novos signups entram como `cliente` | Trigger `handle_new_user()` insere `role='cliente'` | `schema.md` |
| Login usa service client para buscar profile | Evita recursao na RLS policy do admin | `auth.ts:34-39` |
| Logout redireciona para `/login` | `redirect("/login")` | `auth.ts:104` |

### Integracoes

- **Supabase Auth** — email/password. Nenhum provider OAuth configurado.
- **Auth callback** (`app/(auth)/auth/callback/route.ts`) — troca code por sessao e redireciona por role.

---

## 1.2 Gestao de Empresas (Admin)

### Visao Geral

- **Objetivo:** CRUD completo de empresas clientes com validacao CNPJ, soft delete, arquivamento e suporte a grupos empresariais
- **Arquivos envolvidos:**
  - `lib/actions/empresas.ts` — `createEmpresa()`, `updateEmpresa()`, `toggleEmpresa()`, `arquivarEmpresa()`, `getEmpresas()`, `getEmpresa()`, `getEmpresaComRelacionamentos()`
  - `app/(admin)/admin/clientes/page.tsx` — Listagem
  - `app/(admin)/admin/clientes/novo/page.tsx` — Criacao
  - `app/(admin)/admin/clientes/[id]/page.tsx` — Detalhes
  - `app/(admin)/admin/clientes/[id]/editar/page.tsx` — Edicao
  - `components/admin/ClienteForm.tsx` — Formulario
  - `components/admin/ClienteTable.tsx` — Tabela
  - `components/admin/ClienteSearch.tsx` — Busca
  - `hooks/use-cnpj-lookup.ts` — Consulta Brasil API
  - `hooks/use-cep-lookup.ts` — Consulta ViaCEP

### Origem dos Dados

**Banco de Dados:**

- `empresas` — CRUD principal
- `unidades_consumidoras` — UCs vinculadas (via `empresa_id`)
- `profiles` — Usuarios da empresa
- `grupos_empresariais` — Grupo ao qual pertence (via `grupo_id`)

**APIs Externas:**

| API | Endpoint | Metodo | Resposta consumida | Arquivo |
|-----|----------|--------|-------------------|---------|
| Brasil API | `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` | GET | razao_social, logradouro, municipio, uf, cep, telefone, email | `hooks/use-cnpj-lookup.ts:32` |
| ViaCEP | `https://viacep.com.br/ws/{cep}/json/` | GET | logradouro, bairro, localidade (cidade), uf | `hooks/use-cep-lookup.ts:27` |

### Fluxo de Execucao — Criacao

```
1. Admin acessa /admin/clientes/novo
2. page.tsx busca getGruposSimples() para popular select de grupos
3. ClienteForm renderiza com campos: nome, CNPJ, endereco, contato, grupo
4. Ao digitar CNPJ: hook useCNPJLookup() consulta Brasil API e preenche campos
5. Ao digitar CEP: hook useCEPLookup() consulta ViaCEP e preenche endereco
6. Submit -> createEmpresa() em empresas.ts:12
7. Validacoes:
   a. Nome e CNPJ obrigatorios (empresas.ts:26-28)
   b. validateCNPJ() — verifica 14 digitos + check digits (utils.ts:47-62)
   c. cleanCNPJ() — remove mascara antes de salvar (utils.ts:64-66)
8. Insert em empresas com grupo_id opcional
9. Se erro 23505 (unique violation): "CNPJ ja cadastrado."
10. revalidatePath("/admin/clientes")
11. Retorna { data: { id } }
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| CNPJ salvo sem mascara (apenas digitos) | `cleanCNPJ()` antes do insert | `empresas.ts:16` |
| CNPJ unico no banco | UNIQUE constraint no PostgreSQL | `schema.md` |
| Validacao de CNPJ com digitos verificadores | Algoritmo completo em `validateCNPJ()` | `utils.ts:47-62` |
| Soft delete via campo `ativa` (nao remove do banco) | `toggleEmpresa()` | `empresas.ts:115-132` |
| Arquivamento separado de desativacao | Campo `arquivada` | `empresas.ts:134-150` |
| Filtros de listagem: ativas, inativas, arquivadas | Query condicional | `empresas.ts:161-169` |
| Detalhe mostra empresas do mesmo grupo | `getEmpresaComRelacionamentos()` | `empresas.ts:193-229` |

---

## 1.3 Gestao de UCs (Admin)

### Visao Geral

- **Objetivo:** CRUD de unidades consumidoras, vinculacao a provedores (Solis/SunGrow), classificacao tarifaria, parametros de estimativa
- **Arquivos envolvidos:**
  - `lib/actions/unidades.ts` — `createUC()`, `updateUC()`, `vincularSolisUC()`, `vincularStationAUC()`, `updateClassificacaoTarifaria()`, `updateParametrosEstimativa()`, `getUCs()`, `getUC()`, `getUCsComStations()`
  - `app/(admin)/admin/unidades/page.tsx` — Listagem com stations Solis/SunGrow
  - `app/(admin)/admin/unidades/[id]/page.tsx` — Detalhes
  - `components/admin/UCClassificacaoTarifaria.tsx` — Formulario tarifario
  - `components/admin/UCParametrosEstimativa.tsx` — Fator rendimento/degradacao
  - `components/admin/VincularSolisUC.tsx` — Vinculacao de station a empresa

### Origem dos Dados

**Banco de Dados:**

- `unidades_consumidoras` — Dados tecnicos completos
- `uc_stations` — Juncao UC <-> station_id (multi-provider)
- `usinas_cache` — Dados das stations (populado via cron)
- `empresas` — Relacionamento via empresa_id

### Fluxo de Execucao — Vinculacao Solis/SunGrow

```
1. Admin acessa /admin/unidades -> ve lista de stations do cache
2. Admin clica "Vincular" em uma station nao vinculada
3. VincularSolisUC mostra select de empresas -> admin escolhe empresa destino
4. vincularSolisUC() em unidades.ts:404:
   a. Verifica se station_id ja esta vinculado (uc_stations, unidades.ts:411-419)
   b. Detecta provider via usinas_cache (unidades.ts:422-426)
   c. Busca UCs da empresa com nome similar normalizado (unidades.ts:432-441)
   d. SE UC COM MESMO NOME EXISTE -> vincula station a ela (multi-provedor):
      - Insert em uc_stations (unidades.ts:445-449)
      - SOMA potencia e inversores na UC existente (unidades.ts:456-469)
   e. SE NAO EXISTE -> cria nova UC:
      - Parseia cidade/UF do campo cidade_uf (unidades.ts:479-486)
      - Insert em unidades_consumidoras (unidades.ts:489-507)
      - Insert em uc_stations (unidades.ts:515-518)
5. revalidatePath em /admin/clientes e /admin/unidades
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| 1 station_id pertence a no maximo 1 UC | UNIQUE constraint em `uc_stations.station_id` | `20260529_uc_stations.sql:11` |
| 1 UC pode ter multiplas stations (multi-provedor) | Tabela de juncao `uc_stations` | `20260529_uc_stations.sql:1-2` |
| Vinculacao de station com mesmo nome -> soma potencia | `ucExistente -> potencia += nova` | `unidades.ts:456-469` |
| Potencia instalada obrigatoria e > 0 | `potencia_instalada_kwp <= 0` -> erro | `unidades.ts:39-41` |
| Quantidade de inversores obrigatoria e > 0 | `quantidade_inversores <= 0` -> erro | `unidades.ts:43-45` |
| UC sem classificacao tarifaria e incompleta | Visual indicator no componente | `UCClassificacaoTarifaria.tsx` |

---

## 1.4 Dashboard do Cliente

### Visao Geral

- **Objetivo:** Exibir KPIs de geracao solar, grafico comparativo 12 meses, indicador de performance
- **Arquivos envolvidos:**
  - `app/(cliente)/cliente/dashboard/page.tsx` — Server Component
  - `lib/actions/profile.ts` — `getCurrentProfile()`, `getEmpresaIdsAcessiveis()`
  - `lib/actions/dados-geracao.ts` — `getResumoGeracaoCliente()`, `getDadosGeracaoCliente()`
  - `components/cliente/DashboardCards.tsx` — 4 KPI cards
  - `components/cliente/GeracaoChart.tsx` — Grafico Recharts
  - `components/cliente/DashboardPeriodFilter.tsx` — Filtro de mes
  - `components/cliente/PerformanceIndicator.tsx` — Badge bom/regular/ruim

### Origem dos Dados

**Banco de Dados:**

- `profiles` — empresa_id do usuario logado
- `empresas` — grupo_id (para descobrir empresas acessiveis)
- `unidades_consumidoras` — UCs ativas da empresa
- `dados_geracao` — geracao real + estimada por UC/mes
- `faturas` — economia_estimada por UC/mes

### Fluxo de Execucao

```
1. Cliente acessa /cliente/dashboard
2. getCurrentProfile() -> busca profile via auth.getUser() + serviceClient
3. getEmpresaIdsAcessiveis(empresa_id):
   a. Busca empresa do usuario (profile.ts:34-38)
   b. SE empresa.grupo_id existe:
      -> Busca TODAS as empresas do mesmo grupo (profile.ts:43-49)
      -> Retorna array de IDs
   c. SE nao tem grupo: retorna [empresa_id]
4. Em paralelo:
   a. getResumoGeracaoCliente(empresaIds, mes):
      - Busca UCs ativas de TODAS as empresas acessiveis (dados-geracao.ts:63-67)
      - Busca dados_geracao + faturas do mes_referencia (dados-geracao.ts:76-87)
      - Soma: geracao_total, estimada_total, economia_total
      - Calcula performance media: avgRatio de performance_ratios
      - Classifica: >= 98 = bom, >= 90 = regular, < 90 = ruim
   b. getDadosGeracaoCliente(empresaIds):
      - Busca todos os dados_geracao das UCs (dados-geracao.ts:5-28)
5. page.tsx agrega dados por mes para o grafico (ultimos 12 meses)
6. Renderiza DashboardCards + GeracaoChart
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Cliente ve dados de TODAS as empresas do seu grupo | `getEmpresaIdsAcessiveis()` expande por grupo_id | `profile.ts:30-54` |
| Somente UCs ativas entram no calculo | `.eq("ativa", true)` | `dados-geracao.ts:66` |
| Performance: PR >= 98% = bom, >= 90% = regular, < 90% = ruim | Calculo de media dos PR | `dados-geracao.ts:98-101` |
| Se nao ha dados, performance = null (nao exibe badge) | `avgRatio === null -> performance = null` | `dados-geracao.ts:97` |
| Grafico mostra ultimos 12 meses | `.slice(-12)` | `dashboard/page.tsx` |
| Filtro de mes via searchParam `?mes=` | `params.mes` passado para getResumo | `dashboard/page.tsx` |

---

## 1.5 Gestao de Faturas (Admin)

### Visao Geral

- **Objetivo:** Insercao manual de dados de fatura, upload de arquivo, disparo de webhook para processamento
- **Arquivos envolvidos:**
  - `lib/actions/faturas.ts` — `createFatura()`, `updateFatura()`, `getFaturas()`, `getFatura()`, `createFaturaCliente()`, `createFaturaComGeracao()`
  - `app/(admin)/admin/faturas/page.tsx` — Listagem
  - `app/(admin)/admin/faturas/nova/page.tsx` — Criacao
  - `app/(admin)/admin/faturas/[id]/page.tsx` — Detalhes
  - `components/admin/FaturaForm.tsx` — Formulario
  - `components/admin/FaturaTable.tsx` — Tabela
  - `components/admin/FaturaSearch.tsx` — Busca

### Origem dos Dados

**Banco de Dados:**

- `faturas` — todos os campos da conta de luz
- `unidades_consumidoras` + `empresas` — relacionamentos

**APIs Externas:**

| API | Endpoint | Metodo | Payload | Arquivo:Linha |
|-----|----------|--------|---------|---------------|
| n8n webhook | `https://n8n-n8n.nt4zcb.easypanel.host/webhook/1f12ba76-...` | POST | `{ fatura_id, uc_id, mes_referencia, arquivo_url, role, user_id }` | `faturas.ts:14-32` |

### Fluxo de Execucao — createFatura (Admin Manual)

```
1. Admin preenche formulario com todos os campos da fatura
2. createFatura() em faturas.ts:44:
   a. Valida: uc_id e mes_referencia obrigatorios (faturas.ts:53-56)
   b. Busca user autenticado (faturas.ts:58-60)
   c. Insert em faturas com status "processada" (faturas.ts:62-91)
   d. Se erro 23505: "Ja existe fatura para esta UC neste mes."
   e. Busca role do inseridor (faturas.ts:104-108)
   f. Dispara webhook n8n com payload (faturas.ts:110-117)
   g. revalidatePath("/admin/faturas")
```

### Fluxo de Execucao — createFaturaCliente (Upload pelo Cliente)

```
1. Cliente acessa /cliente/fatura
2. FaturaUpload: seleciona UC, mes, faz upload de imagem/PDF
3. Arquivo vai para Supabase Storage
4. createFaturaCliente() em faturas.ts:261:
   a. Insert em faturas com status "pendente" + imagem_url
   b. Dispara mesmo webhook n8n
   c. n8n processa (OCR via LlamaParse + Gemini) -> cria faturas_processadas
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Constraint unique (uc_id, mes_referencia) | Erro 23505 tratado | `faturas.ts:95-96` |
| Fatura manual do admin entra como "processada" | `status: "processada"` | `faturas.ts:88` |
| Upload do cliente entra como "pendente" | `status: "pendente"` | `faturas.ts:282` |
| Webhook disparado em AMBOS os casos | `enviarWebhookFatura()` | `faturas.ts:14-32` |

---

## 1.6 Faturas Processadas (Rel. Fatura)

### Visao Geral

- **Objetivo:** Gerenciar faturas extraidas automaticamente por IA (LlamaParse + Gemini), permitir edicao e regeracao de PDF
- **Arquivos envolvidos:**
  - `lib/actions/faturas-processadas.ts` — `getFaturasProcessadas()`, `getFaturaProcessada()`, `updateFaturaProcessada()`, `regerarRelatorioFatura()`
  - `app/(admin)/admin/faturas-processadas/page.tsx` — Listagem
  - `app/(admin)/admin/faturas-processadas/[id]/page.tsx` — Server Component
  - `app/(admin)/admin/faturas-processadas/[id]/detalhe-client.tsx` — Client Component
  - `components/admin/FaturaProcessadaEditForm.tsx` — Formulario de edicao

### Origem dos Dados

**Banco de Dados:**

- `faturas_processadas` — dados extraidos + PDF gerado
- `unidades_consumidoras` — grupo_tarifario para exibicao
- `empresas` — nome para listagem

**APIs Externas:**

| API | Endpoint | Metodo | Payload | Resposta | Arquivo:Linha |
|-----|----------|--------|---------|----------|---------------|
| n8n webhook (regerar) | `https://n8n-n8n.nt4zcb.easypanel.host/webhook/1f12ba76-...` | POST | `{ fatura_id, campos_editados, admin_id }` | `{ status: "ok", pdf_url }` | `faturas-processadas.ts:155-165` |

### Fluxo de Execucao — Regeracao de PDF

```
1. Admin edita campos extraidos no formulario
2. Clica "Regerar relatorio"
3. regerarRelatorioFatura() em faturas-processadas.ts:113:
   a. Update campos + status -> "gerando" + ultima_edicao_at + editado_por
   b. Monta credenciais N8N (Basic Auth)
   c. POST para webhook n8n com campos editados
   d. Se resposta ok + pdf_url:
      -> Update pdf_relatorio_url + status "gerado"
   e. Se erro:
      -> Update status "erro"
      -> Tenta reverter para "extraido" se falha de credenciais
4. PDF sobrescreve o anterior (sem historico de versoes)
```

### Estados da Pipeline

```
extraindo -> extraido -> gerando -> gerado
     |          |          |
    erro       erro       erro
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Cada regeracao sobrescreve PDF anterior | Update `pdf_relatorio_url` | `faturas-processadas.ts:182-186` |
| Status "gerando" e temporario durante webhook | Set antes, update apos resposta | `faturas-processadas.ts:126-129` |
| Rollback de status em caso de erro | Multiplos pontos de recuperacao | `faturas-processadas.ts:147,191,196` |
| Observacao do admin aparece no rodape do relatorio | Campo `observacao` | `schema.md` |

---

## 1.7 Relatorios

### Visao Geral

- **Objetivo:** Criacao manual de relatorios pelo admin, auto-calculo de geracao estimada, gestao de status de envio, download pelo cliente
- **Arquivos envolvidos:**
  - `lib/actions/relatorios.ts` — `createRelatorio()`, `criarRelatorioComAnexo()`, `updateRelatorioStatus()`, `arquivarRelatorio()`, `getRelatorios()`, `getRelatoriosCliente()`
  - `app/(admin)/admin/relatorios/page.tsx` — Listagem admin
  - `app/(cliente)/cliente/historico/page.tsx` — Historico cliente
  - `components/admin/RelatorioTable.tsx` — Tabela admin
  - `components/admin/GerarRelatorioForm.tsx` — Formulario geracao
  - `components/cliente/RelatorioList.tsx` — Lista cliente

### Fluxo de Execucao — Criacao com Auto-calculo

```
1. Admin preenche: UC, empresa, mes, titulo, geracao real (opcional)
2. createRelatorio() em relatorios.ts:19:
   a. Valida campos obrigatorios (relatorios.ts:27-29)
   b. SE geracao_estimada nao fornecida:
      -> calcularGeracaoEstimadaUC(uc_id, mes_referencia, geracao_real)
      -> Retorna estimada + indice_performance (relatorios.ts:38-44)
   c. SE ambos fornecidos (real + estimada):
      -> PR = (real / estimada) * 100
      -> classificarDesempenho(PR) (relatorios.ts:46-49)
   d. Insert em relatorios com gerado_por = "manual"
   e. revalidatePath("/admin/relatorios")
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Relatorio enviado nao pode ser arquivado | `rel.status_envio === "enviado"` -> erro | `relatorios.ts:108-109` |
| Relatorio enviado nao pode ter PDF alterado | Mesma verificacao | `relatorios.ts:153-154` |
| Cliente so ve relatorios com status "enviado" | `.eq("status_envio", "enviado")` | `relatorios.ts:237` |
| Auto-calculo de geracao estimada se nao fornecida | `calcularGeracaoEstimadaUC()` | `relatorios.ts:38-44` |
| Listagem exclui arquivados | `.eq("arquivado", false)` | `relatorios.ts:177` |
| Titulo auto-gerado no criarRelatorioComAnexo | `"Relatorio {mes} - {codigo_uc}"` | `relatorios.ts:278` |

---

## 1.8 Tarifas ANEEL

### Visao Geral

- **Objetivo:** Importacao em massa de tarifas do BI da ANEEL, lookup por concessionaria/subgrupo/modalidade/posto/vigencia
- **Arquivos envolvidos:**
  - `lib/actions/tarifas-aneel.ts` — `importarTarifasAneel()`, `getTarifasAneel()`, `getOpcoesTarifarias()`, `lookupTarifas()`, `lookupTarifasUC()`
  - `app/(admin)/admin/tarifas/page.tsx`
  - `components/admin/TarifaTable.tsx`
  - `components/admin/ImportarTarifasAneel.tsx`

### Fluxo de Execucao — Importacao

```
1. Admin faz upload de planilha Excel/CSV com tarifas ANEEL
2. ImportarTarifasAneel parseia no client-side (xlsx library)
3. importarTarifasAneel(rows) em tarifas-aneel.ts:25:
   a. Filtra registros: apenas "Detalhe = Nao se aplica" (tarifa padrao)
   b. Normaliza: sigla uppercase, trim
   c. Envia em chunks de 3000 via RPC importar_tarifas_aneel()
   d. PostgreSQL faz ON CONFLICT DO NOTHING (evita duplicatas)
   e. Retorna { inseridos, duplicados, descartados }
```

### Fluxo de Execucao — Lookup para Relatorio

```
1. lookupTarifasUC(sigla, subgrupo, modalidade, grupoTarifario, mesReferencia):
   a. Chama lookupTarifas() com filtro de vigencia
   b. SE grupo_b:
      -> Busca posto "Nao se aplica" -> retorna { tusd, te }
   c. SE grupo_a ou acl:
      -> Busca postos "Ponta" e "Fora ponta"
      -> Retorna { tusd_ponta, te_ponta, tusd_fora_ponta, te_fora_ponta }
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Apenas tarifas "Nao se aplica" no detalhe sao importadas | Filtro em `validRows` | `tarifas-aneel.ts:36-41` |
| ON CONFLICT DO NOTHING previne duplicatas | RPC PostgreSQL | `tarifas-aneel.ts:68` |
| Lookup por vigencia: inicio <= ref AND (fim IS NULL OR fim >= ref) | `.lte` + `.or` | `tarifas-aneel.ts:233-235` |
| Grupo B = tarifa unica, Grupo A = ponta + fora ponta | Condicional em `lookupTarifasUC` | `tarifas-aneel.ts:275-296` |
| Cascata de filtros: grupo -> subgrupo -> sigla -> modalidade | `getOpcoesTarifarias()` com queries paralelas | `tarifas-aneel.ts:153-209` |

---

## 1.9 Impostos por Concessionaria

### Visao Geral

- **Objetivo:** Gerenciar aliquotas ICMS/PIS/COFINS por concessionaria com periodo de vigencia, calcular fator gross-up
- **Arquivos envolvidos:**
  - `lib/actions/impostos.ts` — `getImpostos()`, `getImpostoVigente()`, `createImposto()`, `deleteImposto()`
  - `lib/geracao-estimada.ts` — `calcularFatorImposto()`
  - `app/(admin)/admin/impostos/page.tsx`
  - `components/admin/ImpostosPageClient.tsx`

### Calculos

| Calculo | Formula | Variaveis | Arquivo:Linha |
|---------|---------|-----------|---------------|
| **Fator gross-up** | `1 / (1 - ICMS - PIS - COFINS)` | ICMS, PIS, COFINS da concessionaria vigente | `impostos.ts:57` e `geracao-estimada.ts:154-158` |
| **Protecao divisao por zero** | Se denominador <= 0, retorna 1 | — | `geracao-estimada.ts:157` |

### Fluxo de Lookup

```
getImpostoVigente(sigla, mesReferencia):
1. Query: concessionaria_sigla = sigla
2. Filtro vigencia: inicio <= mesRef AND (fim IS NULL OR fim >= mesRef)
3. Order by vigencia_inicio DESC, limit 1 (mais recente)
4. Calcula fator: 1 / (1 - icms - pis - cofins)
5. Arredonda para 4 casas decimais
```

---

## 1.10 Grupos Empresariais

### Visao Geral

- **Objetivo:** Agrupar empresas para que o cliente veja dados consolidados de todas as empresas do grupo
- **Arquivos envolvidos:**
  - `lib/actions/grupos.ts` — `createGrupo()`, `updateGrupo()`, `deleteGrupo()`, `getGrupos()`, `vincularEmpresaAoGrupo()`
  - `app/(admin)/admin/grupos/page.tsx`
  - `components/admin/GrupoPageClient.tsx`

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Deletar grupo desvincula empresas primeiro | `update empresas SET grupo_id = null WHERE grupo_id = id` | `grupos.ts:48-50` |
| Grupo afeta visibilidade do cliente | `getEmpresaIdsAcessiveis()` expande por grupo_id | `profile.ts:30-54` |
| Nome obrigatorio | `nome.trim()` vazio -> erro | `grupos.ts:12` |

---

## 1.11 Gestao de Usuarios

### Visao Geral

- **Objetivo:** Admin cria/remove usuarios clientes vinculados a empresas com limite de 2 por empresa
- **Arquivos envolvidos:**
  - `lib/actions/usuarios.ts` — `getUsuariosEmpresa()`, `createUsuario()`, `resetSenhaUsuario()`, `deleteUsuario()`

### Fluxo de Execucao — Criacao

```
1. Admin acessa detalhes de empresa -> secao de usuarios
2. createUsuario() em usuarios.ts:27:
   a. Valida: nome, email, senha obrigatorios, senha >= 6 chars
   b. Conta usuarios existentes da empresa (usuarios.ts:46-50)
   c. Se count >= 2: "Limite de 2 usuarios por empresa atingido."
   d. Cria user via supabase.auth.admin.createUser() com email_confirm: true
   e. Update profile: vincula empresa_id + telefone
```

### Regras de Negocio

| Regra | Implementacao | Arquivo:Linha |
|-------|--------------|---------------|
| Maximo 2 usuarios por empresa | `MAX_USUARIOS_POR_EMPRESA = 2` | `usuarios.ts:11` |
| Usa service client (admin API) | `createServiceClient()` — bypassa RLS | `usuarios.ts:4` |
| Email confirmado automaticamente | `email_confirm: true` | `usuarios.ts:59` |
| Senha minima 6 caracteres | Validacao explicita | `usuarios.ts:38-40` |

---

# 2. CALCULOS E PROCESSAMENTOS

## 2.1 Geracao Estimada Mensal

**Formula:**

```
Geracao Estimada (kWh) = Potencia (kWp) x GHI (kWh/m2/dia) x Dias no Mes x Fator Rendimento x (1 - Degradacao Acumulada)
```

**Onde GHI e convertido:**

```
GHI (kWh/m2/dia) = GHI (Wh/m2/dia) / 1000
```

| Variavel | Origem | Tabela/Campo |
|----------|--------|-------------|
| Potencia (kWp) | UC | `unidades_consumidoras.potencia_instalada_kwp` |
| GHI (Wh/m2/dia) | Lookup municipal | `ghi_municipios.{jan,fev,...,dez}` por (nome, uf) |
| Dias no Mes | Calculado | `new Date(ano, mes+1, 0).getDate()` |
| Fator Rendimento | UC | `unidades_consumidoras.fator_rendimento` (ex: 0.95) |
| Degradacao Acumulada | Calculado | Ver formula abaixo |

**Arquivo:** `lib/geracao-estimada.ts:119-134`

---

## 2.2 Degradacao Acumulada

**Formula:**

```
Se idade < 1 ano: degradacao = degradacao_ano_zero
Se idade >= 1 ano: degradacao = degradacao_ano_zero + (anos_completos - 1) x degradacao_anos_seguintes
```

| Variavel | Origem |
|----------|--------|
| Data instalacao | `unidades_consumidoras.data_instalacao` |
| Degradacao ano zero | `unidades_consumidoras.degradacao_ano_zero` (ex: 0.02 = 2%) |
| Degradacao anos seguintes | `unidades_consumidoras.degradacao_anos_seguintes` (ex: 0.006 = 0.6%) |

**Arquivo:** `lib/geracao-estimada.ts:77-109`

---

## 2.3 Performance Ratio (PR)

**Formula:**

```
PR (%) = (Geracao Real / Geracao Estimada) x 100
```

**Classificacao:**

| PR | Classificacao |
|----|--------------|
| >= 98% | bom |
| 90% - 97.99% | regular |
| < 90% | ruim |

**Arquivo:** `lib/geracao-estimada.ts:143-147`

---

## 2.4 Fator Gross-up de Impostos

**Formula:**

```
Fator = 1 / (1 - ICMS - PIS - COFINS)
```

**Exemplo:** ICMS=18%, PIS=1.65%, COFINS=7.6% -> Fator = 1/(1-0.18-0.0165-0.076) = 1.3756

**Arquivo:** `lib/geracao-estimada.ts:154-158` e `lib/actions/impostos.ts:55-57`

---

## 2.5 GHI Lookup com Fallback

```
1. Normaliza nome do municipio (remove acentos, lowercase)
2. Converte estado para UF (2 chars)
3. Busca exata: ghi_municipios WHERE nome = ? AND uf = ?
4. Se nao encontrou: chama RPC ghi_media_uf(p_uf, p_coluna) -> media estadual
```

**Arquivo:** `lib/actions/geracao-estimada.ts:20-53`

---

## 2.6 Validacao de CNPJ

**Algoritmo:** Verifica digitos verificadores com pesos:

- D1: pesos [5,4,3,2,9,8,7,6,5,4,3,2] -> mod 11
- D2: pesos [6,5,4,3,2,9,8,7,6,5,4,3,2] -> mod 11

**Rejeita:** Todos digitos iguais, comprimento != 14

**Arquivo:** `lib/utils.ts:47-62`

---

# 3. INTEGRACOES EXTERNAS

## 3.1 n8n — Sync de Usinas (Solis + SunGrow)

| Item | Valor |
|------|-------|
| **Sistema** | n8n (self-hosted em EasyPanel) |
| **Objetivo** | Popular `usinas_cache` com dados das APIs Solis Cloud e SunGrow |
| **Endpoint trigger** | `GET /api/cron/sync-usinas?secret=CRON_SECRET` |
| **Webhooks chamados** | `POST .../webhook/sync-ucs-solis`, `POST .../webhook/sync-ucs-sungrow` |
| **Auth** | Basic Auth (N8N_API_USER:N8N_API_PASSWORD) |
| **Timeout** | 5 minutos por webhook |
| **Dados recebidos** | Array de `{ station_id, station_name, cidade_uf, potencia_instalada_kwp, qtd_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, inversores_detalhe }` |
| **Persistencia** | RPC `sync_usinas_cache(payload)` — upsert em massa |
| **Fallback** | Se cache vazio, Solis chama webhook direto com cache de 300s (unstable_cache) |
| **Tratamento de erro** | `try/catch`, log de erro, retorna `{ skipped: true }` |
| **Arquivo** | `app/api/cron/sync-usinas/route.ts`, `lib/actions/solis.ts:162-233` |

---

## 3.2 n8n — Sync de Alertas

| Item | Valor |
|------|-------|
| **Endpoint trigger** | `GET /api/cron/sync-alertas?secret=CRON_SECRET` |
| **Webhooks** | `POST .../webhook/sync-alarmes`, `POST .../webhook/sync-alarmes-sungrow` |
| **Dados** | Alertas normalizados: station_id, alarm_msg, alarm_level (tip/general/emergency), is_active, timestamps |
| **Persistencia** | RPC `sync_alertas_cache(p_provider, payload)` |
| **Limpeza** | Se webhook retorna vazio -> DELETE alertas do provider (cache limpo) |
| **Arquivo** | `app/api/cron/sync-alertas/route.ts`, `lib/actions/alertas.ts` |

---

## 3.3 n8n — Geracao Mensal Solis

| Item | Valor |
|------|-------|
| **Objetivo** | Buscar geracao diaria detalhada de um station_id em um mes |
| **Endpoint** | `POST .../webhook/solis-geracao-mensal?month={YYYY-MM}&station_id={id}` |
| **Resposta** | `SolisGeracaoMensal`: usina, periodo, totais (geracao_kwh, grid_sell, grid_purchased, home_load), metricas (media_diaria, melhor_dia, pior_dia, PR), projecao, dias[] |
| **Arquivo** | `lib/actions/solis.ts:53-96` |

---

## 3.4 n8n — Geracao Mensal SunGrow

| Item | Valor |
|------|-------|
| **Endpoint** | `POST .../webhook/geracao-mensal-sungrow` com body `{ station_id, month }` |
| **Resposta** | Normalizada para o mesmo formato `SolisGeracaoMensal` |
| **Arquivo** | `lib/actions/solis.ts:250-380` (aprox.) |

---

## 3.5 n8n — Processamento de Fatura

| Item | Valor |
|------|-------|
| **Objetivo** | Receber fatura (PDF/imagem), processar via LlamaParse + Gemini, extrair dados, gerar relatorio PDF |
| **Endpoint** | `POST .../webhook/1f12ba76-a38d-4a8f-9441-db04f017c72f` |
| **Payload (criacao)** | `{ fatura_id, uc_id, mes_referencia, arquivo_url, role, user_id }` |
| **Payload (regeracao)** | `{ fatura_id, campos_editados, admin_id }` |
| **Resposta (regeracao)** | `{ status: "ok", pdf_url }` ou `{ mensagem: "erro" }` |
| **Arquivo** | `lib/actions/faturas.ts:7-8`, `lib/actions/faturas-processadas.ts:6-7` |

---

## 3.6 ViaCEP

| Item | Valor |
|------|-------|
| **Objetivo** | Auto-preencher endereco ao digitar CEP |
| **Endpoint** | `GET https://viacep.com.br/ws/{cep}/json/` |
| **Campos consumidos** | logradouro, bairro, localidade (cidade), uf |
| **Arquivo** | `hooks/use-cep-lookup.ts` |

---

## 3.7 Brasil API

| Item | Valor |
|------|-------|
| **Objetivo** | Auto-preencher dados ao digitar CNPJ |
| **Endpoint** | `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}` |
| **Campos consumidos** | razao_social, logradouro, numero, bairro, municipio, uf, cep, telefone, email |
| **Arquivo** | `hooks/use-cnpj-lookup.ts` |

---

## 3.8 IBGE — Municipios

| Item | Valor |
|------|-------|
| **Objetivo** | Listar cidades de um estado para select de formulario |
| **Endpoint** | `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios?orderBy=nome` |
| **Arquivo** | `hooks/use-cidades.ts` |

---

# 4. ARQUITETURA

## 4.1 Diagrama de Componentes

```
+-------------------------------------------------------------+
|                        BROWSER                               |
|                                                              |
|  +-------------+  +--------------+  +-------------------+   |
|  | Auth Pages   |  | Admin Layout |  | Cliente Layout    |   |
|  | (auth)/      |  | (admin)/     |  | (cliente)/        |   |
|  | - login      |  | - sidebar    |  | - header          |   |
|  | - signup     |  | - 25 pages   |  | - 4 pages         |   |
|  | - reset      |  | - forms      |  | - dashboard       |   |
|  +------+-------+  +------+-------+  +------+-----------+   |
|         |                  |                  |              |
|         +------------------+------------------+              |
|                            | Server Actions                  |
+----------------------------+---------------------------------+
                             |
+----------------------------+---------------------------------+
|                     NEXT.JS SERVER                            |
|                            |                                  |
|  +-------------------------v------------------------------+   |
|  |              lib/actions/ (15 Server Actions)           |  |
|  |  auth, empresas, unidades, faturas, relatorios,        |  |
|  |  solis, tarifas-aneel, dados-geracao, alertas,         |  |
|  |  geracao-estimada, faturas-processadas, grupos,        |  |
|  |  impostos, profile, usuarios                           |  |
|  +-----------+----------------------+---------------------+   |
|              |                      |                         |
|  +-----------v-----------+  +------v----------------------+   |
|  | lib/supabase/         |  | app/api/cron/              |   |
|  | - server.ts (anon)    |  | - sync-usinas/route.ts     |   |
|  | - server.ts (service) |  | - sync-alertas/route.ts    |   |
|  | - middleware.ts       |  | (service role client)      |   |
|  +-----------+-----------+  +------+----------------------+   |
+--------------+----------------------+-------------------------+
               |                      |
+--------------v----------------------v-------------------------+
|                     SUPABASE                                  |
|                                                               |
|  +--------------+  +-------------+  +----------------------+  |
|  | PostgreSQL   |  | Auth        |  | Storage              |  |
|  | 13 tabelas   |  | JWT + RLS   |  | Bucket: faturas      |  |
|  | 5 RPCs       |  | 2 roles     |  | Imagens/PDFs         |  |
|  | 23 migrations|  |             |  |                      |  |
|  +--------------+  +-------------+  +----------------------+  |
+-------------------------------+-------------------------------+
                                |
                                | webhooks (HTTP POST)
+-------------------------------v-------------------------------+
|                    n8n (EasyPanel)                             |
|                                                               |
|  +------------------+  +-----------------+                    |
|  | Solis Cloud API  |  | SunGrow API     |                    |
|  | - sync-ucs       |  | - sync-ucs      |                    |
|  | - geracao-mensal  |  | - geracao-mensal |                    |
|  | - sync-alarmes   |  | - sync-alarmes  |                    |
|  +------------------+  +-----------------+                    |
|                                                               |
|  +------------------------------------------+                 |
|  | Processamento de Faturas                  |                 |
|  | LlamaParse (OCR) -> Gemini (extracao)    |                 |
|  | -> Gera PDF relatorio                    |                 |
|  +------------------------------------------+                 |
+---------------------------------------------------------------+
```

## 4.2 Autenticacao e Autorizacao

```
CAMADA 1 — Middleware (lib/supabase/middleware.ts):
  -> Refresh de sessao via cookies @supabase/ssr
  -> NAO faz redirect por role (apenas refresh)

CAMADA 2 — Server Components (layouts):
  -> Cada page busca getCurrentProfile()
  -> Se !profile -> redirect("/login")
  -> Admin layout verifica role = "admin"
  -> Cliente layout verifica empresa_id != null

CAMADA 3 — RLS (PostgreSQL):
  -> Admin: SELECT/INSERT/UPDATE/DELETE em tudo
  -> Cliente: SELECT apenas dados da sua empresa_id
  -> Implementado via SECURITY DEFINER functions
```

## 4.3 Cache

| Tipo | Mecanismo | TTL | Onde |
|------|-----------|-----|------|
| Stations Solis/SunGrow | `usinas_cache` (tabela) | Cron refresh | `sync-usinas/route.ts` |
| Alertas | `alertas_cache` (tabela) | Cron refresh | `sync-alertas/route.ts` |
| Solis webhook fallback | `unstable_cache` (Next.js) | 300s | `solis.ts:212-216` |
| Alertas no client | `useAlertas` hook (polling) | 5 min | `hooks/use-alertas.ts` |

---

# 5. DEPENDENCIAS

| Biblioteca | Versao | Proposito |
|-----------|--------|-----------|
| `next` | 16.2.3 | Framework (App Router + RSC + Server Actions) |
| `react` / `react-dom` | 19.2.4 | UI rendering |
| `@supabase/ssr` | ^0.10.2 | Supabase client com SSR cookie management |
| `@supabase/supabase-js` | ^2.103.0 | Supabase client base (service role) |
| `recharts` | ^3.8.1 | Graficos de geracao (bar/line charts) |
| `react-hook-form` | ^7.72.1 | Formularios complexos (UC, empresa) |
| `shadcn` | ^4.2.0 | CLI para componentes UI |
| `lucide-react` | ^1.8.0 | Icones |
| `xlsx` | ^0.18.5 | Parse de planilhas Excel para importacao de tarifas |
| `tailwind-merge` | ^3.5.0 | Merge inteligente de classes Tailwind |
| `class-variance-authority` | ^0.7.1 | Variantes de componentes (button, badge) |
| `clsx` | ^2.1.1 | Condicional de classes CSS |
| `tw-animate-css` | ^1.4.0 | Animacoes CSS para Tailwind |
| `tailwindcss` | ^4 | Styling |
| `vitest` | ^4.1.4 | Testes unitarios |
| `typescript` | ^5 | Tipagem |

---

# 6. RISCOS E PONTOS DE ATENCAO

## Seguranca

| Risco | Severidade | Evidencia |
|-------|-----------|-----------|
| `.env.local` com secrets no git history | **CRITICO** | Arquivo existe no repo com `SUPABASE_SERVICE_ROLE_KEY` e credenciais n8n |
| Webhook n8n hardcoded em 3 arquivos | Alto | URLs em `faturas.ts:7`, `faturas-processadas.ts:6`, `solis.ts:177` |
| Sem middleware.ts na raiz | Medio | Protecao depende apenas de `getCurrentProfile()` em cada page |
| Credenciais n8n em Basic Auth sem HTTPS verification | Medio | `Buffer.from(...).toString("base64")` em multiplos arquivos |

## Performance

| Risco | Evidencia |
|-------|-----------|
| `getTarifasAneel()` pagina de 1000 em 1000 sem limite maximo | `tarifas-aneel.ts:106-136` — pode ser lento com muitas tarifas |
| `getEmpresas()` com `SELECT *` no `getEmpresa()` | `empresas.ts:184-190` — viola anti-pattern documentado |
| `getEmpresaComRelacionamentos()` faz 3 queries sequenciais | `empresas.ts:193-229` — empresa + UCs + grupoEmpresas |
| Alertas polling a cada 5 min no client | `use-alertas.ts:7` — pode ser excessivo se muitos admins |

## Codigo

| Risco | Evidencia |
|-------|-----------|
| Normalizacao de relacionamentos Supabase repetida em TODOS os actions | Padrao `Array.isArray(ucRaw) ? ucRaw[0] : ucRaw` duplicado em 6+ arquivos |
| Console.log em producao | `faturas.ts:46-47`, `faturas.ts:100` — logs de debug |
| `desvincularUC()` faz DELETE hard (nao soft delete) | `unidades.ts:247-249` — inconsistente com toggleUC() |
| Tipo `Tarifa` em `types/database.ts:149-162` usa schema antigo | Campos `distribuidora`, `modalidade`, `posto_tarifario` nao batem com `tarifas_aneel` |

## Dependencias Externas

| Dependencia | Risco |
|-------------|-------|
| n8n em EasyPanel | Single point of failure para sync, alertas e processamento de faturas |
| Brasil API / ViaCEP / IBGE | Sem retry, sem cache. Se caírem, formularios perdem auto-preenchimento |
| Solis Cloud / SunGrow APIs | Acessadas via n8n. Sem visibilidade direta de erros |

---

# 7. MAPA COMPLETO DO SISTEMA

## 7.1 Entidades e Relacionamentos

```
grupos_empresariais
  | 1:N
  v
empresas <---- profiles (N:1)
  | 1:N           | auth.users (1:1)
  v
unidades_consumidoras
  | 1:N        | 1:N        | 1:N        | 1:N
  v            v            v            v
dados_geracao  faturas     relatorios   uc_stations
                | 1:1                     | N:1 (logico)
                v                         v
         faturas_processadas        usinas_cache <- alertas_cache

tabelas de referencia:
  tarifas_aneel
  impostos_concessionaria
  ghi_municipios
```

## 7.2 Fluxos Principais

### Fluxo de Cadastro (Admin)

```
Criar Grupo -> Criar Empresa (vincular grupo) -> Vincular Station Solis/SunGrow
-> UC criada automaticamente -> Configurar Classificacao Tarifaria
-> Configurar Parametros Estimativa -> Criar Usuario Cliente (max 2)
```

### Fluxo de Relatorio

```
Admin insere fatura (manual ou com arquivo) -> Webhook n8n
-> n8n processa (se arquivo: LlamaParse+Gemini) -> Cria faturas_processadas
-> Admin revisa campos extraidos -> Admin clica "Regerar" -> n8n gera PDF
-> Admin cria relatorio (auto-calcula estimada) -> Muda status para "enviado"
-> Cliente ve no historico -> Download PDF
```

### Fluxo de Sync Externo

```
Cron trigger (externo) -> GET /api/cron/sync-usinas?secret=X
-> POST para n8n (Solis + SunGrow em paralelo)
-> n8n chama APIs dos provedores -> Retorna array de stations
-> route.ts normaliza -> RPC sync_usinas_cache (upsert)
-> Frontend le de usinas_cache
```

### Fluxo do Dashboard Cliente

```
Login -> getCurrentProfile() -> getEmpresaIdsAcessiveis() (expande grupo)
-> Em paralelo: getResumoGeracaoCliente() + getDadosGeracaoCliente()
-> Agrega por mes -> Renderiza DashboardCards + GeracaoChart
```

## 7.3 Dependencias — O Que Depende de Que

```
Dashboard Cliente  --depends--> dados_geracao + faturas + profiles + empresas
Relatorios         --depends--> calcularGeracaoEstimadaUC -> ghi_municipios + UC params
Fator Gross-up     --depends--> impostos_concessionaria
Lookup Tarifario   --depends--> tarifas_aneel
Vinculacao UC      --depends--> usinas_cache (populado via n8n)
Alertas sidebar    --depends--> alertas_cache (populado via n8n)
Geracao Estimada   --depends--> GHI municipal + degradacao UC + potencia UC
```

---

# 8. RESUMO EXECUTIVO (Handoff)

**Lumix** e um sistema de monitoramento de usinas fotovoltaicas construido em **Next.js 16 + Supabase + n8n**. Tem dois perfis de usuario: **admin** (equipe Lumix) e **cliente** (empresas com usinas solares).

**O que funciona end-to-end:** Autenticacao, CRUD de empresas/UCs, dashboard do cliente com KPIs de geracao solar, importacao de tarifas ANEEL, gestao de impostos por concessionaria, upload de faturas, processamento via IA (LlamaParse+Gemini), geracao de relatorios com calculo automatico de estimativa baseado em GHI solar + degradacao, integracao com monitoramento Solis Cloud e SunGrow via n8n.

**Modelo de dados sofisticado:** Suporta UCs multi-provedor (Solis+SunGrow na mesma UC), grupos empresariais com visibilidade compartilhada, tarifas Grupo A (ponta/fora ponta), Grupo B (tarifa unica) e ACL (mercado livre), degradacao por idade da usina, GHI por municipio brasileiro.

**Pontos de atencao para quem assume:**

1. Secrets estao no git history — rotacionar imediatamente.
2. Sem middleware de protecao de rotas na raiz — protecao e por page.
3. Testes existem mas sao poucos (5 arquivos).
4. n8n e single point of failure para integracoes.
5. Tipo `Tarifa` em `types/database.ts` esta desatualizado em relacao ao schema real.

**Codebase:** 135 arquivos TS/TSX, ~18k linhas, 23 migrations, 15 server actions, 57 componentes. Codigo limpo, sem TODOs, convencoes consistentes.
