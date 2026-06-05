-- Impostos por concessionária (ICMS, PIS, COFINS) com vigência temporal
-- Fator gross-up: 1 / (1 - icms - pis - cofins)

CREATE TABLE IF NOT EXISTS impostos_concessionaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concessionaria_sigla text NOT NULL,
  uf char(2) NOT NULL,
  icms_aliquota decimal(6,5) NOT NULL,
  pis_aliquota decimal(6,5) NOT NULL,
  cofins_aliquota decimal(6,5) NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  fonte_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impostos_conc_vigencia
  ON impostos_concessionaria (concessionaria_sigla, vigencia_inicio, vigencia_fim);

ALTER TABLE impostos_concessionaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impostos_select_authenticated"
  ON impostos_concessionaria FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "impostos_insert_admin"
  ON impostos_concessionaria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "impostos_update_admin"
  ON impostos_concessionaria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "impostos_delete_admin"
  ON impostos_concessionaria FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
