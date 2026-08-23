-- Tabela de notificações in-app para admins
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('fatura_cliente', 'fatura_processada', 'relatorio_gerado', 'outro')),
  mensagem text NOT NULL,
  fatura_id uuid REFERENCES faturas(id) ON DELETE CASCADE,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index para buscar notificações não lidas rapidamente
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida, created_at DESC);

-- RLS: apenas admins podem acessar
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ler todas as notificacoes"
  ON notificacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin pode marcar como lida"
  ON notificacoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
