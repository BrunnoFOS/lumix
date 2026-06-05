-- Tabela de junção: permite vincular múltiplos station_ids (provedores) a uma mesma UC
-- Caso de uso: usina com inversores Solis + SunGrow (ex: Mônaco Parobé)

CREATE TABLE uc_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uc_id uuid NOT NULL REFERENCES unidades_consumidoras(id) ON DELETE CASCADE,
  station_id text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('solis', 'sungrow')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uc_id, station_id),
  UNIQUE (station_id)
);

CREATE INDEX idx_uc_stations_uc_id ON uc_stations(uc_id);
CREATE INDEX idx_uc_stations_station_id ON uc_stations(station_id);

-- Migrar dados existentes: station_id da UC → uc_stations
INSERT INTO uc_stations (uc_id, station_id, provider)
SELECT
  uc.id,
  uc.station_id,
  COALESCE(cache.provider, 'solis')
FROM unidades_consumidoras uc
LEFT JOIN usinas_cache cache ON cache.station_id = uc.station_id
WHERE uc.station_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE uc_stations ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_all" ON uc_stations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Cliente: leitura das UCs da sua empresa
CREATE POLICY "cliente_select" ON uc_stations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM unidades_consumidoras uc
      JOIN profiles p ON p.empresa_id = uc.empresa_id
      WHERE uc.id = uc_stations.uc_id
        AND p.id = auth.uid()
    )
  );
