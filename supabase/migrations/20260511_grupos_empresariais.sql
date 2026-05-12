-- Grupos empresariais substituem a lógica de matriz/filial
-- Empresas do mesmo grupo compartilham visibilidade para o cliente

CREATE TABLE IF NOT EXISTS grupos_empresariais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES grupos_empresariais(id);
CREATE INDEX IF NOT EXISTS idx_empresas_grupo ON empresas (grupo_id);

ALTER TABLE grupos_empresariais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grupos_select" ON grupos_empresariais FOR SELECT TO authenticated USING (true);
CREATE POLICY "grupos_admin" ON grupos_empresariais FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TRIGGER handle_grupos_updated_at BEFORE UPDATE ON grupos_empresariais
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
