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

module.exports = { upsert, findById };
