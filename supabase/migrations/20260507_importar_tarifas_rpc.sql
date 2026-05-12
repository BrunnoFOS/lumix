-- Função RPC para importação em massa de tarifas ANEEL
-- Recebe array JSON, insere tudo de uma vez com ON CONFLICT DO NOTHING
-- Retorna contagem de inseridos e duplicados

CREATE OR REPLACE FUNCTION importar_tarifas_aneel(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_rows int;
  inserted_rows int;
BEGIN
  total_rows := jsonb_array_length(payload);

  WITH input AS (
    SELECT
      (r->>'sigla')::text AS sigla,
      (r->>'subgrupo')::text AS subgrupo,
      (r->>'modalidade')::text AS modalidade,
      (r->>'posto')::text AS posto,
      (r->>'tusd')::decimal(10,6) AS tusd,
      (r->>'te')::decimal(10,6) AS te,
      (r->>'vigencia_inicio')::date AS vigencia_inicio,
      (r->>'vigencia_fim')::date AS vigencia_fim
    FROM jsonb_array_elements(payload) AS r
  ),
  inserted AS (
    INSERT INTO tarifas_aneel (sigla, subgrupo, modalidade, posto, tusd, te, vigencia_inicio, vigencia_fim)
    SELECT sigla, subgrupo, modalidade, posto, tusd, te, vigencia_inicio, vigencia_fim
    FROM input
    ON CONFLICT (sigla, subgrupo, COALESCE(modalidade, ''), posto, vigencia_inicio) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO inserted_rows FROM inserted;

  RETURN jsonb_build_object(
    'inseridos', inserted_rows,
    'duplicados', total_rows - inserted_rows
  );
END;
$$;
