// grafica/app/src/routes/auth.js
const router = require('express').Router();
const authService = require('../services/auth');
const usuarioModel = require('../models/usuario');

router.get('/', (req, res) => res.redirect('/pedidos'));

router.get('/login', (req, res) => {
  if (req.session?.usuario) return res.redirect('/pedidos');
  res.render('login', { erro: null });
});

router.post('/login', async (req, res) => {
  const { matricula, senha } = req.body;
  try {
    const dadosPortal = await authService.login(matricula, senha);
    const usuario = await usuarioModel.upsert(dadosPortal);
    req.session.usuario = { id: usuario.id, matricula: usuario.matricula, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
    res.redirect('/pedidos');
  } catch (err) {
    res.render('login', { erro: 'Matrícula ou senha inválidos.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
