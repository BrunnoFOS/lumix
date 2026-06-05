-- GHI por município + parâmetros de degradação nas UCs
-- Permite cálculo automático da geração estimada mensal

-- 1. Tabela de GHI por município
CREATE TABLE IF NOT EXISTS ghi_municipios (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  uf char(2) NOT NULL,
  lat decimal(10,6),
  lon decimal(10,6),
  jan decimal(8,2) NOT NULL,
  fev decimal(8,2) NOT NULL,
  mar decimal(8,2) NOT NULL,
  abr decimal(8,2) NOT NULL,
  mai decimal(8,2) NOT NULL,
  jun decimal(8,2) NOT NULL,
  jul decimal(8,2) NOT NULL,
  ago decimal(8,2) NOT NULL,
  set_ decimal(8,2) NOT NULL,
  out decimal(8,2) NOT NULL,
  nov decimal(8,2) NOT NULL,
  dez decimal(8,2) NOT NULL,
  anual decimal(8,2) NOT NULL,
  UNIQUE(nome, uf)
);

-- Index para lookup rápido
CREATE INDEX IF NOT EXISTS idx_ghi_municipios_nome_uf ON ghi_municipios(nome, uf);

-- RLS
ALTER TABLE ghi_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ghi_municipios_select_authenticated"
  ON ghi_municipios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ghi_municipios_insert_admin"
  ON ghi_municipios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ghi_municipios_update_admin"
  ON ghi_municipios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ghi_municipios_delete_admin"
  ON ghi_municipios FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Novos campos de estimativa nas UCs
ALTER TABLE unidades_consumidoras
  ADD COLUMN IF NOT EXISTS fator_rendimento decimal(5,4),
  ADD COLUMN IF NOT EXISTS degradacao_ano_zero decimal(5,4),
  ADD COLUMN IF NOT EXISTS degradacao_anos_seguintes decimal(5,4);
