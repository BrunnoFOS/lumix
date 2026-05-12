-- Tabela de tarifas importadas do BI da ANEEL
-- Registros nunca são sobrescritos — cada importação insere novos registros
-- Relatórios buscam a tarifa cuja vigência cobre o mês de referência

CREATE TABLE IF NOT EXISTS tarifas_aneel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla text NOT NULL,                -- Sigla da concessionária (ex: CELESC, CEMIG)
  subgrupo text NOT NULL,             -- Ex: A4, B1, B2, B3
  modalidade text,                    -- Ex: Verde, Azul (pode ser null para grupo B)
  posto text NOT NULL,                -- Ex: Ponta, Fora ponta, Não se aplica
  tusd decimal(10,6) NOT NULL,        -- Valor TUSD em R$/kWh
  te decimal(10,6) NOT NULL,          -- Valor TE em R$/kWh
  vigencia_inicio date NOT NULL,      -- Início da vigência
  vigencia_fim date,                  -- Fim da vigência (null = vigente)
  importado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para lookup rápido: sigla + subgrupo + modalidade + posto + vigência
CREATE INDEX idx_tarifas_aneel_lookup
  ON tarifas_aneel (sigla, subgrupo, posto, vigencia_inicio);

-- Índice para busca por vigência
CREATE INDEX idx_tarifas_aneel_vigencia
  ON tarifas_aneel (vigencia_inicio, vigencia_fim);

-- Unique constraint para evitar duplicatas na mesma importação
CREATE UNIQUE INDEX idx_tarifas_aneel_unique
  ON tarifas_aneel (sigla, subgrupo, COALESCE(modalidade, ''), posto, vigencia_inicio);

-- RLS
ALTER TABLE tarifas_aneel ENABLE ROW LEVEL SECURITY;

-- Todos os autenticados podem ler (mesmo padrão da tabela tarifas)
CREATE POLICY "tarifas_aneel_select" ON tarifas_aneel
  FOR SELECT TO authenticated USING (true);

-- Apenas admin pode inserir
CREATE POLICY "tarifas_aneel_insert" ON tarifas_aneel
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Apenas admin pode deletar (para limpeza se necessário)
CREATE POLICY "tarifas_aneel_delete" ON tarifas_aneel
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
