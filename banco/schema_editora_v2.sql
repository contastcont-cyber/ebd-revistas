-- Adiciona código da editora nas revistas
ALTER TABLE revistas ADD COLUMN IF NOT EXISTS codigo_editora TEXT;

-- Configurações da editora (cabeçalho do pedido)
CREATE TABLE IF NOT EXISTS config_editora (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_cliente TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  codigo_local TEXT DEFAULT 'GYN',
  forma_envio TEXT DEFAULT 'TRANSPORTADORA',
  contato TEXT DEFAULT '',
  cond_pagamento TEXT DEFAULT 'BOLETO 3 X – 30 60 e 90',
  desconto_percentual NUMERIC(5,2) DEFAULT 50,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config_editora (nome_cliente) VALUES ('') ON CONFLICT DO NOTHING;

-- Adiciona campos de desconto ao pedido_editora existente
ALTER TABLE pedido_editora
  ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS valor_subtotal NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(12,2) DEFAULT 0;

-- Itens do pedido à editora
CREATE TABLE IF NOT EXISTS itens_pedido_editora (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_editora_id UUID REFERENCES pedido_editora(id) ON DELETE CASCADE,
  revista_id UUID REFERENCES revistas(id),
  codigo_editora TEXT,
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  valor_unitario_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario_custo) STORED
);

-- RLS
ALTER TABLE config_editora ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido_editora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_ler_config_editora" ON config_editora FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_escrever_config_editora" ON config_editora FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_ler_itens_ped_editora" ON itens_pedido_editora FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_escrever_itens_ped_editora" ON itens_pedido_editora FOR ALL TO authenticated USING (true);
