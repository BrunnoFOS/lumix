-- Lumix — Seed Data
-- Dados completos para validar todas as funcionalidades do cliente
--
-- Usuarios de teste:
--   Admin:   admin@lumix.com.br   / senha: admin123
--   Cliente:  carlos@solartech.com.br / senha: cliente123
--   Cliente2: roberto@energiaverde.com.br / senha: cliente123
--
-- NOTA: Os usuarios devem ser criados via Supabase Auth (Dashboard ou CLI).
--       O trigger handle_new_user cria o profile automaticamente.
--       Apos criar, rode os UPDATEs abaixo para vincular role e empresa.

-- ============================================================
-- Empresas
-- ============================================================

INSERT INTO empresas (id, nome, cnpj, tipo, endereco, cidade, estado, cep, telefone, email, responsavel) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Solar Tech Ltda', '12345678000190', 'matriz', 'Rua das Palmeiras, 100', 'Belo Horizonte', 'MG', '30130000', '(31) 99999-0001', 'contato@solartech.com.br', 'Carlos Silva'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Solar Tech Filial SP', '12345678000290', 'filial', 'Av. Paulista, 1000', 'Sao Paulo', 'SP', '01310100', '(11) 99999-0002', 'sp@solartech.com.br', 'Ana Costa'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Energia Verde S.A.', '98765432000110', 'matriz', 'Av. Brasil, 500', 'Rio de Janeiro', 'RJ', '20040020', '(21) 99999-0003', 'contato@energiaverde.com.br', 'Roberto Lima');

-- Vincular filial a matriz
UPDATE empresas SET matriz_id = 'a1b2c3d4-0001-4000-8000-000000000001'
WHERE id = 'a1b2c3d4-0002-4000-8000-000000000002';

-- ============================================================
-- Unidades Consumidoras (com dados completos de modulos)
-- ============================================================

INSERT INTO unidades_consumidoras (id, empresa_id, codigo_uc, titular, endereco, cidade, estado, distribuidora, grupo_tarifario, subgrupo, enquadramento_tarifario, modalidade_tarifaria, potencia_instalada_kwp, quantidade_modulos, modelo_modulos, potencia_modulo_w, quantidade_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, geracao_estimada_mensal_kwh, fator_rendimento, degradacao_ano_zero, degradacao_anos_seguintes) VALUES
  (
    'b1b2c3d4-0001-4000-8000-000000000001',
    'a1b2c3d4-0001-4000-8000-000000000001',
    'UC-MG-001', 'Solar Tech Ltda',
    'Rua das Palmeiras, 100', 'Belo Horizonte', 'MG',
    'CEMIG', 'grupo_b', 'B3', 'trifasico', 'convencional',
    75.00, 150, 'Canadian Solar CS6W-500MS', 500,
    3, 'Fronius Symo 25.0', 25.00,
    '2024-06-15', 9500.00, 0.8200, 0.0200, 0.0060
  ),
  (
    'b1b2c3d4-0002-4000-8000-000000000002',
    'a1b2c3d4-0001-4000-8000-000000000001',
    'UC-MG-002', 'Solar Tech Ltda',
    'Rua do Sol, 200', 'Belo Horizonte', 'MG',
    'CEMIG', 'grupo_b', 'B1', 'bifasico', 'convencional',
    12.00, 24, 'JA Solar JAM72S30-500', 500,
    1, 'Growatt MIN 10000TL-X', 10.00,
    '2025-01-10', 1500.00, 0.8000, 0.0200, 0.0060
  ),
  (
    'b1b2c3d4-0003-4000-8000-000000000003',
    'a1b2c3d4-0003-4000-8000-000000000003',
    'UC-RJ-001', 'Energia Verde S.A.',
    'Av. Brasil, 500', 'Rio de Janeiro', 'RJ',
    'Light', 'grupo_a', 'A4', 'trifasico', 'verde',
    150.00, 300, 'Trina Solar TSM-500DE18M(II)', 500,
    6, 'Huawei SUN2000-25KTL-M5', 25.00,
    '2023-11-20', 18000.00, 0.8500, 0.0200, 0.0060
  );

-- ============================================================
-- Usinas Cache (dados de monitoramento dos inversores)
-- ============================================================

INSERT INTO usinas_cache (station_id, provider, station_name, cidade_uf, potencia_instalada_kwp, qtd_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, inversores_detalhe, synced_at) VALUES
  (
    'SOLIS-ST-001', 'solis', 'Solar Tech BH - Matriz',
    'Belo Horizonte/MG', 75.00, 3,
    ARRAY['Fronius Symo 25.0'],
    25.00, '2024-06-15',
    '[
      {"id": "inv-001", "sn": "FR25-2024-00451", "model": "Fronius Symo 25.0", "product_model": "Symo 25.0-3-M", "power_kw": 25.0, "state": 1},
      {"id": "inv-002", "sn": "FR25-2024-00452", "model": "Fronius Symo 25.0", "product_model": "Symo 25.0-3-M", "power_kw": 25.0, "state": 1},
      {"id": "inv-003", "sn": "FR25-2024-00453", "model": "Fronius Symo 25.0", "product_model": "Symo 25.0-3-M", "power_kw": 25.0, "state": 2}
    ]'::jsonb,
    NOW() - INTERVAL '15 minutes'
  ),
  (
    'SOLIS-ST-002', 'solis', 'Solar Tech BH - Filial',
    'Belo Horizonte/MG', 12.00, 1,
    ARRAY['Growatt MIN 10000TL-X'],
    10.00, '2025-01-10',
    '[
      {"id": "inv-004", "sn": "GW10-2025-01120", "model": "Growatt MIN 10000TL-X", "product_model": "MIN 10000TL-X", "power_kw": 10.0, "state": 1}
    ]'::jsonb,
    NOW() - INTERVAL '10 minutes'
  ),
  (
    'SOLIS-EV-001', 'solis', 'Energia Verde RJ - Lote 1',
    'Rio de Janeiro/RJ', 75.00, 3,
    ARRAY['Huawei SUN2000-25KTL-M5'],
    25.00, '2023-11-20',
    '[
      {"id": "inv-005", "sn": "HW25-2023-07801", "model": "Huawei SUN2000-25KTL-M5", "product_model": "SUN2000-25KTL-M5", "power_kw": 25.0, "state": 1},
      {"id": "inv-006", "sn": "HW25-2023-07802", "model": "Huawei SUN2000-25KTL-M5", "product_model": "SUN2000-25KTL-M5", "power_kw": 25.0, "state": 3},
      {"id": "inv-007", "sn": "HW25-2023-07803", "model": "Huawei SUN2000-25KTL-M5", "product_model": "SUN2000-25KTL-M5", "power_kw": 25.0, "state": 1}
    ]'::jsonb,
    NOW() - INTERVAL '5 minutes'
  ),
  (
    'SUNGROW-EV-001', 'sungrow', 'Energia Verde RJ - Lote 2',
    'Rio de Janeiro/RJ', 75.00, 3,
    ARRAY['Huawei SUN2000-25KTL-M5'],
    25.00, '2023-11-20',
    '[
      {"id": "inv-008", "sn": "HW25-2023-07804", "model": "Huawei SUN2000-25KTL-M5", "product_model": "SUN2000-25KTL-M5", "power_kw": 25.0, "state": 1},
      {"id": "inv-009", "sn": "HW25-2023-07805", "model": "Huawei SUN2000-25KTL-M5", "product_model": "SUN2000-25KTL-M5", "power_kw": 25.0, "state": 1},
      {"id": "inv-010", "sn": "HW25-2023-07806", "model": "Huawei SUN2000-25KTL-M5", "product_model": "SUN2000-25KTL-M5", "power_kw": 25.0, "state": 1}
    ]'::jsonb,
    NOW() - INTERVAL '5 minutes'
  );

-- ============================================================
-- UC Stations (vinculacao UC <-> station monitoramento)
-- ============================================================

INSERT INTO uc_stations (uc_id, station_id, provider) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'SOLIS-ST-001', 'solis'),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'SOLIS-ST-002', 'solis'),
  -- UC-RJ-001 tem 2 providers (Solis + SunGrow)
  ('b1b2c3d4-0003-4000-8000-000000000003', 'SOLIS-EV-001', 'solis'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'SUNGROW-EV-001', 'sungrow');

-- ============================================================
-- Dados de Geracao (12 meses para gráfico completo)
-- ============================================================

INSERT INTO dados_geracao (uc_id, mes_referencia, geracao_kwh, geracao_estimada_kwh, irradiacao_media, performance_ratio, indice_performance) VALUES
  -- UC-MG-001 (Solar Tech - 75 kWp) — 12 meses
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-07-01',  7800.00,  9500.00, 4.20, 68.40, 'ruim'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-08-01',  8600.00,  9500.00, 4.80, 75.40, 'regular'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-09-01',  9100.00,  9500.00, 5.20, 79.80, 'regular'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-10-01', 10500.00,  9500.00, 6.00, 92.10, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-11-01', 10200.00,  9500.00, 5.80, 89.50, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2025-12-01',  9800.00,  9500.00, 5.60, 86.00, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-01-01',  8500.00,  9500.00, 4.90, 74.60, 'regular'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-02-01',  9200.00,  9500.00, 5.30, 80.70, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-03-01',  9600.00,  9500.00, 5.50, 84.20, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-04-01',  8900.00,  9500.00, 5.10, 78.10, 'regular'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-05-01',  9350.00,  9500.00, 5.40, 82.00, 'bom'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-06-01',  7600.00,  9500.00, 4.10, 66.70, 'ruim'),

  -- UC-MG-002 (Solar Tech - 12 kWp) — 12 meses
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-07-01',  1100.00,  1500.00, 4.20, 61.10, 'ruim'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-08-01',  1350.00,  1500.00, 4.80, 75.00, 'regular'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-09-01',  1420.00,  1500.00, 5.20, 78.90, 'regular'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-10-01',  1580.00,  1500.00, 6.00, 87.80, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-11-01',  1620.00,  1500.00, 5.80, 90.00, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2025-12-01',  1550.00,  1500.00, 5.60, 86.10, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-01-01',  1300.00,  1500.00, 4.90, 72.20, 'regular'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-02-01',  1450.00,  1500.00, 5.30, 80.60, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-03-01',  1480.00,  1500.00, 5.50, 82.20, 'bom'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-04-01',  1100.00,  1500.00, 4.50, 61.10, 'ruim'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-05-01',  1400.00,  1500.00, 5.10, 77.80, 'regular'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-06-01',  1050.00,  1500.00, 3.90, 58.30, 'ruim'),

  -- UC-RJ-001 (Energia Verde - 150 kWp) — 12 meses
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-07-01', 14500.00, 18000.00, 4.50, 67.10, 'ruim'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-08-01', 16800.00, 18000.00, 5.20, 77.80, 'regular'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-09-01', 17200.00, 18000.00, 5.50, 79.60, 'regular'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-10-01', 19800.00, 18000.00, 6.30, 91.70, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-11-01', 19500.00, 18000.00, 6.10, 90.30, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2025-12-01', 18200.00, 18000.00, 5.80, 84.30, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-01-01', 15000.00, 18000.00, 4.70, 69.40, 'ruim'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-02-01', 17500.00, 18000.00, 5.50, 81.00, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-03-01', 18500.00, 18000.00, 5.90, 85.60, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-04-01', 17000.00, 18000.00, 5.40, 78.70, 'regular'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-05-01', 18100.00, 18000.00, 5.80, 83.80, 'bom'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-06-01', 14200.00, 18000.00, 4.30, 65.70, 'ruim');

-- ============================================================
-- Faturas (6 meses por UC principal)
-- ============================================================

INSERT INTO faturas (uc_id, mes_referencia, valor_total, consumo_kwh, energia_injetada_kwh, creditos_energia_kwh, valor_tusd, valor_te, economia_estimada, status) VALUES
  -- UC-MG-001
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-01-01',  520.00, 380.00, 8120.00, 7740.00, 208.00, 312.00, 3600.00, 'processada'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-02-01',  450.00, 320.00, 8880.00, 8560.00, 180.00, 270.00, 4200.00, 'processada'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-03-01',  420.00, 290.00, 9310.00, 9020.00, 168.00, 252.00, 4400.00, 'processada'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-04-01',  480.00, 350.00, 8550.00, 8200.00, 192.00, 288.00, 3900.00, 'processada'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-05-01',  440.00, 310.00, 9040.00, 8730.00, 176.00, 264.00, 4100.00, 'processada'),
  ('b1b2c3d4-0001-4000-8000-000000000001', '2026-06-01',  560.00, 410.00, 7190.00, 6780.00, 224.00, 336.00, 3200.00, 'pendente'),

  -- UC-MG-002
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-03-01',  85.00,  60.00, 1420.00, 1360.00,  34.00,  51.00,  620.00, 'processada'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-04-01', 120.00,  95.00, 1005.00,  910.00,  48.00,  72.00,  410.00, 'processada'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-05-01',  90.00,  65.00, 1335.00, 1270.00,  36.00,  54.00,  580.00, 'processada'),
  ('b1b2c3d4-0002-4000-8000-000000000002', '2026-06-01', 140.00, 110.00,  940.00,  830.00,  56.00,  84.00,  350.00, 'pendente'),

  -- UC-RJ-001
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-01-01', 1500.00, 1050.00, 13950.00, 12900.00, 600.00, 900.00, 7200.00, 'processada'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-02-01', 1200.00,  850.00, 16650.00, 15800.00, 480.00, 720.00, 8500.00, 'processada'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-03-01', 1100.00,  780.00, 17720.00, 16940.00, 440.00, 660.00, 9000.00, 'processada'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-04-01', 1350.00,  950.00, 16050.00, 15100.00, 540.00, 810.00, 7800.00, 'processada'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-05-01', 1150.00,  820.00, 17280.00, 16460.00, 460.00, 690.00, 8800.00, 'processada'),
  ('b1b2c3d4-0003-4000-8000-000000000003', '2026-06-01', 1600.00, 1120.00, 13080.00, 11960.00, 640.00, 960.00, 6500.00, 'pendente');

-- ============================================================
-- Relatorios (com tipo_relatorio: real e estimado)
-- status_envio = 'enviado' para que o cliente veja
-- ============================================================

INSERT INTO relatorios (uc_id, empresa_id, mes_referencia, titulo, geracao_kwh, geracao_estimada_kwh, economia_reais, indice_performance, status_envio, gerado_por, tipo_relatorio) VALUES
  -- UC-MG-001 (Solar Tech) — relatorios enviados
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-01-01', 'Relatorio de Geracao - Janeiro 2026',   8500.00,  9500.00, 3600.00, 'regular', 'enviado', 'manual', 'estimado'),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-02-01', 'Relatorio de Fatura - Fevereiro 2026',  9200.00,  9500.00, 4200.00, 'bom',     'enviado', 'manual', 'real'),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-03-01', 'Relatorio de Geracao - Marco 2026',     9600.00,  9500.00, 4400.00, 'bom',     'enviado', 'manual', 'estimado'),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-04-01', 'Relatorio de Fatura - Abril 2026',      8900.00,  9500.00, 3900.00, 'regular', 'enviado', 'manual', 'real'),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-05-01', 'Relatorio de Geracao - Maio 2026',      9350.00,  9500.00, 4100.00, 'bom',     'enviado', 'manual', 'estimado'),

  -- UC-MG-002 (Solar Tech) — relatorios enviados
  ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-03-01', 'Relatorio de Geracao - Marco 2026',     1480.00,  1500.00,  620.00, 'bom',     'enviado', 'manual', 'estimado'),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-04-01', 'Relatorio de Fatura - Abril 2026',      1100.00,  1500.00,  410.00, 'ruim',    'enviado', 'manual', 'real'),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-05-01', 'Relatorio de Geracao - Maio 2026',      1400.00,  1500.00,  580.00, 'regular', 'enviado', 'manual', 'estimado'),

  -- UC-MG-001 — relatorio pendente (nao aparece para cliente)
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-06-01', 'Relatorio de Geracao - Junho 2026',     7600.00,  9500.00, 3200.00, 'ruim',    'pendente', 'manual', 'estimado'),

  -- UC-RJ-001 (Energia Verde) — relatorios enviados
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-01-01', 'Relatorio de Geracao - Janeiro 2026',  15000.00, 18000.00, 7200.00, 'ruim',    'enviado', 'manual', 'estimado'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-02-01', 'Relatorio de Fatura - Fevereiro 2026', 17500.00, 18000.00, 8500.00, 'bom',     'enviado', 'manual', 'real'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-03-01', 'Relatorio de Geracao - Marco 2026',    18500.00, 18000.00, 9000.00, 'bom',     'enviado', 'manual', 'estimado'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-04-01', 'Relatorio de Fatura - Abril 2026',     17000.00, 18000.00, 7800.00, 'regular', 'enviado', 'manual', 'real'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-05-01', 'Relatorio de Geracao - Maio 2026',     18100.00, 18000.00, 8800.00, 'bom',     'enviado', 'manual', 'estimado');

-- ============================================================
-- Tarifas (legadas — tabela antiga)
-- ============================================================

INSERT INTO tarifas (distribuidora, modalidade, posto_tarifario, valor_tusd, valor_te, valor_total, vigencia_inicio, ativa) VALUES
  ('CEMIG', 'convencional', 'unico', 0.435620, 0.312450, 0.748070, '2026-01-01', true),
  ('CEMIG', 'branca', 'ponta', 0.890340, 0.625000, 1.515340, '2026-01-01', true),
  ('CEMIG', 'branca', 'fora_ponta', 0.350120, 0.250000, 0.600120, '2026-01-01', true),
  ('Light', 'convencional', 'unico', 0.489750, 0.345620, 0.835370, '2026-01-01', true),
  ('Light', 'verde', 'ponta', 1.120450, 0.780000, 1.900450, '2026-01-01', true),
  ('Light', 'verde', 'fora_ponta', 0.120340, 0.095000, 0.215340, '2026-01-01', true);

-- ============================================================
-- Tarifas ANEEL (tabela nova)
-- ============================================================

INSERT INTO tarifas_aneel (sigla, subgrupo, modalidade, posto, tusd, te, vigencia_inicio) VALUES
  ('CEMIG', 'B3', NULL, 'Nao se aplica', 0.435620, 0.312450, '2026-01-01'),
  ('CEMIG', 'B1', NULL, 'Nao se aplica', 0.410580, 0.298760, '2026-01-01'),
  ('Light', 'A4', 'Verde', 'Ponta',       1.120450, 0.780000, '2026-01-01'),
  ('Light', 'A4', 'Verde', 'Fora ponta',  0.120340, 0.095000, '2026-01-01');

-- ============================================================
-- Impostos Concessionaria
-- ============================================================

INSERT INTO impostos_concessionaria (concessionaria_sigla, uf, icms_aliquota, pis_aliquota, cofins_aliquota, vigencia_inicio) VALUES
  ('CEMIG', 'MG', 0.18000, 0.01650, 0.07600, '2026-01-01'),
  ('Light', 'RJ', 0.18000, 0.01650, 0.07600, '2026-01-01');

-- ============================================================
-- INSTRUCOES PARA CRIAR USUARIOS DE TESTE
-- ============================================================
--
-- 1. No Supabase Dashboard > Authentication > Users, criar:
--
--    Email: admin@lumix.com.br
--    Senha: admin123
--    (Copiar o UUID gerado)
--
--    Email: carlos@solartech.com.br
--    Senha: cliente123
--    (Copiar o UUID gerado)
--
--    Email: roberto@energiaverde.com.br
--    Senha: cliente123
--    (Copiar o UUID gerado)
--
-- 2. O trigger handle_new_user cria profiles automaticamente.
--    Depois, rode estes UPDATEs substituindo os UUIDs:
--
--    UPDATE profiles SET role = 'admin', nome = 'Admin Lumix'
--    WHERE email = 'admin@lumix.com.br';
--
--    UPDATE profiles SET role = 'cliente', nome = 'Carlos Silva',
--           empresa_id = 'a1b2c3d4-0001-4000-8000-000000000001'
--    WHERE email = 'carlos@solartech.com.br';
--
--    UPDATE profiles SET role = 'cliente', nome = 'Roberto Lima',
--           empresa_id = 'a1b2c3d4-0003-4000-8000-000000000003'
--    WHERE email = 'roberto@energiaverde.com.br';
--
-- ============================================================
