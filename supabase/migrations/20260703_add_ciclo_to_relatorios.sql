ALTER TABLE relatorios
  ADD COLUMN IF NOT EXISTS inicio_ciclo date,
  ADD COLUMN IF NOT EXISTS fim_ciclo date;
