-- Habilitar extensões para matching fuzzy de nomes de usinas
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- RPC para buscar UCs similares por nome dentro de uma empresa
-- Retorna UCs com similarity >= threshold, ordenadas por score desc
CREATE OR REPLACE FUNCTION buscar_uc_similar(
  p_empresa_id uuid,
  p_nome text,
  p_threshold real DEFAULT 0.3
)
RETURNS TABLE (
  uc_id uuid,
  codigo_uc text,
  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id AS uc_id,
    codigo_uc,
    similarity(
      lower(unaccent(codigo_uc)),
      lower(unaccent(p_nome))
    ) AS score
  FROM unidades_consumidoras
  WHERE empresa_id = p_empresa_id
    AND ativa = true
    AND similarity(
      lower(unaccent(codigo_uc)),
      lower(unaccent(p_nome))
    ) >= p_threshold
  ORDER BY score DESC
  LIMIT 5;
$$;
