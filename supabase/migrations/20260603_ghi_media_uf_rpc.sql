-- RPC para calcular a média de GHI de um estado (UF) em uma coluna específica.
-- Usado como fallback quando o município exato não é encontrado na tabela ghi_municipios.

CREATE OR REPLACE FUNCTION ghi_media_uf(p_uf char(2), p_coluna text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado numeric;
BEGIN
  -- Validar nome da coluna para evitar SQL injection
  IF p_coluna NOT IN ('jan','fev','mar','abr','mai','jun','jul','ago','set_','out','nov','dez','anual') THEN
    RAISE EXCEPTION 'Coluna inválida: %', p_coluna;
  END IF;

  EXECUTE format('SELECT ROUND(AVG(%I), 2) FROM ghi_municipios WHERE uf = $1', p_coluna)
    INTO resultado
    USING p_uf;

  RETURN resultado;
END;
$$;
