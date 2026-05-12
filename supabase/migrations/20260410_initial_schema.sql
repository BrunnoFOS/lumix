-- Lumix — Initial Schema Migration
-- Source of truth: docs/schema.md

-- ============================================================
-- Functions & Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', ''), 'cliente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Tables
-- ============================================================

-- empresas
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'matriz' CHECK (tipo IN ('matriz', 'filial')),
  matriz_id uuid REFERENCES empresas(id),
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  responsavel text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'cliente')),
  nome text NOT NULL,
  email text NOT NULL,
  empresa_id uuid REFERENCES empresas(id),
  telefone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- unidades_consumidoras
CREATE TABLE IF NOT EXISTS unidades_consumidoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  codigo_uc text NOT NULL,
  titular text NOT NULL,
  endereco text,
  cidade text,
  estado text,
  distribuidora text NOT NULL,
  enquadramento_tarifario text NOT NULL CHECK (enquadramento_tarifario IN ('monofasico', 'bifasico', 'trifasico')),
  modalidade_tarifaria text NOT NULL DEFAULT 'convencional' CHECK (modalidade_tarifaria IN ('convencional', 'branca', 'verde', 'azul')),
  potencia_instalada_kwp decimal(10,2) NOT NULL,
  quantidade_modulos integer NOT NULL,
  modelo_modulos text,
  potencia_modulo_w integer,
  quantidade_inversores integer NOT NULL,
  modelo_inversores text,
  potencia_inversor_kw decimal(10,2),
  data_instalacao date,
  geracao_estimada_mensal_kwh decimal(10,2),
  ativa boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- dados_geracao
CREATE TABLE IF NOT EXISTS dados_geracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uc_id uuid NOT NULL REFERENCES unidades_consumidoras(id),
  mes_referencia date NOT NULL,
  geracao_kwh decimal(10,2) NOT NULL,
  geracao_estimada_kwh decimal(10,2),
  irradiacao_media decimal(8,2),
  performance_ratio decimal(5,2),
  indice_performance text CHECK (indice_performance IN ('bom', 'regular', 'ruim')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uc_id, mes_referencia)
);

-- faturas
CREATE TABLE IF NOT EXISTS faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uc_id uuid NOT NULL REFERENCES unidades_consumidoras(id),
  mes_referencia date NOT NULL,
  valor_total decimal(10,2),
  consumo_kwh decimal(10,2),
  energia_injetada_kwh decimal(10,2),
  creditos_energia_kwh decimal(10,2),
  demanda_contratada_kw decimal(10,2),
  valor_tusd decimal(10,2),
  valor_te decimal(10,2),
  economia_estimada decimal(10,2),
  imagem_url text,
  dados_extraidos jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processada', 'erro')),
  inserido_por uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uc_id, mes_referencia)
);

-- relatorios
CREATE TABLE IF NOT EXISTS relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uc_id uuid NOT NULL REFERENCES unidades_consumidoras(id),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  mes_referencia date NOT NULL,
  titulo text NOT NULL,
  pdf_url text,
  geracao_kwh decimal(10,2),
  geracao_estimada_kwh decimal(10,2),
  economia_reais decimal(10,2),
  indice_performance text CHECK (indice_performance IN ('bom', 'regular', 'ruim')),
  status_envio text NOT NULL DEFAULT 'pendente' CHECK (status_envio IN ('pendente', 'enviado', 'erro')),
  gerado_por text NOT NULL DEFAULT 'manual' CHECK (gerado_por IN ('automatico', 'manual')),
  fatura_id uuid REFERENCES faturas(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- tarifas
CREATE TABLE IF NOT EXISTS tarifas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidora text NOT NULL,
  modalidade text NOT NULL CHECK (modalidade IN ('convencional', 'branca', 'verde', 'azul')),
  posto_tarifario text NOT NULL CHECK (posto_tarifario IN ('ponta', 'fora_ponta', 'intermediario', 'unico')),
  valor_tusd decimal(10,6) NOT NULL,
  valor_te decimal(10,6) NOT NULL,
  valor_total decimal(10,6) NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (distribuidora, modalidade, posto_tarifario, vigencia_inicio)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_matriz_id ON empresas(matriz_id);
CREATE INDEX IF NOT EXISTS idx_unidades_consumidoras_empresa_id ON unidades_consumidoras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_unidades_consumidoras_codigo_uc ON unidades_consumidoras(codigo_uc);
CREATE INDEX IF NOT EXISTS idx_relatorios_empresa_id ON relatorios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_uc_mes ON relatorios(uc_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_tarifas_distribuidora_modalidade ON tarifas(distribuidora, modalidade);

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_empresas
  BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_unidades_consumidoras
  BEFORE UPDATE ON unidades_consumidoras FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_faturas
  BEFORE UPDATE ON faturas FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_relatorios
  BEFORE UPDATE ON relatorios FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_tarifas
  BEFORE UPDATE ON tarifas FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- handle_new_user trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades_consumidoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_geracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Admin lê todos os profiles"
  ON profiles FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Cliente lê próprio profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Usuário atualiza próprio profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admin atualiza qualquer profile"
  ON profiles FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin deleta profiles"
  ON profiles FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Empresas policies
CREATE POLICY "Admin lê todas as empresas"
  ON empresas FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Cliente lê própria empresa"
  ON empresas FOR SELECT
  USING (
    id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    OR matriz_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin insere empresas"
  ON empresas FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin atualiza empresas"
  ON empresas FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin deleta empresas"
  ON empresas FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Unidades consumidoras policies
CREATE POLICY "Admin lê todas as UCs"
  ON unidades_consumidoras FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Cliente lê UCs da sua empresa"
  ON unidades_consumidoras FOR SELECT
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin insere UCs"
  ON unidades_consumidoras FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin atualiza UCs"
  ON unidades_consumidoras FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin deleta UCs"
  ON unidades_consumidoras FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Dados geração policies
CREATE POLICY "Admin lê todos os dados de geração"
  ON dados_geracao FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Cliente lê dados de geração das suas UCs"
  ON dados_geracao FOR SELECT
  USING (
    uc_id IN (
      SELECT id FROM unidades_consumidoras
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admin insere dados de geração"
  ON dados_geracao FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin atualiza dados de geração"
  ON dados_geracao FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin deleta dados de geração"
  ON dados_geracao FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Faturas policies
CREATE POLICY "Admin lê todas as faturas"
  ON faturas FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Cliente lê faturas das suas UCs"
  ON faturas FOR SELECT
  USING (
    uc_id IN (
      SELECT id FROM unidades_consumidoras
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admin insere faturas"
  ON faturas FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Cliente insere faturas das suas UCs"
  ON faturas FOR INSERT
  WITH CHECK (
    uc_id IN (
      SELECT id FROM unidades_consumidoras
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admin atualiza faturas"
  ON faturas FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin deleta faturas"
  ON faturas FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Relatórios policies
CREATE POLICY "Admin lê todos os relatórios"
  ON relatorios FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Cliente lê relatórios da sua empresa"
  ON relatorios FOR SELECT
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin insere relatórios"
  ON relatorios FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin atualiza relatórios"
  ON relatorios FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin deleta relatórios"
  ON relatorios FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Tarifas policies
CREATE POLICY "Usuários autenticados leem tarifas"
  ON tarifas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insere tarifas"
  ON tarifas FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin atualiza tarifas"
  ON tarifas FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin deleta tarifas"
  ON tarifas FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
