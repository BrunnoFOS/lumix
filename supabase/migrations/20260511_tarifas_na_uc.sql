-- Move classificação tarifária de empresas para unidades_consumidoras
-- Cada UC pode ter tarifa diferente (concessionárias/subgrupos distintos)

ALTER TABLE unidades_consumidoras
  ADD COLUMN IF NOT EXISTS grupo_tarifario text CHECK (grupo_tarifario IN ('grupo_a', 'grupo_b', 'acl')),
  ADD COLUMN IF NOT EXISTS subgrupo text,
  ADD COLUMN IF NOT EXISTS concessionaria_sigla text,
  ADD COLUMN IF NOT EXISTS modalidade_tarifaria_aneel text;

ALTER TABLE empresas
  DROP COLUMN IF EXISTS grupo_tarifario,
  DROP COLUMN IF EXISTS subgrupo,
  DROP COLUMN IF EXISTS distribuidora,
  DROP COLUMN IF EXISTS modalidade_tarifaria;
