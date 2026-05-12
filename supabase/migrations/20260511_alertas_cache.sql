-- Cache de alertas sincronizados via cron n8n (Solis + SunGrow)
-- n8n roda cron, chama API do provedor, upsert aqui
-- Frontend lê desta tabela — sem webhook direto

CREATE TABLE IF NOT EXISTS alertas_cache (
  id text PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('solis', 'sungrow')),
  station_id text NOT NULL,
  station_name text NOT NULL,
  inverter_sn text,
  alarm_code text,
  alarm_msg text NOT NULL,
  advice text,
  alarm_level integer NOT NULL DEFAULT 1,
  alarm_level_label text NOT NULL DEFAULT 'tip',
  alarm_begin_time_iso timestamptz NOT NULL,
  alarm_begin_time_br text,
  alarm_end_time_iso timestamptz,
  alarm_end_time_br text,
  alarm_duration_minutes integer DEFAULT 0,
  state integer NOT NULL DEFAULT 0,
  state_label text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT true,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alertas_cache_provider ON alertas_cache (provider);
CREATE INDEX idx_alertas_cache_active ON alertas_cache (is_active, alarm_level);

ALTER TABLE alertas_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_cache_select" ON alertas_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "alertas_cache_all_admin" ON alertas_cache FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RPC para upsert em massa (chamada pelo n8n cron)
-- Remove alertas que não estão mais no payload (resolvidos)
CREATE OR REPLACE FUNCTION sync_alertas_cache(p_provider text, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_rows int;
  upserted_rows int;
BEGIN
  total_rows := jsonb_array_length(payload);

  DELETE FROM alertas_cache
  WHERE provider = p_provider
    AND id NOT IN (
      SELECT (r->>'id')::text FROM jsonb_array_elements(payload) AS r
    );

  WITH input AS (
    SELECT
      (r->>'id')::text AS id,
      p_provider AS provider,
      (r->>'station_id')::text AS station_id,
      (r->>'station_name')::text AS station_name,
      (r->>'inverter_sn')::text AS inverter_sn,
      (r->>'alarm_code')::text AS alarm_code,
      (r->>'alarm_msg')::text AS alarm_msg,
      (r->>'advice')::text AS advice,
      COALESCE((r->>'alarm_level')::int, 1) AS alarm_level,
      COALESCE(r->>'alarm_level_label', 'tip') AS alarm_level_label,
      (r->>'alarm_begin_time_iso')::timestamptz AS alarm_begin_time_iso,
      r->>'alarm_begin_time_br' AS alarm_begin_time_br,
      (r->>'alarm_end_time_iso')::timestamptz AS alarm_end_time_iso,
      r->>'alarm_end_time_br' AS alarm_end_time_br,
      COALESCE((r->>'alarm_duration_minutes')::int, 0) AS alarm_duration_minutes,
      COALESCE((r->>'state')::int, 0) AS state,
      COALESCE(r->>'state_label', 'pending') AS state_label,
      COALESCE((r->>'is_active')::boolean, true) AS is_active
    FROM jsonb_array_elements(payload) AS r
  ),
  upserted AS (
    INSERT INTO alertas_cache (
      id, provider, station_id, station_name, inverter_sn, alarm_code, alarm_msg,
      advice, alarm_level, alarm_level_label, alarm_begin_time_iso, alarm_begin_time_br,
      alarm_end_time_iso, alarm_end_time_br, alarm_duration_minutes, state, state_label,
      is_active, synced_at
    )
    SELECT
      id, provider, station_id, station_name, inverter_sn, alarm_code, alarm_msg,
      advice, alarm_level, alarm_level_label, alarm_begin_time_iso, alarm_begin_time_br,
      alarm_end_time_iso, alarm_end_time_br, alarm_duration_minutes, state, state_label,
      is_active, now()
    FROM input
    ON CONFLICT (id) DO UPDATE SET
      station_name = EXCLUDED.station_name,
      inverter_sn = EXCLUDED.inverter_sn,
      alarm_msg = EXCLUDED.alarm_msg,
      advice = EXCLUDED.advice,
      alarm_level = EXCLUDED.alarm_level,
      alarm_level_label = EXCLUDED.alarm_level_label,
      alarm_end_time_iso = EXCLUDED.alarm_end_time_iso,
      alarm_end_time_br = EXCLUDED.alarm_end_time_br,
      alarm_duration_minutes = EXCLUDED.alarm_duration_minutes,
      state = EXCLUDED.state,
      state_label = EXCLUDED.state_label,
      is_active = EXCLUDED.is_active,
      synced_at = now()
    RETURNING id
  )
  SELECT count(*) INTO upserted_rows FROM upserted;

  RETURN jsonb_build_object(
    'upserted', upserted_rows,
    'total', total_rows
  );
END;
$$;
