-- Relaxar constraints de módulos (removidos do sistema) e modalidade (valores da ANEEL)
ALTER TABLE unidades_consumidoras ALTER COLUMN quantidade_modulos SET DEFAULT 0;
ALTER TABLE unidades_consumidoras ALTER COLUMN quantidade_modulos DROP NOT NULL;
ALTER TABLE unidades_consumidoras DROP CONSTRAINT IF EXISTS unidades_consumidoras_modalidade_tarifaria_check;
