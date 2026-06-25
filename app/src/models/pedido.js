// grafica/app/src/models/pedido.js
const pool = require('../config/db');

async function criar({ usuario_id, titulo, observacao_cliente }) {
  const numero = await pool.query('SELECT gerar_numero_pedido() AS numero');
  const { rows } = await pool.query(
    `INSERT INTO pedidos (numero, usuario_id, titulo, observacao_cliente)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [numero.rows[0].numero, usuario_id, titulo, observacao_cliente || null]
  );
  return rows[0];
}

async function listarPorUsuario(usuario_id, { status } = {}) {
  const params = [usuario_id];
  let where = 'WHERE usuario_id = $1';
  if (status) { params.push(status); where += ' AND status = $2'; }
  const { rows } = await pool.query(
    `SELECT * FROM pedidos ${where} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

async function listarTodos({ status } = {}) {
  const params = [];
  let where = '';
  if (status) { params.push(status); where = 'WHERE status = $1'; }
  const { rows } = await pool.query(
    `SELECT p.*, u.nome AS nome_usuario, u.email AS email_usuario
     FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id
     ${where} ORDER BY p.updated_at DESC`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT p.*, u.nome AS nome_usuario, u.email AS email_usuario
     FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const pedido = rows[0];

  const itens = await pool.query(
    `SELECT i.*, a.nome_original, a.caminho, a.id AS arquivo_id
     FROM itens_pedido i
     LEFT JOIN arquivos_item a ON a.item_id = i.id
     WHERE i.pedido_id = $1`,
    [id]
  );
  pedido.itens = itens.rows;

  const acab = await pool.query('SELECT * FROM acabamento WHERE pedido_id = $1', [id]);
  pedido.acabamento = acab.rows[0] || null;

  const hist = await pool.query(
    `SELECT h.*, u.nome AS nome_usuario
     FROM historico_pedido h JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.pedido_id = $1 ORDER BY h.created_at`,
    [id]
  );
  pedido.historico = hist.rows;

  return pedido;
}

async function atualizarStatus(id, { status, usuario_id, comentario, prazo_entrega, numero_transferencia, valor_total }) {
  const atual = await pool.query('SELECT status FROM pedidos WHERE id = $1', [id]);
  const statusAnterior = atual.rows[0]?.status;

  const campos = ['status = $1', 'updated_at = NOW()'];
  const vals = [status];
  let idx = 2;

  if (prazo_entrega !== undefined) { campos.push(`prazo_entrega = $${idx++}`); vals.push(prazo_entrega); }
  if (numero_transferencia !== undefined) { campos.push(`numero_transferencia = $${idx++}`); vals.push(numero_transferencia); }
  if (valor_total !== undefined) { campos.push(`valor_total = $${idx++}`); vals.push(valor_total); }

  vals.push(id);
  await pool.query(`UPDATE pedidos SET ${campos.join(', ')} WHERE id = $${idx}`, vals);

  await pool.query(
    `INSERT INTO historico_pedido (pedido_id, status_anterior, status_novo, usuario_id, comentario)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, statusAnterior, status, usuario_id, comentario || null]
  );

  return findById(id);
}

module.exports = { criar, listarPorUsuario, listarTodos, findById, atualizarStatus };
