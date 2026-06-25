const pool = require('../config/db');

async function criar({ item_id, nome_original, nome_arquivo, caminho, mime_type, tamanho }) {
  const { rows } = await pool.query(
    `INSERT INTO arquivos_item (item_id, nome_original, nome_arquivo, caminho, mime_type, tamanho)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [item_id, nome_original, nome_arquivo, caminho, mime_type, tamanho]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM arquivos_item WHERE id=$1', [id]);
  return rows[0] || null;
}

async function findByItem(item_id) {
  const { rows } = await pool.query('SELECT * FROM arquivos_item WHERE item_id=$1', [item_id]);
  return rows[0] || null;
}

async function deletar(id) {
  await pool.query('DELETE FROM arquivos_item WHERE id=$1', [id]);
}

module.exports = { criar, findById, findByItem, deletar };
