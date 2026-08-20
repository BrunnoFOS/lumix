-- Verificar dados na tabela usinas_cache
SELECT 
  station_id,
  provider,
  station_name,
  potencia_instalada_kwp,
  synced_at
FROM usinas_cache
ORDER BY provider, station_name
LIMIT 20;

-- Contar por provider
SELECT 
  provider,
  COUNT(*) as total
FROM usinas_cache
GROUP BY provider;
