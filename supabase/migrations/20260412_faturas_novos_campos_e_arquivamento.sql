-- Migration: Novos campos de fatura + campo arquivada em empresas/UCs
-- Date: 2026-04-12

-- ============================================================
-- 1. Adicionar campo 'arquivada' em empresas e unidades_consumidoras
-- ============================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false;

ALTER TABLE unidades_consumidoras
  ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Adicionar novos campos na tabela faturas
-- ============================================================

ALTER TABLE faturas
  ADD COLUMN IF NOT EXISTS denominacao text,
  ADD COLUMN IF NOT EXISTS contrato text,
  ADD COLUMN IF NOT EXISTS valor_faturado decimal(10,2),
  ADD COLUMN IF NOT EXISTS inicio_ciclo date,
  ADD COLUMN IF NOT EXISTS fim_ciclo date,
  ADD COLUMN IF NOT EXISTS energia_faturada_fp decimal(10,2),
  ADD COLUMN IF NOT EXISTS valor_tarifa_fp decimal(10,6),
  ADD COLUMN IF NOT EXISTS kwh_compensado_fp decimal(10,2),
  ADD COLUMN IF NOT EXISTS tarifa_compensada_fp decimal(10,6),
  ADD COLUMN IF NOT EXISTS energia_consumida_fp decimal(10,2),
  ADD COLUMN IF NOT EXISTS energia_injetada_fp decimal(10,2),
  ADD COLUMN IF NOT EXISTS pdf_url text;
