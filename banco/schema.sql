-- =====================================================
-- SISTEMA EBD - CONTROLE DE REVISTAS
-- Departamento de Missões - Assembleia de Deus Campinas
-- =====================================================

-- PERFIS DE ACESSO
CREATE TABLE perfis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  modulos_liberados JSONB DEFAULT '[]',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- USUÁRIOS
CREATE TABLE usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  perfil_id UUID REFERENCES perfis(id),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- LOG DE ACESSOS
CREATE TABLE log_acessos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  modulo TEXT,
  detalhes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- IGREJAS
CREATE TABLE igrejas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo INTEGER UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  responsavel TEXT,
  telefone TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- TIPOS DE REVISTA (cadastrável pelo usuário)
CREATE TABLE tipos_revista (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

-- REVISTAS
CREATE TABLE revistas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  tipo_id UUID REFERENCES tipos_revista(id),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- TRIMESTRES
CREATE TABLE trimestres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  numero INTEGER NOT NULL CHECK (numero BETWEEN 1 AND 4),
  periodo_descricao TEXT,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ano, numero)
);

-- PREÇOS DAS REVISTAS POR TRIMESTRE
CREATE TABLE precos_revistas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  revista_id UUID REFERENCES revistas(id),
  trimestre_id UUID REFERENCES trimestres(id),
  preco_unitario NUMERIC(10,2) NOT NULL,
  UNIQUE (revista_id, trimestre_id)
);

-- PEDIDOS DAS IGREJAS
CREATE TABLE pedidos_igrejas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  igreja_id UUID REFERENCES igrejas(id),
  trimestre_id UUID REFERENCES trimestres(id),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'retirado', 'cancelado')),
  valor_total NUMERIC(10,2) DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (igreja_id, trimestre_id)
);

-- ITENS DO PEDIDO (revistas e quantidades)
CREATE TABLE itens_pedido (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos_igrejas(id) ON DELETE CASCADE,
  revista_id UUID REFERENCES revistas(id),
  quantidade INTEGER NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED
);

-- PARCELAS DAS IGREJAS (padrão 2, mas aceita 1 = pagamento integral)
CREATE TABLE parcelas_igrejas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos_igrejas(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL CHECK (numero_parcela BETWEEN 1 AND 2),
  valor NUMERIC(10,2) NOT NULL,
  vencimento DATE,
  pago BOOLEAN DEFAULT FALSE,
  data_pagamento DATE,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', NULL)),
  observacao TEXT
);

-- ENTREGAS (retirada das revistas pela igreja)
CREATE TABLE entregas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos_igrejas(id),
  data_retirada DATE NOT NULL,
  responsavel_retirada TEXT,
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- PEDIDO À EDITORA (consolidado por trimestre)
CREATE TABLE pedido_editora (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trimestre_id UUID REFERENCES trimestres(id) UNIQUE,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- PARCELAS À EDITORA
CREATE TABLE parcelas_editora (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_editora_id UUID REFERENCES pedido_editora(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  vencimento DATE,
  pago BOOLEAN DEFAULT FALSE,
  data_pagamento DATE
);

-- CONFIGURAÇÕES DO CARNÊ
CREATE TABLE config_carne (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url TEXT,
  nome_departamento TEXT DEFAULT 'Departamento de Missões',
  pix_celular TEXT,
  pix_email TEXT,
  telefone TEXT,
  vencimento_padrao_p1 DATE,
  vencimento_padrao_p2 DATE,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Perfil administrador
INSERT INTO perfis (nome, descricao, modulos_liberados) VALUES
  ('Administrador', 'Acesso total ao sistema', '["seguranca","cadastros","trimestres","pedidos","entregas","financeiro","carne","relatorios","configuracoes"]'),
  ('Atendente', 'Pedidos, entregas e financeiro', '["pedidos","entregas","financeiro"]'),
  ('Cadastro', 'Apenas cadastros de igrejas e revistas', '["cadastros"]');

-- Tipos de revista iniciais
INSERT INTO tipos_revista (codigo, descricao) VALUES
  ('A', 'Adulto'),
  ('P', 'Professor'),
  ('J', 'Jovem'),
  ('I', 'Infantil'),
  ('B', 'Berçário');

-- Configuração do carnê (registro inicial vazio)
INSERT INTO config_carne (nome_departamento) VALUES ('Departamento de Missões');

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_revista ENABLE ROW LEVEL SECURITY;
ALTER TABLE revistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE trimestres ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_revistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_editora ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_editora ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_carne ENABLE ROW LEVEL SECURITY;

-- Política: apenas usuários autenticados acessam os dados
CREATE POLICY "Autenticados podem ler" ON perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON igrejas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON tipos_revista FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON revistas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON trimestres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON precos_revistas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON pedidos_igrejas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON itens_pedido FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON parcelas_igrejas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON entregas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON pedido_editora FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON parcelas_editora FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem ler" ON config_carne FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem escrever" ON igrejas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON tipos_revista FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON revistas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON trimestres FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON precos_revistas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON pedidos_igrejas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON itens_pedido FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON parcelas_igrejas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON entregas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON pedido_editora FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON parcelas_editora FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON config_carne FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON log_acessos FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON usuarios FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados podem escrever" ON perfis FOR ALL TO authenticated USING (true);
