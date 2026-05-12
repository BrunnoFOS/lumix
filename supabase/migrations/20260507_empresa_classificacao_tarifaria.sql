-- Move classificação tarifária da UC para a empresa
-- Todas as UCs de uma empresa compartilham a mesma tarifa

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS grupo_tarifario text CHECK (grupo_tarifario IN ('grupo_a', 'grupo_b', 'acl')),
  ADD COLUMN IF NOT EXISTS subgrupo text,
  ADD COLUMN IF NOT EXISTS distribuidora text,
  ADD COLUMN IF NOT EXISTS modalidade_tarifaria text;

ALTER TABLE unidades_consumidoras
  DROP COLUMN IF EXISTS grupo_tarifario,
  DROP COLUMN IF EXISTS subgrupo;
