// grafica/app/src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Erro no pool PostgreSQL:', err);
  process.exit(1);
});

module.exports = pool;
