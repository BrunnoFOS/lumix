-- Cache de usinas sincronizadas via cron (Solis + SunGrow)
-- n8n roda cron a cada 10 min, chama API do provedor com throttle, upsert aqui
-- Frontend lê desta tabela — resposta instantânea

CREATE TABLE IF NOT EXISTS usinas_cache (
  station_id text PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('solis', 'sungrow')),
  station_name text NOT NULL,
  cidade_uf text,
  potencia_instalada_kwp decimal(10,2) NOT NULL DEFAULT 0,
  qtd_inversores integer NOT NULL DEFAULT 0,
  modelo_inversores text[],
  potencia_inversor_kw decimal(10,2) DEFAULT 0,
  data_instalacao date,
  inversores_detalhe jsonb DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_usinas_cache_provider ON usinas_cache (provider);

ALTER TABLE usinas_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usinas_cache_select" ON usinas_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "usinas_cache_insert" ON usinas_cache FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "usinas_cache_update" ON usinas_cache FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "usinas_cache_delete" ON usinas_cache FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Função RPC para upsert em massa (chamada pelo n8n)
CREATE OR REPLACE FUNCTION sync_usinas_cache(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_rows int;
  upserted_rows int;
BEGIN
  total_rows := jsonb_array_length(payload);

  WITH input AS (
    SELECT
      (r->>'station_id')::text AS station_id,
      (r->>'provider')::text AS provider,
      (r->>'station_name')::text AS station_name,
      (r->>'cidade_uf')::text AS cidade_uf,
      COALESCE((r->>'potencia_instalada_kwp')::decimal, 0) AS potencia_instalada_kwp,
      COALESCE((r->>'qtd_inversores')::int, 0) AS qtd_inversores,
      CASE
        WHEN r->'modelo_inversores' IS NOT NULL AND jsonb_typeof(r->'modelo_inversores') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(r->'modelo_inversores'))
        ELSE '{}'::text[]
      END AS modelo_inversores,
      COALESCE((r->>'potencia_inversor_kw')::decimal, 0) AS potencia_inversor_kw,
      (r->>'data_instalacao')::date AS data_instalacao,
      COALESCE(r->'inversores_detalhe', '[]'::jsonb) AS inversores_detalhe
    FROM jsonb_array_elements(payload) AS r
  ),
  upserted AS (
    INSERT INTO usinas_cache (
      station_id, provider, station_name, cidade_uf, potencia_instalada_kwp,
      qtd_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao,
      inversores_detalhe, synced_at
    )
    SELECT
      station_id, provider, station_name, cidade_uf, potencia_instalada_kwp,
      qtd_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao,
      inversores_detalhe, now()
    FROM input
    ON CONFLICT (station_id) DO UPDATE SET
      provider = EXCLUDED.provider,
      station_name = EXCLUDED.station_name,
      cidade_uf = EXCLUDED.cidade_uf,
      potencia_instalada_kwp = EXCLUDED.potencia_instalada_kwp,
      qtd_inversores = EXCLUDED.qtd_inversores,
      modelo_inversores = EXCLUDED.modelo_inversores,
      potencia_inversor_kw = EXCLUDED.potencia_inversor_kw,
      data_instalacao = EXCLUDED.data_instalacao,
      inversores_detalhe = EXCLUDED.inversores_detalhe,
      synced_at = now()
    RETURNING station_id
  )
  SELECT count(*) INTO upserted_rows FROM upserted;

  RETURN jsonb_build_object(
    'upserted', upserted_rows,
    'total', total_rows
  );
END;
$$;
