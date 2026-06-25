// grafica/app/src/server.js
require('dotenv').config();
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
  store: new PgStore({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET é obrigatório em produção'); return 'dev-secret-local'; })(),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 },
}));

// Disponibiliza usuario logado e contagem de notificações não-lidas em todas as views
const notificacaoModel = require('./models/notificacao');
app.use(async (req, res, next) => {
  res.locals.usuario = req.session?.usuario || null;
  res.locals.naoLidas = 0;
  if (req.session?.usuario) {
    try {
      res.locals.naoLidas = await notificacaoModel.contarNaoLidas(req.session.usuario.id);
    } catch (err) {
      console.error('Erro ao contar notificações:', err);
    }
  }
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
if (require.main === module) {
  app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
}

module.exports = app;
