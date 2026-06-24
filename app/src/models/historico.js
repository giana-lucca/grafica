// grafica/app/src/models/historico.js
const pool = require('../config/db');

async function listarPorPedido(pedido_id) {
  const { rows } = await pool.query(
    `SELECT h.*, u.nome AS nome_usuario
     FROM historico_pedido h JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.pedido_id = $1 ORDER BY h.created_at`,
    [pedido_id]
  );
  return rows;
}

module.exports = { listarPorPedido };
