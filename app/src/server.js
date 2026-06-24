// grafica/app/src/server.js
try { require('dotenv').config(); } catch (_) {}
const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const path = require('path');
const pool = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/govbr-ds', express.static(path.join(__dirname, '..', 'public', 'govbr-ds')));

app.use(session({
  store: new PgStore({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 },
}));

// Disponibiliza usuario logado em todas as views
app.use((req, res, next) => {
  res.locals.usuario = req.session?.usuario || null;
  next();
});

app.use('/', require('./routes/auth'));
app.use('/pedidos', require('./routes/pedidos'));
app.use('/notificacoes', require('./routes/notificacoes'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('erro', { mensagem: 'Erro interno.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));

module.exports = app;
