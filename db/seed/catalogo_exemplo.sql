INSERT INTO catalogo_servicos (tipo, descricao, papel, formato, preco_unitario) VALUES
  ('laser_pb',    'Laser P&B A4 — Sulfite 75g',         'sulfite 75g',  'A4',  0.30),
  ('laser_pb',    'Laser P&B A3 — Sulfite 75g',         'sulfite 75g',  'A3',  0.55),
  ('laser_color', 'Laser Colorido A4 — Couché 90g',     'couché 90g',   'A4',  1.20),
  ('laser_color', 'Laser Colorido A3 — Couché 90g',     'couché 90g',   'A3',  2.20),
  ('offset',      'Offset 1 cor A4 — Couché 90g',       'couché 90g',   'A4',  0.80),
  ('banner',      'Banner — Lona 440g',                 'lona 440g',    NULL,  NULL),
  ('acabamento',  'Plastificação Brilho',               NULL,           NULL,  0.50),
  ('acabamento',  'Plastificação Fosco',                NULL,           NULL,  0.50),
  ('acabamento',  'Grampo',                             NULL,           NULL,  0.20),
  ('acabamento',  'Vinco',                              NULL,           NULL,  0.30),
  ('acabamento',  'Cola',                               NULL,           NULL,  0.25)
ON CONFLICT DO NOTHING;

-- Inserir usuário admin para testes locais
INSERT INTO usuarios (matricula, nome, email, perfil)
  VALUES ('admin001', 'Admin Gráfica', 'admin@ufsm.br', 'admin')
ON CONFLICT (matricula) DO NOTHING;
