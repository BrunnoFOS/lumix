# Lumix — Database Schema

**Database:** Supabase (PostgreSQL)
**Last updated:** 2026-06-01

IMPORTANT: Este arquivo é a fonte de verdade. Nunca adicione colunas, tabelas ou
relacionamentos que não estejam definidos aqui. Quando o schema mudar,
atualize este arquivo primeiro, depois escreva a migration.

---

## Roles

| Role | Descrição | Como atribuído |
|------|-----------|----------------|
| admin | Equipe Lumix — acesso total a clientes, UCs, relatórios e tarifas | Campo `role` na tabela `profiles` |
| cliente | Empresa com usina — visualiza dashboard, histórico e dados da UC | Campo `role` na tabela `profiles` |

---

## Tables

### `profiles`

Perfil do usuário vinculado ao auth.users do Supabase. Define role e empresa associada.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, FK → auth.users.id | Mesmo ID do auth.users |
| role | text | NOT NULL, check in ('admin','cliente') | Perfil do usuário |
| nome | text | NOT NULL | Nome completo |
| email | text | NOT NULL | Email do usuário |
| empresa_id | uuid | FK → empresas.id, nullable | Empresa vinculada (null para admins) |
| telefone | text | | Telefone de contato |
| avatar_url | text | | URL da foto de perfil |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**RLS Policies:**
- SELECT: Admin lê todos. Cliente lê apenas seu próprio perfil.
- INSERT: Apenas via trigger no signup (handle_new_user)
- UPDATE: Usuário atualiza apenas seu próprio perfil. Admin atualiza qualquer um.
- DELETE: Apenas admin.

---

### `empresas`

Empresas clientes da Lumix. Suporta matriz/filial via campo `matriz_id`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| nome | text | NOT NULL | Razão social |
| cnpj | text | NOT NULL, UNIQUE | CNPJ da empresa |
| tipo | text | NOT NULL, check in ('matriz','filial'), default 'matriz' | Tipo da empresa |
| matriz_id | uuid | FK → empresas.id, nullable | Se filial, aponta para a matriz |
| endereco | text | | Endereço completo |
| cidade | text | | Cidade |
| estado | text | | UF (2 caracteres) |
| cep | text | | CEP |
| telefone | text | | Telefone |
| email | text | | Email de contato |
| responsavel | text | | Nome do responsável |
| ativa | boolean | NOT NULL, default true | Se a empresa está ativa |
| arquivada | boolean | NOT NULL, default false | Se a empresa está arquivada |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Relationships:**
- empresas.id ← profiles.empresa_id (one-to-many)
- empresas.id ← unidades_consumidoras.empresa_id (one-to-many)
- empresas.matriz_id → empresas.id (self-reference para filiais)

**RLS Policies:**
- SELECT: Admin lê todas. Cliente lê apenas sua própria empresa e filiais.
- INSERT: Apenas admin.
- UPDATE: Apenas admin.
- DELETE: Apenas admin.

---

### `unidades_consumidoras`

Unidades consumidoras (UCs) com dados técnicos do sistema fotovoltaico.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| empresa_id | uuid | FK → empresas.id, NOT NULL | Empresa dona da UC |
| codigo_uc | text | NOT NULL | Código da UC na distribuidora |
| titular | text | NOT NULL | Nome do titular |
| endereco | text | | Endereço da instalação |
| cidade | text | | Cidade |
| estado | text | | UF |
| distribuidora | text | | Sigla da concessionária (ex: CEMIG, CPFL). Null se ACL |
| grupo_tarifario | text | check in ('grupo_a','grupo_b','acl'), nullable | Classificação: Grupo A, Grupo B ou ACL (Mercado Livre) |
| subgrupo | text | nullable | Subgrupo tarifário (A1-A4, AS, B1-B4) |
| enquadramento_tarifario | text | NOT NULL, check in ('monofasico','bifasico','trifasico') | Tipo de ligação |
| modalidade_tarifaria | text | nullable | Modalidade tarifária (Azul, Verde, Convencional, Branca) |
| potencia_instalada_kwp | decimal(10,2) | NOT NULL | Potência instalada em kWp |
| quantidade_modulos | integer | NOT NULL | Quantidade de módulos fotovoltaicos |
| modelo_modulos | text | | Modelo/fabricante dos módulos |
| potencia_modulo_w | integer | | Potência individual do módulo em W |
| quantidade_inversores | integer | NOT NULL | Quantidade de inversores |
| modelo_inversores | text | | Modelo/fabricante dos inversores |
| potencia_inversor_kw | decimal(10,2) | | Potência do inversor em kW |
| data_instalacao | date | | Data de instalação do sistema |
| geracao_estimada_mensal_kwh | decimal(10,2) | | Estimativa estática de geração mensal em kWh (fallback) |
| fator_rendimento | decimal(5,4) | nullable | Fator de rendimento da instalação (ex: 0.95). Perdas específicas (sombreamento, orientação, cabeamento) |
| degradacao_ano_zero | decimal(5,4) | nullable | Degradação no primeiro ano (ex: 0.02 para 2%) |
| degradacao_anos_seguintes | decimal(5,4) | nullable | Degradação anual recorrente a partir do segundo ano (ex: 0.006 para 0,6%) |
| data_inicio_degradacao | date | nullable | Data a partir da qual a degradação começa a ser contada. Preenchida pelo admin. Fallback: data_instalacao |
| contrato_acl_rs_mwh | decimal(10,2) | nullable | Preço negociado do contrato ACL em R$/MWh. Apenas para UCs com grupo_tarifario = 'acl'. Converter para R$/kWh dividindo por 1000 |
| ativa | boolean | NOT NULL, default true | Se a UC está ativa |
| arquivada | boolean | NOT NULL, default false | Se a UC está arquivada |
| station_id | text | | ID da usina na Solis Cloud (vinculação externa) |
| observacoes | text | | Notas adicionais |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Relationships:**
- unidades_consumidoras.empresa_id → empresas.id
- unidades_consumidoras.id ← dados_geracao.uc_id (one-to-many)
- unidades_consumidoras.id ← faturas.uc_id (one-to-many)
- unidades_consumidoras.id ← relatorios.uc_id (one-to-many)

**RLS Policies:**
- SELECT: Admin lê todas. Cliente lê apenas UCs da sua empresa.
- INSERT: Apenas admin.
- UPDATE: Apenas admin.
- DELETE: Apenas admin.

---

### `dados_geracao`

Dados de geração de energia por UC e período.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| uc_id | uuid | FK → unidades_consumidoras.id, NOT NULL | UC relacionada |
| mes_referencia | date | NOT NULL | Mês/ano de referência (primeiro dia do mês) |
| geracao_kwh | decimal(10,2) | NOT NULL | Geração real em kWh |
| geracao_estimada_kwh | decimal(10,2) | | Geração ideal estimada em kWh |
| irradiacao_media | decimal(8,2) | | Irradiação solar média do período |
| performance_ratio | decimal(5,2) | | Ratio de performance (%) |
| indice_performance | text | check in ('bom','regular','ruim') | Indicador calculado |
| created_at | timestamptz | NOT NULL, default now() | |

**Unique constraint:** (uc_id, mes_referencia)

**RLS Policies:**
- SELECT: Admin lê todos. Cliente lê apenas dados das UCs da sua empresa.
- INSERT: Apenas admin.
- UPDATE: Apenas admin.
- DELETE: Apenas admin.

---

### `faturas`

Faturas de energia (dados inseridos manualmente pelo admin ou via upload de imagem pelo cliente).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| uc_id | uuid | FK → unidades_consumidoras.id, NOT NULL | UC da fatura |
| mes_referencia | date | NOT NULL | Mês/ano de referência |
| denominacao | text | | Denominação da UC na fatura |
| contrato | text | | Número do contrato |
| valor_faturado | decimal(10,2) | | Valor faturado (R$) |
| inicio_ciclo | date | | Início do ciclo de faturamento |
| fim_ciclo | date | | Fim do ciclo de faturamento |
| energia_faturada_fp | decimal(10,2) | | Energia faturada fora ponta (kWh) |
| valor_tarifa_fp | decimal(10,6) | | Valor da tarifa fora ponta (R$/kWh) |
| kwh_compensado_fp | decimal(10,2) | | kWh compensado fora ponta |
| tarifa_compensada_fp | decimal(10,6) | | Tarifa da energia compensada fora ponta (R$/kWh) |
| energia_consumida_fp | decimal(10,2) | | Energia consumida fora ponta (kWh) |
| energia_injetada_fp | decimal(10,2) | | Energia injetada fora ponta (kWh) |
| valor_total | decimal(10,2) | | Valor total da fatura (R$) |
| consumo_kwh | decimal(10,2) | | Consumo faturado em kWh |
| energia_injetada_kwh | decimal(10,2) | | Energia injetada na rede |
| creditos_energia_kwh | decimal(10,2) | | Créditos de energia acumulados |
| demanda_contratada_kw | decimal(10,2) | | Demanda contratada (se aplicável) |
| valor_tusd | decimal(10,2) | | Valor da TUSD na fatura |
| valor_te | decimal(10,2) | | Valor da TE na fatura |
| economia_estimada | decimal(10,2) | | Economia estimada no mês (R$) |
| pdf_url | text | | URL do PDF da fatura |
| imagem_url | text | | URL da imagem da fatura (upload do cliente) |
| dados_extraidos | jsonb | | Dados extraídos via API externa (OCR) |
| status | text | NOT NULL, check in ('pendente','processada','erro','rejeitada'), default 'pendente' | Status do processamento |
| motivo_rejeicao | text | nullable | Motivo da rejeição (obrigatório quando status = 'rejeitada') |
| inserido_por | uuid | FK → profiles.id | Quem inseriu (admin ou cliente) |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Unique constraint:** (uc_id, mes_referencia)

**RLS Policies:**
- SELECT: Admin lê todas. Cliente lê apenas faturas das UCs da sua empresa.
- INSERT: Admin insere qualquer uma. Cliente insere apenas para UCs da sua empresa.
- UPDATE: Apenas admin.
- DELETE: Apenas admin.

---

### `relatorios`

Relatórios gerados por UC e período.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| uc_id | uuid | FK → unidades_consumidoras.id, NOT NULL | UC do relatório |
| empresa_id | uuid | FK → empresas.id, NOT NULL | Empresa (desnormalizado para queries rápidas) |
| mes_referencia | date | NOT NULL | Mês/ano de referência |
| titulo | text | NOT NULL | Título do relatório |
| pdf_url | text | | URL do PDF gerado |
| geracao_kwh | decimal(10,2) | | Geração do período |
| geracao_estimada_kwh | decimal(10,2) | | Geração estimada |
| economia_reais | decimal(10,2) | | Economia no período (R$) |
| indice_performance | text | check in ('bom','regular','ruim') | Performance |
| status_envio | text | NOT NULL, check in ('pendente','enviado','erro'), default 'pendente' | Status do envio ao cliente |
| gerado_por | text | NOT NULL, check in ('automatico','manual'), default 'manual' | Forma de geração |
| fatura_id | uuid | FK → faturas.id, nullable | Fatura usada como base |
| arquivado | boolean | NOT NULL, default false | Se o relatório está arquivado |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**RLS Policies:**
- SELECT: Admin lê todos. Cliente lê apenas relatórios da sua empresa.
- INSERT: Apenas admin (geração via sistema).
- UPDATE: Apenas admin.
- DELETE: Apenas admin.

---

### `usinas_cache`

Cache de usinas sincronizadas via cron n8n. O frontend lê desta tabela — nunca chama a API do provedor diretamente.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| station_id | text | PK | ID único da usina no provedor |
| provider | text | NOT NULL, check in ('solis','sungrow') | Provedor de origem |
| station_name | text | NOT NULL | Nome da usina |
| cidade_uf | text | nullable | Localização (Cidade/UF) |
| potencia_instalada_kwp | decimal(10,2) | NOT NULL, default 0 | Potência total em kWp |
| qtd_inversores | integer | NOT NULL, default 0 | Quantidade de inversores |
| modelo_inversores | text[] | | Array de modelos |
| potencia_inversor_kw | decimal(10,2) | default 0 | Potência por inversor em kW |
| data_instalacao | date | nullable | Data de instalação |
| inversores_detalhe | jsonb | default '[]' | Detalhes de cada inversor (sn, model, state) |
| synced_at | timestamptz | NOT NULL, default now() | Última sincronização |

**RPC:** `sync_usinas_cache(payload jsonb)` — recebe array de usinas, faz upsert em massa, retorna `{upserted, total}`.

**RLS Policies:**
- SELECT: Todos os usuários autenticados.
- INSERT/UPDATE/DELETE: Apenas admin.

---

### `uc_stations`

Tabela de junção que vincula UCs a station_ids de provedores. Permite que uma mesma UC tenha inversores monitorados por múltiplos provedores (ex: usina com inversores Solis + SunGrow).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| uc_id | uuid | FK → unidades_consumidoras.id ON DELETE CASCADE, NOT NULL | UC vinculada |
| station_id | text | NOT NULL, UNIQUE | ID da usina no provedor |
| provider | text | NOT NULL, check in ('solis','sungrow') | Provedor de monitoramento |
| created_at | timestamptz | NOT NULL, default now() | |

**Unique constraints:** (uc_id, station_id), (station_id)

**Relationships:**
- uc_stations.uc_id → unidades_consumidoras.id (many-to-one)
- uc_stations.station_id → usinas_cache.station_id (logical, não FK)

**RLS Policies:**
- ALL: Admin acesso total.
- SELECT: Cliente lê apenas vínculos de UCs da sua empresa.

**Uso:** Substituiu o campo `station_id` direto na `unidades_consumidoras`. Para buscar todos os provedores de uma UC: `SELECT * FROM uc_stations WHERE uc_id = ?`. Para relatórios, buscar geração de cada station_id e agregar.

---

### `ghi_municipios`

Irradiação solar horizontal global (GHI) média mensal por município brasileiro. Dados importados do Atlas Brasileiro de Energia Solar (INPE). Valores armazenados em Wh/m²/dia — dividir por 1000 para obter kWh/m²/dia na fórmula de geração estimada.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PK | |
| nome | text | NOT NULL | Nome do município normalizado (lowercase, sem acentos) |
| uf | char(2) | NOT NULL | UF do estado (ex: SP, MG) |
| lat | decimal(10,6) | nullable | Latitude |
| lon | decimal(10,6) | nullable | Longitude |
| jan | decimal(8,2) | NOT NULL | GHI médio janeiro (Wh/m²/dia) |
| fev | decimal(8,2) | NOT NULL | GHI médio fevereiro |
| mar | decimal(8,2) | NOT NULL | GHI médio março |
| abr | decimal(8,2) | NOT NULL | GHI médio abril |
| mai | decimal(8,2) | NOT NULL | GHI médio maio |
| jun | decimal(8,2) | NOT NULL | GHI médio junho |
| jul | decimal(8,2) | NOT NULL | GHI médio julho |
| ago | decimal(8,2) | NOT NULL | GHI médio agosto |
| set_ | decimal(8,2) | NOT NULL | GHI médio setembro |
| out | decimal(8,2) | NOT NULL | GHI médio outubro |
| nov | decimal(8,2) | NOT NULL | GHI médio novembro |
| dez | decimal(8,2) | NOT NULL | GHI médio dezembro |
| anual | decimal(8,2) | NOT NULL | GHI médio anual |

**Unique constraint:** (nome, uf)

**Lookup para geração estimada:** Dado cidade + estado da UC, normalizar o nome (lowercase, sem acentos) e buscar `WHERE nome = normalized_city AND uf = state_uf`.

**RLS Policies:**
- SELECT: Todos os usuários autenticados.
- INSERT/UPDATE/DELETE: Apenas admin.

---

### `faturas_processadas`

Relatórios de fatura gerados via extração automática (LlamaParse + Gemini). O admin pode revisar campos extraídos e regerar o PDF sem reprocessar a fatura original. Cada regeração sobrescreve o PDF anterior — sem histórico de versões.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| uc_id | uuid | FK → unidades_consumidoras.id, NOT NULL | UC da fatura |
| mes_referencia | date | NOT NULL | Mês/ano da fatura (primeiro dia do mês) |
| pdf_fatura_url | text | | URL do PDF da fatura original no Storage |
| pdf_relatorio_url | text | | URL do PDF do relatório gerado (sobrescrito a cada regeração) |
| status | text | NOT NULL, check in ('extraindo','extraido','gerando','gerado','erro'), default 'extraindo' | Status do processamento |
| observacao | text | | Campo livre para observação do admin (aparece no rodapé do relatório) |
| ultima_edicao_at | timestamptz | | Atualizado a cada regeração |
| editado_por | uuid | FK → profiles.id, nullable | Admin que fez a última edição |
| consumo_total_kwh | decimal(10,2) | | Consumo total do período |
| consumo_ponta_kwh | decimal(10,2) | | Consumo no horário de ponta (Grupo A) |
| consumo_fora_ponta_kwh | decimal(10,2) | | Consumo fora ponta (Grupo A) |
| energia_injetada_kwh | decimal(10,2) | | Energia injetada na rede |
| consumo_injetado_mesma_uc_kwh | decimal(10,2) | | Crédito consumido na própria UC |
| consumo_injetado_outra_uc_kwh | decimal(10,2) | | Crédito transferido para outra UC |
| credito_acumulado_kwh | decimal(10,2) | | Saldo de créditos acumulados |
| valor_total_fatura_rs | decimal(10,2) | | Valor total da fatura em R$ |
| vto_ci_rs | decimal(10,2) | | Valor total da operação — consumo injetado |
| tem_geracao_compartilhada | boolean | default false | Indica geração compartilhada |
| evidencia_geracao_compartilhada | text | | Texto extraído da fatura como evidência |
| data_vencimento | date | | Data de vencimento da fatura |
| numero_fatura | text | | Identificador da fatura emitido pela concessionária |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Unique constraint:** (uc_id, mes_referencia)

**Relationships:**
- faturas_processadas.uc_id → unidades_consumidoras.id
- faturas_processadas.editado_por → profiles.id

**RLS Policies:**
- SELECT: Admin lê todas. Cliente lê apenas faturas processadas de UCs da sua empresa.
- INSERT: Apenas admin.
- UPDATE: Apenas admin.
- DELETE: Apenas admin.

---

## Functions & Triggers

### `handle_updated_at()`
Auto-atualiza `updated_at` em cada alteração de linha.
Aplicar a todas as tabelas com coluna `updated_at`.

```sql
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### `handle_new_user()`
Cria automaticamente um perfil quando um novo usuário se registra.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', ''), 'cliente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### `impostos_concessionaria`

Alíquotas de impostos (ICMS, PIS, COFINS) por concessionária e período de vigência. Usadas para calcular o fator multiplicador gross-up aplicado sobre as tarifas ANEEL (que são sem impostos). Fórmula: `fator = 1 / (1 - icms - pis - cofins)`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| concessionaria_sigla | text | NOT NULL | Sigla da concessionária (ex: COSERN, RGE, CPFL) |
| uf | char(2) | NOT NULL | UF do estado (ex: RN, RS, SP) |
| icms_aliquota | decimal(6,5) | NOT NULL | Alíquota ICMS (ex: 0.18000 para 18%) |
| pis_aliquota | decimal(6,5) | NOT NULL | Alíquota PIS (ex: 0.01650 para 1,65%) |
| cofins_aliquota | decimal(6,5) | NOT NULL | Alíquota COFINS (ex: 0.07600 para 7,6%) |
| vigencia_inicio | date | NOT NULL | Início da vigência |
| vigencia_fim | date | nullable | Fim da vigência (null = vigente) |
| fonte_url | text | | URL da fonte (site concessionária ou legislação) |
| observacoes | text | | Notas adicionais |
| created_at | timestamptz | NOT NULL, default now() | |

**Lookup para relatórios:** Dado `concessionaria_sigla` + `mes_referencia`, buscar o registro onde `vigencia_inicio <= mes_referencia AND (vigencia_fim IS NULL OR vigencia_fim >= mes_referencia)`.

**RLS Policies:**
- SELECT: Todos os usuários autenticados.
- INSERT/UPDATE/DELETE: Apenas admin.

---

### `tarifas_aneel`

Tarifas importadas do BI da ANEEL. Registros nunca são sobrescritos — cada importação insere novos registros com seu período de vigência. Relatórios buscam a tarifa cuja vigência cobre o mês de referência.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| sigla | text | NOT NULL | Sigla da concessionária (ex: CELESC, CEMIG) |
| subgrupo | text | NOT NULL | Ex: A4, B1, B2, B3 |
| modalidade | text | nullable | Ex: Verde, Azul (null para grupo B) |
| posto | text | NOT NULL | Ex: Ponta, Fora ponta, Não se aplica |
| tusd | decimal(10,6) | NOT NULL | Valor TUSD em R$/kWh |
| te | decimal(10,6) | NOT NULL | Valor TE em R$/kWh |
| vigencia_inicio | date | NOT NULL | Início da vigência |
| vigencia_fim | date | nullable | Fim da vigência (null = vigente) |
| importado_em | timestamptz | NOT NULL, default now() | Data/hora da importação |
| created_at | timestamptz | NOT NULL, default now() | |

**Unique constraint:** (sigla, subgrupo, COALESCE(modalidade, ''), posto, vigencia_inicio)

**Lookup para relatórios:** Dado sigla + subgrupo + modalidade + posto + mes_referencia, buscar a tarifa onde vigencia_inicio <= mes_referencia AND (vigencia_fim IS NULL OR vigencia_fim >= mes_referencia).

**RLS Policies:**
- SELECT: Todos os usuários autenticados.
- INSERT: Apenas admin.
- DELETE: Apenas admin.

---

### `faturas_processadas_log`

Log de auditoria para edições em faturas processadas. Registros são imutáveis — sem UPDATE ou DELETE.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| faturas_processadas_id | uuid | FK → faturas_processadas.id ON DELETE CASCADE, NOT NULL | Fatura processada editada |
| campo_alterado | text | NOT NULL | Nome do campo que foi alterado |
| valor_anterior | text | nullable | Valor antes da edição (serializado como texto) |
| valor_novo | text | nullable | Valor após a edição (serializado como texto) |
| alterado_por | uuid | FK → profiles.id, NOT NULL | Admin que fez a alteração |
| alterado_em | timestamptz | NOT NULL, default now() | Data/hora da alteração |

**Relationships:**
- faturas_processadas_log.faturas_processadas_id → faturas_processadas.id
- faturas_processadas_log.alterado_por → profiles.id

**RLS Policies:**
- SELECT: Apenas admin.
- INSERT: Apenas admin.
- UPDATE/DELETE: Nenhum (logs imutáveis).

---

### `faturas_log`

Log de auditoria para edições em faturas. Registros são imutáveis — sem UPDATE ou DELETE.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| fatura_id | uuid | FK → faturas.id ON DELETE CASCADE, NOT NULL | Fatura editada |
| campo_alterado | text | NOT NULL | Nome do campo que foi alterado |
| valor_anterior | text | nullable | Valor antes da edição (serializado como texto) |
| valor_novo | text | nullable | Valor após a edição (serializado como texto) |
| alterado_por | uuid | FK → profiles.id, NOT NULL | Admin que fez a alteração |
| alterado_em | timestamptz | NOT NULL, default now() | Data/hora da alteração |

**Relationships:**
- faturas_log.fatura_id → faturas.id
- faturas_log.alterado_por → profiles.id

**RLS Policies:**
- SELECT: Apenas admin.
- INSERT: Apenas admin.
- UPDATE/DELETE: Nenhum (logs imutáveis).

---

## Indexes

| Table | Column(s) | Type | Reason |
|-------|-----------|------|--------|
| profiles | empresa_id | btree | Filtro por empresa |
| empresas | cnpj | btree (unique) | Busca por CNPJ |
| empresas | matriz_id | btree | Busca de filiais |
| unidades_consumidoras | empresa_id | btree | Filtro por empresa |
| unidades_consumidoras | codigo_uc | btree | Busca por código UC |
| dados_geracao | uc_id, mes_referencia | btree (unique) | Busca por UC e período |
| faturas | uc_id, mes_referencia | btree (unique) | Busca por UC e período |
| relatorios | empresa_id | btree | Filtro por empresa |
| relatorios | uc_id, mes_referencia | btree | Busca por UC e período |
| tarifas_aneel | sigla, subgrupo, posto, vigencia_inicio | btree | Lookup por concessionária |
| tarifas_aneel | vigencia_inicio, vigencia_fim | btree | Busca por vigência |
| tarifas_aneel | sigla, subgrupo, COALESCE(modalidade,''), posto, vigencia_inicio | unique | Evitar duplicatas |
| uc_stations | uc_id | btree | Busca por UC |
| uc_stations | station_id | btree (unique) | Busca por station_id |
| ghi_municipios | nome, uf | btree (unique) | Lookup por município + UF |
| faturas_processadas | uc_id, mes_referencia | btree (unique) | Busca por UC e período |
| faturas_processadas | uc_id | btree | Filtro por UC |
| impostos_concessionaria | concessionaria_sigla, vigencia_inicio, vigencia_fim | btree | Lookup por concessionária + data |
| faturas_processadas_log | faturas_processadas_id | btree | Busca por fatura processada |
| faturas_log | fatura_id | btree | Busca por fatura |

---

## Notes

- Todos os UUIDs são gerados pelo PostgreSQL via `gen_random_uuid()`
- Todos os timestamps são `timestamptz`, armazenados em UTC
- Valores monetários usam `decimal(10,2)` — nunca float
- Tarifas usam `decimal(10,6)` para precisão em R$/kWh
- O campo `mes_referencia` sempre usa o primeiro dia do mês (ex: 2026-04-01)
