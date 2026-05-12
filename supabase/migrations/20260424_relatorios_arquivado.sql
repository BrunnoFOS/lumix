-- Adicionar campo arquivado na tabela relatorios
ALTER TABLE relatorios ADD COLUMN arquivado boolean NOT NULL DEFAULT false;
