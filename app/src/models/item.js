// grafica/app/src/models/item.js
const pool = require('../config/db');

async function criar({ pedido_id, catalogo_servico_id, tipo, papel, formato, quantidade, valor, opcoes }) {
  const { rows } = await pool.query(
    `INSERT INTO itens_pedido (pedido_id, catalogo_servico_id, tipo, papel, formato, quantidade, valor, opcoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [pedido_id, catalogo_servico_id, tipo, papel || null, formato || null, quantidade, valor, opcoes ? JSON.stringify(opcoes) : null]
  );
  return rows[0];
}

async function listarPorPedido(pedido_id) {
  const { rows } = await pool.query(
    `SELECT i.*, a.nome_original, a.caminho, a.id AS arquivo_id
     FROM itens_pedido i LEFT JOIN arquivos_item a ON a.item_id = i.id
     WHERE i.pedido_id = $1`,
    [pedido_id]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM itens_pedido WHERE id = $1', [id]);
  return rows[0] || null;
}

async function inativar(id) {
  await pool.query('UPDATE itens_pedido SET ativo = false WHERE id = $1', [id]);
}

async function deletar(id) {
  await pool.query('DELETE FROM itens_pedido WHERE id = $1', [id]);
}

module.exports = { criar, listarPorPedido, findById, inativar, deletar };
