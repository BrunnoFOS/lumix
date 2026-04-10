# Lumix — Database Schema

**Database:** Supabase (PostgreSQL)
**Last updated:** 2026-04-10

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
| distribuidora | text | NOT NULL | Nome da distribuidora (ex: CEMIG, CPFL) |
| enquadramento_tarifario | text | NOT NULL, check in ('monofasico','bifasico','trifasico') | Tipo de ligação |
| modalidade_tarifaria | text | NOT NULL, check in ('convencional','branca','verde','azul'), default 'convencional' | Modalidade tarifária |
| potencia_instalada_kwp | decimal(10,2) | NOT NULL | Potência instalada em kWp |
| quantidade_modulos | integer | NOT NULL | Quantidade de módulos fotovoltaicos |
| modelo_modulos | text | | Modelo/fabricante dos módulos |
| potencia_modulo_w | integer | | Potência individual do módulo em W |
| quantidade_inversores | integer | NOT NULL | Quantidade de inversores |
| modelo_inversores | text | | Modelo/fabricante dos inversores |
| potencia_inversor_kw | decimal(10,2) | | Potência do inversor em kW |
| data_instalacao | date | | Data de instalação do sistema |
| geracao_estimada_mensal_kwh | decimal(10,2) | | Estimativa de geração mensal em kWh |
| ativa | boolean | NOT NULL, default true | Se a UC está ativa |
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
| valor_total | decimal(10,2) | | Valor total da fatura (R$) |
| consumo_kwh | decimal(10,2) | | Consumo faturado em kWh |
| energia_injetada_kwh | decimal(10,2) | | Energia injetada na rede |
| creditos_energia_kwh | decimal(10,2) | | Créditos de energia acumulados |
| demanda_contratada_kw | decimal(10,2) | | Demanda contratada (se aplicável) |
| valor_tusd | decimal(10,2) | | Valor da TUSD na fatura |
| valor_te | decimal(10,2) | | Valor da TE na fatura |
| economia_estimada | decimal(10,2) | | Economia estimada no mês (R$) |
| imagem_url | text | | URL da imagem da fatura (upload do cliente) |
| dados_extraidos | jsonb | | Dados extraídos via API externa (OCR) |
| status | text | NOT NULL, check in ('pendente','processada','erro'), default 'pendente' | Status do processamento |
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
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**RLS Policies:**
- SELECT: Admin lê todos. Cliente lê apenas relatórios da sua empresa.
- INSERT: Apenas admin (geração via sistema).
- UPDATE: Apenas admin.
- DELETE: Apenas admin.

---

### `tarifas`

Tarifas TUSD/TE por distribuidora e posto tarifário.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| distribuidora | text | NOT NULL | Nome da distribuidora |
| modalidade | text | NOT NULL, check in ('convencional','branca','verde','azul') | Modalidade tarifária |
| posto_tarifario | text | NOT NULL, check in ('ponta','fora_ponta','intermediario','unico') | Posto tarifário |
| valor_tusd | decimal(10,6) | NOT NULL | Valor TUSD (R$/kWh) |
| valor_te | decimal(10,6) | NOT NULL | Valor TE (R$/kWh) |
| valor_total | decimal(10,6) | NOT NULL | TUSD + TE |
| vigencia_inicio | date | NOT NULL | Início da vigência |
| vigencia_fim | date | | Fim da vigência (null = vigente) |
| ativa | boolean | NOT NULL, default true | Se a tarifa está vigente |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Unique constraint:** (distribuidora, modalidade, posto_tarifario, vigencia_inicio)

**RLS Policies:**
- SELECT: Todos os usuários autenticados.
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
| tarifas | distribuidora, modalidade | btree | Filtro por distribuidora |

---

## Notes

- Todos os UUIDs são gerados pelo PostgreSQL via `gen_random_uuid()`
- Todos os timestamps são `timestamptz`, armazenados em UTC
- Valores monetários usam `decimal(10,2)` — nunca float
- Tarifas usam `decimal(10,6)` para precisão em R$/kWh
- O campo `mes_referencia` sempre usa o primeiro dia do mês (ex: 2026-04-01)
