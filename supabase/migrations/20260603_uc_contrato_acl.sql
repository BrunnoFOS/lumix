-- Campo de contrato ACL (Mercado Livre) nas UCs
-- Preço negociado em R$/MWh. Dividir por 1000 para converter em R$/kWh.
ALTER TABLE unidades_consumidoras
  ADD COLUMN IF NOT EXISTS contrato_acl_rs_mwh decimal(10,2);
