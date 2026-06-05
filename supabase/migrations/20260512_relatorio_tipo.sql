-- Diferencia relatórios reais (com fatura) de estimados (só geração)
ALTER TABLE relatorios ADD COLUMN IF NOT EXISTS tipo_relatorio text NOT NULL DEFAULT 'estimado' CHECK (tipo_relatorio IN ('real', 'estimado'));
