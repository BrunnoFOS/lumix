-- Corrige a foreign key relatorios.fatura_id para permitir exclusão de faturas
-- Quando uma fatura é excluída, o campo fatura_id dos relatórios vinculados será setado para NULL

ALTER TABLE relatorios
DROP CONSTRAINT IF EXISTS relatorios_fatura_id_fkey,
ADD CONSTRAINT relatorios_fatura_id_fkey
  FOREIGN KEY (fatura_id)
  REFERENCES faturas(id)
  ON DELETE SET NULL;
