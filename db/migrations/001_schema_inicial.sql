CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE usuarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula  VARCHAR UNIQUE,
  cpf        VARCHAR,
  nome       VARCHAR NOT NULL,
  email      VARCHAR NOT NULL,
  perfil     VARCHAR NOT NULL CHECK (perfil IN ('cliente','operador','admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX usuarios_cpf_uniq ON usuarios (cpf) WHERE cpf IS NOT NULL;

CREATE TABLE catalogo_servicos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           VARCHAR NOT NULL CHECK (tipo IN ('laser_pb','laser_color','offset','banner','acabamento')),
  descricao      VARCHAR NOT NULL,
  papel          VARCHAR,
  formato        VARCHAR,
  preco_unitario DECIMAL(10,2),
  preco_m2       DECIMAL(10,2),
  ativo          BOOLEAN DEFAULT true,
  motivo_inativo TEXT,
  inativo_ate    DATE,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE pedido_seq;

CREATE TABLE pedidos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero               VARCHAR UNIQUE NOT NULL,
  usuario_id           UUID NOT NULL REFERENCES usuarios(id),
  status               VARCHAR NOT NULL DEFAULT 'rascunho'
                       CHECK (status IN ('rascunho','aguardando_analise','em_producao',
                                         'pendencia','pronto','retirado','cancelado')),
  titulo               VARCHAR NOT NULL,
  numero_transferencia VARCHAR,
  observacao_cliente   TEXT,
  valor_total          DECIMAL(10,2),
  prazo_entrega        DATE,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE itens_pedido (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  catalogo_servico_id UUID REFERENCES catalogo_servicos(id),
  tipo                VARCHAR NOT NULL,
  papel               VARCHAR,
  formato             VARCHAR,
  quantidade          INTEGER NOT NULL,
  valor               DECIMAL(10,2) NOT NULL,
  opcoes              JSONB,
  ativo               BOOLEAN DEFAULT true
);

CREATE TABLE acabamento (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id     UUID UNIQUE NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  plastificacao VARCHAR CHECK (plastificacao IN ('brilho','fosco')),
  grampo        BOOLEAN DEFAULT false,
  vinco         BOOLEAN DEFAULT false,
  cola          BOOLEAN DEFAULT false,
  valor         DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE historico_pedido (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID NOT NULL REFERENCES pedidos(id),
  status_anterior VARCHAR,
  status_novo     VARCHAR NOT NULL,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  comentario      TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE arquivos_item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES itens_pedido(id) ON DELETE CASCADE,
  nome_original VARCHAR NOT NULL,
  nome_arquivo  VARCHAR NOT NULL,
  caminho       VARCHAR NOT NULL,
  mime_type     VARCHAR NOT NULL,
  tamanho       INTEGER NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notificacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  pedido_id  UUID REFERENCES pedidos(id),
  titulo     VARCHAR NOT NULL,
  mensagem   TEXT NOT NULL,
  lida       BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Função para gerar número do pedido no formato AAAA-NNNN
CREATE OR REPLACE FUNCTION gerar_numero_pedido() RETURNS VARCHAR AS $$
DECLARE
  ano   TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq   BIGINT;
BEGIN
  seq := nextval('pedido_seq');
  RETURN ano || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
