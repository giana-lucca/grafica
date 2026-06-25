const pool = require('../config/db');

async function listar() {
  const { rows } = await pool.query('SELECT * FROM catalogo_servicos ORDER BY tipo, descricao');
  return rows;
}

async function listarAtivos() {
  const { rows } = await pool.query(
    'SELECT * FROM catalogo_servicos WHERE ativo = true ORDER BY tipo, descricao'
  );
  return rows;
}

async function criar(dados) {
  const { tipo, descricao, papel, formato, preco_unitario, preco_m2 } = dados;
  const { rows } = await pool.query(
    `INSERT INTO catalogo_servicos (tipo, descricao, papel, formato, preco_unitario, preco_m2)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [tipo, descricao, papel || null, formato || null, preco_unitario || null, preco_m2 || null]
  );
  return rows[0];
}

async function atualizar(id, dados) {
  const { tipo, descricao, papel, formato, preco_unitario, preco_m2 } = dados;
  const { rows } = await pool.query(
    `UPDATE catalogo_servicos
     SET tipo=$1, descricao=$2, papel=$3, formato=$4, preco_unitario=$5, preco_m2=$6, updated_at=NOW()
     WHERE id=$7 RETURNING *`,
    [tipo, descricao, papel || null, formato || null, preco_unitario || null, preco_m2 || null, id]
  );
  return rows[0];
}

async function suspender(id, { motivo, inativo_ate }) {
  const { rows } = await pool.query(
    `UPDATE catalogo_servicos SET ativo=false, motivo_inativo=$1, inativo_ate=$2, updated_at=NOW()
     WHERE id=$3 RETURNING *`,
    [motivo, inativo_ate || null, id]
  );
  return rows[0];
}

async function reativar(id) {
  const { rows } = await pool.query(
    `UPDATE catalogo_servicos
     SET ativo=true, motivo_inativo=NULL, inativo_ate=NULL, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [id]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM catalogo_servicos WHERE id=$1', [id]);
  return rows[0] || null;
}

module.exports = { listar, listarAtivos, criar, atualizar, suspender, reativar, findById };
