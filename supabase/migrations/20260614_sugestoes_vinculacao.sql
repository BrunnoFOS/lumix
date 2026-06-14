-- Tabela para armazenar sugestões automáticas de vinculação via trigrama.
-- Populada quando novas stations são sincronizadas e há match com UCs existentes.
-- Admin revisa e confirma ou rejeita cada sugestão.

CREATE TABLE IF NOT EXISTS sugestoes_vinculacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  station_name text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('solis', 'sungrow')),
  uc_id uuid NOT NULL REFERENCES unidades_consumidoras(id) ON DELETE CASCADE,
  uc_codigo text NOT NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  score decimal(5,4) NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmada', 'rejeitada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolvido_at timestamptz,
  resolvido_por uuid REFERENCES profiles(id),
  UNIQUE(station_id, uc_id)
);

-- Índices para queries frequentes
CREATE INDEX idx_sugestoes_vinculacao_status ON sugestoes_vinculacao(status);
CREATE INDEX idx_sugestoes_vinculacao_empresa ON sugestoes_vinculacao(empresa_id);

-- RLS
ALTER TABLE sugestoes_vinculacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total sugestoes_vinculacao"
  ON sugestoes_vinculacao FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- RPC para detectar sugestões automaticamente a partir de stations não vinculadas
CREATE OR REPLACE FUNCTION detectar_sugestoes_vinculacao(p_threshold decimal DEFAULT 0.3)
RETURNS integer AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- Inserir sugestões para stations do cache que NÃO estão em uc_stations
  -- e que têm match de trigrama com UCs existentes
  INSERT INTO sugestoes_vinculacao (station_id, station_name, provider, uc_id, uc_codigo, empresa_id, score)
  SELECT
    uc_cache.station_id,
    uc_cache.station_name,
    uc_cache.provider,
    uc.id AS uc_id,
    uc.codigo_uc AS uc_codigo,
    uc.empresa_id,
    similarity(lower(unaccent(uc_cache.station_name)), lower(unaccent(uc.codigo_uc))) AS score
  FROM usinas_cache uc_cache
  CROSS JOIN unidades_consumidoras uc
  WHERE
    -- Station não está vinculada ainda
    NOT EXISTS (
      SELECT 1 FROM uc_stations us WHERE us.station_id = uc_cache.station_id
    )
    -- UC está ativa e não arquivada
    AND uc.ativa = true
    AND uc.arquivada = false
    -- Similarity acima do threshold
    AND similarity(lower(unaccent(uc_cache.station_name)), lower(unaccent(uc.codigo_uc))) >= p_threshold
    -- Não já sugerido (pendente ou rejeitado recentemente)
    AND NOT EXISTS (
      SELECT 1 FROM sugestoes_vinculacao sv
      WHERE sv.station_id = uc_cache.station_id AND sv.uc_id = uc.id
    )
  ORDER BY score DESC
  ON CONFLICT (station_id, uc_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
