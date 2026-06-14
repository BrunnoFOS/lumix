-- Remove feature "Grupos Empresariais"
-- 1. Remove grupo_id FK da tabela empresas
-- 2. Drop tabela grupos_empresariais

-- Remover índice
DROP INDEX IF EXISTS idx_empresas_grupo;

-- Remover coluna grupo_id de empresas
ALTER TABLE empresas DROP COLUMN IF EXISTS grupo_id;

-- Remover trigger
DROP TRIGGER IF EXISTS handle_grupos_updated_at ON grupos_empresariais;

-- Remover políticas RLS
DROP POLICY IF EXISTS "grupos_select" ON grupos_empresariais;
DROP POLICY IF EXISTS "grupos_admin" ON grupos_empresariais;

-- Dropar tabela
DROP TABLE IF EXISTS grupos_empresariais;
