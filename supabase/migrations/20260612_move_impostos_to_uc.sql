-- Move alíquotas de impostos da tabela impostos_concessionaria para unidades_consumidoras
-- Admin insere manualmente por UC na classificação tarifária

ALTER TABLE unidades_consumidoras ADD COLUMN IF NOT EXISTS icms_aliquota decimal(6,5) DEFAULT NULL;
ALTER TABLE unidades_consumidoras ADD COLUMN IF NOT EXISTS pis_aliquota decimal(6,5) DEFAULT NULL;
ALTER TABLE unidades_consumidoras ADD COLUMN IF NOT EXISTS cofins_aliquota decimal(6,5) DEFAULT NULL;

COMMENT ON COLUMN unidades_consumidoras.icms_aliquota IS 'Alíquota ICMS (ex: 0.18000 para 18%)';
COMMENT ON COLUMN unidades_consumidoras.pis_aliquota IS 'Alíquota PIS (ex: 0.01650 para 1,65%)';
COMMENT ON COLUMN unidades_consumidoras.cofins_aliquota IS 'Alíquota COFINS (ex: 0.07600 para 7,6%)';

-- Dropar tabela impostos_concessionaria
DROP TABLE IF EXISTS impostos_concessionaria;
