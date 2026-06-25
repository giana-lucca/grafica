// grafica/app/src/models/acabamento.js
const pool = require('../config/db');

async function salvar({ pedido_id, plastificacao, grampo, vinco, cola, valor }) {
  const { rows } = await pool.query(
    `INSERT INTO acabamento (pedido_id, plastificacao, grampo, vinco, cola, valor)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (pedido_id) DO UPDATE
       SET plastificacao=EXCLUDED.plastificacao, grampo=EXCLUDED.grampo,
           vinco=EXCLUDED.vinco, cola=EXCLUDED.cola, valor=EXCLUDED.valor
     RETURNING *`,
    [pedido_id, plastificacao || null, !!grampo, !!vinco, !!cola, valor || 0]
  );
  return rows[0];
}

module.exports = { salvar };
