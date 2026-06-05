# Lumix — Documentação Completa do Sistema

**Última atualização:** Junho/2026

---

## 1. Visão Geral

O **Lumix** é um sistema web de monitoramento de usinas fotovoltaicas. Atende dois perfis de usuário:

- **Admin (Equipe Lumix):** gerencia clientes, unidades consumidoras, tarifas, faturas, impostos e relatórios. Acesso total ao sistema.
- **Cliente (Empresa):** acompanha geração de energia, performance da usina, economia e histórico de relatórios. Pode enviar faturas para processamento.

### Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router, React Server Components, Server Actions) |
| Banco de dados | Supabase (PostgreSQL) com RLS (Row Level Security) |
| Autenticação | Supabase Auth (email + senha, session cookies) |
| Armazenamento | Supabase Storage (PDFs, imagens de faturas) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Lucide React (ícones) |
| Gráficos | Recharts |
| Workflows | n8n (extração OCR, sync de usinas, geração de PDFs) |
| Inversores | APIs Solis Cloud + SunGrow (via n8n) |
| Testes | Vitest (unitários), Playwright (E2E) |
| Deploy | Vercel + EasyPanel (n8n, Gotenberg) |

---

## 2. Autenticação e Controle de Acesso

### Login

- **Método:** Email + senha
- **Validação:** ambos obrigatórios
- **Erro:** "Email ou senha incorretos."
- **Após login:** sistema consulta `profiles.role` e redireciona:
  - `admin` → `/admin/dashboard`
  - `cliente` → `/cliente/dashboard`

### Cadastro de Conta

- **Campos:** nome, email, senha (mínimo 6 caracteres)
- **Role automático:** `cliente` (via trigger `handle_new_user()`)
- **Verificação:** email de confirmação enviado automaticamente
- **Mensagem de sucesso:** "Conta criada com sucesso! Verifique seu email."
- **Obs:** A tela de login atualmente não exibe links de cadastro ou recuperação de senha — apenas email, senha e botão "Entrar".

### Recuperação de Senha

- Envia email com link de recuperação via Supabase
- Callback em `/auth/callback?type=recovery`

### Middleware

Toda requisição para rotas `(admin)/*` e `(cliente)/*` passa pelo middleware que valida a sessão. Sem sessão válida → redirect para `/login`.

### RLS (Row Level Security)

Cada tabela tem políticas de acesso:
- **Admin:** lê e escreve tudo
- **Cliente:** lê apenas dados vinculados à sua empresa (via `empresa_id`)
- A query do cliente sempre filtra por `empresa_id` como defesa em profundidade

---

## 3. Painel do Admin

### 3.1 Dashboard (`/admin/dashboard`)

**Cards de KPIs (4 colunas):**

| Card | Dado | Link |
|------|------|------|
| Clientes | Total de empresas ativas | `/admin/clientes` |
| Unidades consumidoras | Total de UCs ativas | `/admin/unidades` |
| Relatórios pendentes | Contagem status = "pendente" | `/admin/relatorios` |
| Faturas pendentes | Contagem status = "pendente" | `/admin/faturas` |

**Dados por cliente:** Grid com card para cada empresa ativa mostrando:
- Nome da empresa + badge de performance (Bom/Regular/Ruim)
- Geração total do mês (kWh)
- Economia do mês (R$)
- Quantidade de UCs
- Relatórios pendentes
- Link "Ver detalhes" → página da empresa

**Geração Mensal:** Componente `SolisGeracaoMensal` que permite selecionar empresa → UC → mês e visualizar dados diários de geração com gráfico de barras.

---

### 3.2 Clientes (`/admin/clientes`)

CRUD completo de empresas clientes.

**Listagem:**
- Busca por nome ou CNPJ
- Filtro por status (ativas/inativas/arquivadas)
- Export CSV

**Cadastro (`/admin/clientes/novo`):**
- **CNPJ com auto-preenchimento:** consulta BrasilAPI → preenche nome, cidade, estado
- **CEP com auto-preenchimento:** consulta ViaCEP → preenche endereço
- **Validação CNPJ:** algoritmo de dígitos verificadores
- Campos: nome, CNPJ, tipo (matriz/filial), endereço completo, telefone, email, responsável

**Detalhes (`/admin/clientes/[id]`):**

1. **Informações da empresa** — dados cadastrais
2. **Usuários** — gerenciamento de acessos:
   - Máximo **2 usuários** por empresa
   - Criar: nome, email, senha (min 6 chars), telefone
   - Resetar senha (inline)
   - Excluir com confirmação
3. **Unidades consumidoras** — lista de UCs vinculadas + botão para vincular novas usinas
4. **Filiais** — se for matriz, mostra empresas filiais vinculadas

**Estrutura Matriz/Filial:**
- Campo `tipo`: "matriz" ou "filial"
- Filial aponta para matriz via `matriz_id`
- No portal do cliente, se a empresa for matriz, agrega dados de todas as filiais

---

### 3.3 Grupos Empresariais (`/admin/grupos`)

Agrupamentos lógicos de empresas para organização interna da equipe Lumix.

**Funcionalidades:**
- Criar grupo (campo nome)
- Renomear grupo (edição inline com ícone de lápis)
- Excluir grupo (com confirmação "Confirmar"/"Não")
- Cada card mostra: nome do grupo, badge com quantidade de empresas, lista de empresas vinculadas com CNPJ e status

**Busca:** filtra por nome do grupo, nome da empresa ou CNPJ.

---

### 3.4 Unidades Consumidoras (`/admin/unidades`)

Lista todas as usinas detectadas nos provedores (Solis e SunGrow), lidas do cache local (`usinas_cache`).

**Listagem dividida por provedor:**
- Seção **Solis** com contagem
- Seção **SunGrow** com contagem

**Filtros:**
- Busca por nome da usina
- Filtro por empresa
- Filtro por status: vinculadas / não vinculadas / com tarifa / sem tarifa
- Filtro por provedor

**Vinculação:** Ao vincular uma usina do provedor a uma empresa:
1. Cria registro em `unidades_consumidoras` com dados técnicos do provedor
2. Cria vínculo em `uc_stations` (junction table UC ↔ station_id)
3. Se UC com mesmo nome já existe na empresa → vincula station adicional (multi-provedor)

**Detalhes da UC (`/admin/unidades/[id]`):**

Página com 4 seções editáveis:

**a) Classificação Tarifária:**
- Grupo tarifário: Grupo A / Grupo B / ACL (Mercado Livre)
- Subgrupo: A1-A4, AS, B1-B4 (cascata filtrada pelo grupo)
- Concessionária: sigla (ex: CEMIG, RGE)
- Modalidade tarifária: Verde, Azul, Convencional, Branca
- **Para ACL:** campo adicional "Contrato ACL (R$/MWh)" — preço negociado do mercado livre
- **Preview de tarifas:** mostra tarifas ANEEL vigentes para a combinação selecionada

**b) Parâmetros de Geração Estimada:**
- Fator de rendimento (ex: 0.95 — perdas de sombreamento, orientação, cabeamento)
- Degradação 1º ano (ex: 0.02 = 2%)
- Degradação anual seguinte (ex: 0.006 = 0,6%)
- Warning se algum campo estiver vazio: "Geração estimada não será calculada"

**c) Dados Técnicos** (somente leitura):
- Potência instalada (kWp), quantidade e modelo de inversores
- Data de instalação, geração estimada mensal (valor estático)

**d) Observações:** campo livre

---

### 3.5 Relatórios (`/admin/relatorios`)

Listagem de relatórios mensais por UC.

**Tabela:**
- Cliente, UC, Tipo (Real/Estimado), Mês, Geração (kWh), Economia (R$)
- **Performance:** PR percentual + badge classificação (Bom/Regular/Ruim)
  - Ex: "PR 85%" + badge "Ruim"
  - Calculado de `geracao_kwh / geracao_estimada_kwh × 100`
- Status de envio (Pendente/Enviado/Erro)
- Ações: marcar como enviado, baixar PDF, substituir anexo, arquivar

**Componente Geração Mensal:**

1. Selecionar empresa → UC → mês
2. Clicar "Buscar"
3. Sistema busca dados diários de geração (consolidando múltiplos provedores se houver)

**Cards exibidos:**
- Geração total (kWh), Média diária, Melhor dia, Projeção mês
- Performance PR (percentual + classificação Bom/Regular/Ruim)
- Geração estimada (kWh) — calculada pelo sistema com GHI + parâmetros da UC

**Gráfico de barras diário:**
- Cores: verde (yield ≥2.0), âmbar (1.0-2.0), vermelho (<1.0)
- Linha de referência: média diária

**Botão "Gerar Relatório":** envia dados para n8n gerar o PDF.

---

### 3.6 Faturas (`/admin/faturas`)

**Inserir fatura (`/admin/faturas/nova`):**
- Seleção: UC + mês de referência
- Campos: denominação, contrato, ciclo, energia fora ponta (kWh, tarifas), valores, consumo, créditos, TUSD, TE, economia estimada
- Upload de PDF opcional
- Ao salvar: dispara webhook para processamento no n8n

---

### 3.7 Faturas Processadas (`/admin/faturas-processadas`)

Faturas extraídas automaticamente via OCR (LlamaParse + Gemini) no n8n.

**Status:** Extraindo → Extraído → Gerando → Gerado / Erro

**Campos editáveis agrupados:**

| Grupo | Campos |
|-------|--------|
| Consumo (kWh) | consumo_total, consumo_ponta*, consumo_fora_ponta* |
| Geração e créditos (kWh) | energia_injetada, consumo_injetado_mesma_uc, consumo_injetado_outra_uc, credito_acumulado |
| Valores (R$) | valor_total_fatura, VTO.CI |
| Geração compartilhada | toggle sim/não + evidência (somente leitura) |
| Dados da fatura | número_fatura, data_vencimento |
| Observação | textarea livre (aparece no rodapé do relatório) |

*\* Campos ponta/fora ponta aparecem apenas para Grupo A*

**Fluxo de regeração:** Admin edita campos → confirmação → n8n gera novo HTML → Gotenberg converte em PDF → sobrescreve anterior.

---

### 3.8 Tarifas ANEEL (`/admin/tarifas`)

Tarifas TUSD + TE por concessionária, subgrupo, modalidade e posto tarifário. Valores em R$/kWh (6 casas decimais), **sem impostos**. Import via planilha ANEEL. Vigência temporal.

### 3.9 Impostos (`/admin/impostos`)

Alíquotas ICMS, PIS, COFINS por concessionária + UF. Fator gross-up calculado: `1 / (1 - ICMS - PIS - COFINS)`. Cadastro manual com vigência temporal.

### 3.10 Alertas (`/admin/alertas`)

Alarmes dos inversores Solis/SunGrow sincronizados via cron n8n. Níveis: Dica (azul), Geral (âmbar), Emergência (vermelho). Badge na sidebar com contagem de ativos (polling 5min).

---

## 4. Portal do Cliente

### 4.1 Dashboard (`/cliente/dashboard`)

**Cards:** Geração total (kWh), Estimado (kWh), Economia (R$), Performance (Bom/Regular/Ruim + PR%).
**Gráfico:** Barras duplas (real vs estimado) dos últimos 12 meses.
**Lógica matriz/filial:** empresa matriz agrega dados de todas as filiais.

### 4.2 Histórico (`/cliente/historico`)

Relatórios enviados pela equipe Lumix. Cada um mostra mês, UC, geração, economia, PR percentual ("X% do potencial atingido") e botão download PDF.

### 4.3 Usina (`/cliente/usina`)

Dados técnicos da usina (somente leitura): potência, módulos, inversores, data de instalação.

### 4.4 Upload de Fatura (`/cliente/fatura`)

Drag-and-drop de fatura (JPG, PNG, PDF — máx 10MB). Seleciona UC e mês. Ao enviar: salva no Storage, cria registro, dispara webhook OCR. Histórico de uploads com status.

---

## 5. Cálculos do Sistema

### 5.1 Geração Estimada Mensal (kWh)

```
Geração Estimada = Potência (kWp)
                 × GHI (Wh/m²/dia) ÷ 1000
                 × Dias no mês
                 × Fator de rendimento
                 × (1 − Degradação acumulada)
```

| Variável | Fonte | Exemplo |
|----------|-------|---------|
| Potência (kWp) | UC cadastrada | 50 |
| GHI | Tabela `ghi_municipios` (5569 municípios) | 4285 Wh/m²/dia |
| Dias no mês | Calculado dinamicamente | 31 |
| Fator rendimento | UC cadastrada | 0.95 |
| Degradação | Calculada pela idade (ver abaixo) | 0.026 |

**Fallback GHI:** Se município não encontrado → média do estado (UF) via RPC `ghi_media_uf`.

### 5.2 Degradação Acumulada

```
Se idade < 1 ano:  degradação = degradacao_ano_zero
Se idade ≥ 1 ano:  degradação = degradacao_ano_zero + (anos_completos − 1) × degradacao_anos_seguintes
```

Exemplo: instalada jan/2024, referência jun/2026 = 2 anos completos.
`0.02 + (2−1) × 0.006 = 0.026` (2,6%)

### 5.3 Performance Ratio (PR)

```
PR (%) = (Geração Real ÷ Geração Estimada) × 100
```

| PR | Classificação | Cor |
|----|--------------|-----|
| ≥ 98% | Bom | Verde |
| 90% a 97% | Regular | Âmbar |
| < 90% | Ruim | Vermelho |

Exibição: "85% do potencial da usina foi atingido — Ruim"

### 5.4 Fator de Impostos (Gross-up)

```
Fator = 1 ÷ (1 − ICMS − PIS − COFINS)
```

Exemplo: ICMS=18%, PIS=1,65%, COFINS=7,6% → Fator = **1,3745**

Tarifas ANEEL são sem impostos. Multiplicar pelo fator para obter tarifa real.

### 5.5 Economia Estimada por Grupo Tarifário

| Grupo | Fórmula | Observação |
|-------|---------|-----------|
| **B** | `Geração × (TUSD + TE) × Fator Imposto` | Tarifa única, sem horário |
| **A** | `Geração × (TUSD_fp + TE_fp) × Fator Imposto` | Usa fora ponta (período diurno) |
| **ACL** | `Geração × (TUSD_fp × Fator + Contrato ACL ÷ 1000)` | Contrato já inclui impostos |

### 5.6 Economia Real (Relatório de Fatura)

```
Autoconsumo (kWh) = Geração Real − Energia Injetada
Economia Real (R$) = Autoconsumo × Tarifa com Impostos + VTO.CI
```

---

## 6. Banco de Dados — Todas as Tabelas

| Tabela | Propósito |
|--------|-----------|
| `profiles` | Perfil do usuário: role (admin/cliente), empresa_id |
| `empresas` | Empresas clientes com suporte matriz/filial |
| `unidades_consumidoras` | UCs com dados técnicos, parâmetros de estimativa, classificação tarifária, contrato ACL |
| `dados_geracao` | Geração mensal por UC: real, estimada, PR, performance |
| `faturas` | Faturas de energia (manual ou upload) |
| `faturas_processadas` | Faturas extraídas via OCR com campos editáveis |
| `relatorios` | Relatórios mensais com geração, economia, performance |
| `usinas_cache` | Cache de usinas Solis/SunGrow (sync via n8n cron) |
| `uc_stations` | Junção UC ↔ station_id (multi-provedor) |
| `ghi_municipios` | Irradiação solar por município (5569 registros) |
| `tarifas_aneel` | Tarifas TUSD/TE por concessionária (sem impostos) |
| `impostos_concessionaria` | Alíquotas ICMS/PIS/COFINS por concessionária |
| `alertas_cache` | Alarmes dos inversores |
| `grupos_empresariais` | Agrupamentos lógicos de empresas |

---

## 7. Webhooks — Payloads Completos

Todos em `https://n8n-n8n.nt4zcb.easypanel.host/`. Auth: Basic Auth (N8N_API_USER/N8N_API_PASSWORD).

### 7.1 Gerar Relatório de Geração

**Endpoint:** `/webhook/7d6333a5-5c73-4be8-a3e3-937238d4f3a8` (POST)

```json
{
  "station_id": "1298491919450374165",
  "month": "2026-05",
  "usina": {
    "station_id": "1298491919450374165",
    "station_name": "Cerâmica São Pedro",
    "capacity_kwp": 50
  },
  "periodo": {
    "mes": "2026-05",
    "mes_extenso": "Maio/2026",
    "data_inicio": "2026-05-01",
    "data_inicio_br": "01/05/2026",
    "data_fim": "2026-05-31",
    "data_fim_br": "31/05/2026",
    "dias_com_dados": 31,
    "dias_do_mes": 31
  },
  "totais": {
    "geracao_kwh": 3297.6,
    "grid_sell_kwh": 0,
    "grid_purchased_kwh": 0,
    "home_load_kwh": 3297.6
  },
  "metricas": {
    "media_diaria_kwh": 106.4,
    "mediana_diaria_kwh": 106.8,
    "melhor_dia": { "date": "2026-05-01", "date_br": "01/05/2026", "geracao_kwh": 190.6 },
    "pior_dia": { "date": "2026-05-09", "date_br": "09/05/2026", "geracao_kwh": 13.3 },
    "pr_medio": 2.13,
    "pr_max": 3.81,
    "pr_min": 0.27,
    "dias_abaixo_pr1": 6
  },
  "projecao": { "kwh_mes_completo": 3298, "completude_pct": 100 },
  "dias": [
    { "date": "2026-05-01", "date_br": "01/05/2026", "geracao_kwh": 190.6, "performance_ratio": 3.81 }
  ],
  "estimativa": {
    "geracao_estimada_kwh": 3850.42,
    "pr_percentual": 85.64,
    "pr_classificacao": "Ruim",
    "pr_texto": "86% do potencial da usina foi atingido — Ruim",
    "degradacao_acumulada": 0.026,
    "ghi_wh_m2_dia": 4285
  },
  "uc_info": {
    "grupo_tarifario": "grupo_b",
    "subgrupo": "B1",
    "concessionaria_sigla": "RGE",
    "modalidade_tarifaria_aneel": null,
    "contrato_acl_rs_mwh": null,
    "codigo_uc": "UC-12345"
  },
  "tarifas": { "grupo": "grupo_b", "tusd": 0.384521, "te": 0.298743 },
  "tarifas_com_impostos": { "tusd": 0.528523, "te": 0.410612 },
  "impostos": {
    "icms_aliquota": 0.18,
    "pis_aliquota": 0.0165,
    "cofins_aliquota": 0.076,
    "fator_imposto": 1.3745
  },
  "economia": {
    "economia_estimada_rs": 3095.12,
    "formula": "3297.6 kWh × R$ 0.939135/kWh (TUSD + TE com impostos, fator 1.3745)"
  }
}
```

**Variação Grupo A:**
```json
{
  "uc_info": { "grupo_tarifario": "grupo_a", "subgrupo": "A4", "modalidade_tarifaria_aneel": "Verde" },
  "tarifas": { "grupo": "grupo_a", "tusd_ponta": 1.234, "te_ponta": 0.567, "tusd_fora_ponta": 0.384, "te_fora_ponta": 0.298 },
  "tarifas_com_impostos": { "tusd_ponta": 1.697, "te_ponta": 0.780, "tusd_fora_ponta": 0.528, "te_fora_ponta": 0.410 }
}
```

**Variação ACL:**
```json
{
  "uc_info": { "grupo_tarifario": "acl", "contrato_acl_rs_mwh": 280.00 },
  "tarifas": { "grupo": "acl", "tusd_fora_ponta": 0.384 },
  "tarifas_com_impostos": { "tusd_fora_ponta": 0.528 },
  "economia": { "economia_estimada_rs": 2665.89, "formula": "3297.6 kWh × R$ 0.808/kWh (TUSD_fp + ACL)" }
}
```

### 7.2 Processar Fatura (Upload)

**Endpoint:** `/webhook/1f12ba76-a38d-4a8f-9441-db04f017c72f` (POST)

```json
{
  "fatura_id": "uuid",
  "uc_id": "uuid",
  "mes_referencia": "2026-05-01",
  "arquivo_url": "https://xxx.supabase.co/storage/.../fatura.pdf",
  "role": "admin",
  "user_id": "uuid"
}
```

### 7.3 Regerar Relatório de Fatura

**Endpoint:** mesmo do 7.2 (POST)

```json
{
  "fatura_id": "uuid",
  "campos_editados": {
    "consumo_total_kwh": 1234.56,
    "energia_injetada_kwh": 480.00,
    "consumo_injetado_mesma_uc_kwh": 480.00,
    "credito_acumulado_kwh": 120.00,
    "valor_total_fatura_rs": 850.40,
    "vto_ci_rs": 312.80,
    "tem_geracao_compartilhada": false,
    "numero_fatura": "123456789",
    "data_vencimento": "2026-05-15",
    "observacao": "Dados ajustados manualmente."
  },
  "admin_id": "uuid"
}
```

### 7.4 Geração Mensal (busca dados)

| Provedor | Endpoint |
|----------|----------|
| Solis | `/webhook/solis-geracao-mensal?month=YYYY-MM&station_id=X` |
| SunGrow | `/webhook/geracao-mensal-sungrow?month=YYYY-MM&station_id=X` |

### 7.5 Alertas (cron automático)

| Endpoint | Propósito |
|----------|-----------|
| `/webhook/sync-alarmes` | Sync alarmes Solis |
| `/webhook/sync-alarmes-sungrow` | Sync alarmes SunGrow |

---

## 8. Formatação e Padrões

| Função | Formato | Exemplo |
|--------|---------|---------|
| `formatCNPJ` | XX.XXX.XXX/XXXX-XX | 12.345.678/0001-90 |
| `formatCurrency` | R$ X.XXX,XX | R$ 3.095,12 |
| `formatKWh` | X.XXX,XX kWh | 3.297,60 kWh |
| `formatDate` | DD/MM/YYYY | 01/06/2026 |
| `formatMesReferencia` | mês extenso + ano | janeiro 2026 |

---

## 9. Limitações Conhecidas

| Área | Limitação |
|------|-----------|
| PDF de relatórios | Gerado pelo n8n/Gotenberg, não pelo sistema |
| Notificações | Sem envio automático de email/WhatsApp |
| Usuários por empresa | Máximo 2 (hardcoded) |
| Dashboard tempo real | Sem WebSocket — precisa refresh |
| Ações em lote | Sem seleção múltipla |
| Exportação | Apenas CSV |
| URLs webhooks | Hardcoded no código |
| PR no dashboard | Média aritmética simples |
| Contrato ACL | Campo único (sem histórico anual) |
| PIS/COFINS | Atualização manual mensal |
| Dark mode | Não implementado |
| Idioma | Apenas pt-BR |
| Backup PDF | Regeração sobrescreve sem backup |
| Concorrência | Last-write-wins (sem lock) |

---

## 10. Variáveis de Ambiente

| Variável | Propósito | Exposta ao browser? |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin server-side | Não |
| `N8N_API_USER` | Usuário Basic Auth n8n | Não |
| `N8N_API_PASSWORD` | Senha Basic Auth n8n | Não |

Arquivo local: `env/.env.local` (nunca comitar).
