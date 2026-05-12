-- Adiciona classificação tarifária na UC
-- grupo_tarifario: Grupo A (alta tensão), Grupo B (baixa tensão), ACL (mercado livre)
-- subgrupo: A1, A2, A3, A3A, A4, AS, B1, B2, B3, B4

ALTER TABLE unidades_consumidoras
  ADD COLUMN IF NOT EXISTS grupo_tarifario text CHECK (grupo_tarifario IN ('grupo_a', 'grupo_b', 'acl')),
  ADD COLUMN IF NOT EXISTS subgrupo text;
