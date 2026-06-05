-- Faturas processadas via LlamaParse + Gemini
-- Permite edição de campos extraídos e regeração do PDF do relatório

CREATE TABLE IF NOT EXISTS faturas_processadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uc_id uuid NOT NULL REFERENCES unidades_consumidoras(id),
  mes_referencia date NOT NULL,
  pdf_fatura_url text,
  pdf_relatorio_url text,
  status text NOT NULL DEFAULT 'extraindo'
    CHECK (status IN ('extraindo','extraido','gerando','gerado','erro')),
  observacao text,
  ultima_edicao_at timestamptz,
  editado_por uuid REFERENCES profiles(id),

  -- Campos extraídos (editáveis pelo admin)
  consumo_total_kwh decimal(10,2),
  consumo_ponta_kwh decimal(10,2),
  consumo_fora_ponta_kwh decimal(10,2),
  energia_injetada_kwh decimal(10,2),
  consumo_injetado_mesma_uc_kwh decimal(10,2),
  consumo_injetado_outra_uc_kwh decimal(10,2),
  credito_acumulado_kwh decimal(10,2),
  valor_total_fatura_rs decimal(10,2),
  vto_ci_rs decimal(10,2),
  tem_geracao_compartilhada boolean DEFAULT false,
  evidencia_geracao_compartilhada text,
  data_vencimento date,
  numero_fatura text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(uc_id, mes_referencia)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_faturas_processadas_uc_id ON faturas_processadas(uc_id);

-- Trigger updated_at
CREATE TRIGGER set_faturas_processadas_updated_at
  BEFORE UPDATE ON faturas_processadas
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE faturas_processadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faturas_processadas_select_admin"
  ON faturas_processadas FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM unidades_consumidoras uc
      JOIN profiles p ON p.empresa_id = uc.empresa_id
      WHERE uc.id = faturas_processadas.uc_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "faturas_processadas_insert_admin"
  ON faturas_processadas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "faturas_processadas_update_admin"
  ON faturas_processadas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "faturas_processadas_delete_admin"
  ON faturas_processadas FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
