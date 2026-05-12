-- Lumix — Seed Data
-- Dados de exemplo para visualização e teste

-- ============================================================
-- Empresas
-- ============================================================

INSERT INTO empresas (id, nome, cnpj, tipo, endereco, cidade, estado, cep, telefone, email, responsavel) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Solar Tech Ltda', '12345678000190', 'matriz', 'Rua das Palmeiras, 100', 'Belo Horizonte', 'MG', '30130000', '31999990001', 'contato@solartech.com.br', 'Carlos Silva'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Solar Tech Filial SP', '12345678000290', 'filial', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310100', '11999990002', 'sp@solartech.com.br', 'Ana Costa'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Energia Verde S.A.', '98765432000110', 'matriz', 'Av. Brasil, 500', 'Rio de Janeiro', 'RJ', '20040020', '21999990003', 'contato@energiaverde.com.br', 'Roberto Lima');

-- Vincular filial à matriz
UPDATE empresas SET matriz_id = 'a1b2c3d4-0001-4000-8000-000000000001'
WHERE id = 'a1b2c3d4-0002-4000-8000-000000000002';

-- ============================================================
-- Unidades Consumidoras
-- ============================================================

INSERT INTO unidades_consumidoras (id, empresa_id, codigo_uc, titular, endereco, cidade, estado, distribuidora, enquadramento_tarifario, modalidade_tarifaria, potencia_instalada_kwp, quantidade_modulos, modelo_modulos, potencia_modulo_w, quantidade_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, geracao_estimada_mensal_kwh) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'UC-MG-001', 'Solar Tech Ltda', 'Rua das Palmeiras, 100', 'Belo Horizonte', 'MG', 'CEMIG', 'trifasico', 'convencional', 75.00, 150, 'Canadian Solar CS6W-500MS', 500, 3, 'Fronius Symo 25.0', 25.00, '2024-06-15', 9500.00),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'UC-MG-002', 'Solar Tech Ltda', 'Rua do Sol, 200', 'Belo Horizonte', 'MG', 'CEMIG', 'bifasico', 'convencional', 12.00, 24, 'JA Solar JAM72S30-500', 500, 1, 'Growatt MIN 10000TL-X', 10.00, '2025-01-10', 1500.00),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', 'UC-RJ-001', 'Energia Verde S.A.', 'Av. Brasil, 500', 'Rio de Janeiro', 'RJ', 'Light', 'trifasico', 'verde', 150.00, 300, 'Trina Solar TSM-500DE18M', 500, 6, 'Huawei SUN2000-25KTL', 25.00, '2023-11-20', 18000.00);

-- ============================================================
-- Dados de Geração (últimos 6 meses para cada UC)
-- ============================================================

INSERT INTO dados_geracao (uc_id, mes_referencia, geracao_kwh, geracao_estimada_kwh, irradiacao_media, performance_ratio, indice_performance) VALUES
  -- UC-MG-001 (Solar Tech)
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-11-01', 10200.00, 9500.00, 5.80, 89.50, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-12-01', 9800.00, 9500.00, 5.60, 86.00, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-01-01', 8500.00, 9500.00, 4.90, 74.60, 'regular'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-02-01', 9200.00, 9500.00, 5.30, 80.70, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-03-01', 9600.00, 9500.00, 5.50, 84.20, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-04-01', 8900.00, 9500.00, 5.10, 78.10, 'regular'),

  -- UC-MG-002 (Solar Tech)
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-11-01', 1620.00, 1500.00, 5.80, 90.00, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-12-01', 1550.00, 1500.00, 5.60, 86.10, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-01-01', 1300.00, 1500.00, 4.90, 72.20, 'regular'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-02-01', 1450.00, 1500.00, 5.30, 80.60, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-03-01', 1480.00, 1500.00, 5.50, 82.20, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-04-01', 1100.00, 1500.00, 4.50, 61.10, 'ruim'),

  -- UC-RJ-001 (Energia Verde)
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-11-01', 19500.00, 18000.00, 6.10, 90.30, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-12-01', 18200.00, 18000.00, 5.80, 84.30, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-01-01', 15000.00, 18000.00, 4.70, 69.40, 'ruim'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-02-01', 17500.00, 18000.00, 5.50, 81.00, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-03-01', 18500.00, 18000.00, 5.90, 85.60, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-04-01', 17000.00, 18000.00, 5.40, 78.70, 'regular');

-- ============================================================
-- Faturas (últimos 3 meses)
-- ============================================================

INSERT INTO faturas (uc_id, mes_referencia, valor_total, consumo_kwh, energia_injetada_kwh, creditos_energia_kwh, valor_tusd, valor_te, economia_estimada, status) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-02-01', 450.00, 320.00, 8880.00, 8560.00, 180.00, 270.00, 4200.00, 'processada'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-03-01', 420.00, 290.00, 9310.00, 9020.00, 168.00, 252.00, 4400.00, 'processada'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-04-01', 480.00, 350.00, 8550.00, 8200.00, 192.00, 288.00, 3900.00, 'pendente'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-02-01', 1200.00, 850.00, 16650.00, 15800.00, 480.00, 720.00, 8500.00, 'processada'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-03-01', 1100.00, 780.00, 17720.00, 16940.00, 440.00, 660.00, 9000.00, 'processada'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-04-01', 1350.00, 950.00, 16050.00, 15100.00, 540.00, 810.00, 7800.00, 'pendente');

-- ============================================================
-- Relatórios
-- ============================================================

INSERT INTO relatorios (uc_id, empresa_id, mes_referencia, titulo, geracao_kwh, geracao_estimada_kwh, economia_reais, indice_performance, status_envio, gerado_por) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-02-01', 'Relatório Mensal - Fevereiro 2026', 9200.00, 9500.00, 4200.00, 'bom', 'enviado', 'manual'),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-03-01', 'Relatório Mensal - Março 2026', 9600.00, 9500.00, 4400.00, 'bom', 'enviado', 'manual'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-02-01', 'Relatório Mensal - Fevereiro 2026', 17500.00, 18000.00, 8500.00, 'bom', 'enviado', 'manual'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-03-01', 'Relatório Mensal - Março 2026', 18500.00, 18000.00, 9000.00, 'bom', 'pendente', 'manual');

-- ============================================================
-- Tarifas
-- ============================================================

INSERT INTO tarifas (distribuidora, modalidade, posto_tarifario, valor_tusd, valor_te, valor_total, vigencia_inicio, ativa) VALUES
  ('CEMIG', 'convencional', 'unico', 0.435620, 0.312450, 0.748070, '2026-01-01', true),
  ('CEMIG', 'branca', 'ponta', 0.890340, 0.625000, 1.515340, '2026-01-01', true),
  ('CEMIG', 'branca', 'fora_ponta', 0.350120, 0.250000, 0.600120, '2026-01-01', true),
  ('CEMIG', 'branca', 'intermediario', 0.580230, 0.437500, 1.017730, '2026-01-01', true),
  ('Light', 'convencional', 'unico', 0.489750, 0.345620, 0.835370, '2026-01-01', true),
  ('Light', 'verde', 'ponta', 1.120450, 0.780000, 1.900450, '2026-01-01', true),
  ('Light', 'verde', 'fora_ponta', 0.120340, 0.095000, 0.215340, '2026-01-01', true),
  ('CPFL', 'convencional', 'unico', 0.410580, 0.298760, 0.709340, '2026-01-01', true);
