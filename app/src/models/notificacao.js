const pool = require('../config/db');

async function criar({ usuario_id, pedido_id, titulo, mensagem }) {
  const { rows } = await pool.query(
    `INSERT INTO notificacoes (usuario_id, pedido_id, titulo, mensagem)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [usuario_id, pedido_id || null, titulo, mensagem]
  );
  return rows[0];
}

async function listarPorUsuario(usuario_id) {
  const { rows } = await pool.query(
    'SELECT * FROM notificacoes WHERE usuario_id=$1 ORDER BY created_at DESC',
    [usuario_id]
  );
  return rows;
}

async function findById(id, usuario_id) {
  const { rows } = await pool.query(
    'SELECT * FROM notificacoes WHERE id = $1 AND usuario_id = $2',
    [id, usuario_id]
  );
  return rows[0] || null;
}

async function marcarLida(id, usuario_id) {
  await pool.query(
    'UPDATE notificacoes SET lida=true WHERE id=$1 AND usuario_id=$2',
    [id, usuario_id]
  );
}

async function marcarTodasLidas(usuario_id) {
  await pool.query(
    'UPDATE notificacoes SET lida=true WHERE usuario_id=$1 AND lida=false',
    [usuario_id]
  );
}

async function contarNaoLidas(usuario_id) {
  const { rows } = await pool.query(
    'SELECT COUNT(*) FROM notificacoes WHERE usuario_id=$1 AND lida=false',
    [usuario_id]
  );
  return parseInt(rows[0].count);
}

module.exports = { criar, listarPorUsuario, findById, marcarLida, marcarTodasLidas, contarNaoLidas };
