// grafica/app/src/models/usuario.js
const pool = require('../config/db');

async function upsert({ matricula, nome, email, perfil }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (matricula, nome, email, perfil)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (matricula) DO UPDATE
       SET nome = EXCLUDED.nome, email = EXCLUDED.email, updated_at = NOW()
     RETURNING *`,
    [matricula, nome, email, perfil]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
  return rows[0] || null;
}

// Login: aceita CPF ou matrícula (SIAPE) no mesmo campo
async function buscarPorLogin(identificador) {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE cpf = $1 OR matricula = $1',
    [identificador]
  );
  return rows[0] || null;
}

// Busca cliente por CPF ou matrícula (SIAPE)
async function buscarPorIdentificador({ cpf, matricula }) {
  if (cpf) {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE cpf = $1', [cpf]);
    return rows[0] || null;
  }
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE matricula = $1', [matricula]);
  return rows[0] || null;
}

// Cria um cliente (atendimento de balcão, enquanto o web service do portal não está ativo)
async function criarCliente({ cpf, matricula, nome, email }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (matricula, cpf, nome, email, perfil)
     VALUES ($1, $2, $3, $4, 'cliente') RETURNING *`,
    [matricula || null, cpf || null, nome, email]
  );
  return rows[0];
}

module.exports = { upsert, findById, buscarPorLogin, buscarPorIdentificador, criarCliente };
