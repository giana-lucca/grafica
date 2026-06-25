-- Permite inativar itens de um pedido (edição em pendência sem perder histórico)
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
