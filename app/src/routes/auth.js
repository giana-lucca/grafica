// grafica/app/src/routes/auth.js
const router = require('express').Router();
const authService = require('../services/auth');
const usuarioModel = require('../models/usuario');

// Destino após login conforme o perfil
function destinoPorPerfil(perfil) {
  return (perfil === 'admin' || perfil === 'operador') ? '/admin/pedidos' : '/pedidos';
}

router.get('/', (req, res) => res.redirect(destinoPorPerfil(req.session?.usuario?.perfil)));

router.get('/login', (req, res) => {
  if (req.session?.usuario) return res.redirect(destinoPorPerfil(req.session.usuario.perfil));
  res.render('login', { erro: null });
});

router.post('/login', async (req, res) => {
  const { identificador } = req.body;
  try {
    // TODO: quando o web service do portal estiver ativo, validar senha por ele.
    // Por enquanto, busca o usuário localmente por CPF ou SIAPE/matrícula.
    const usuario = await usuarioModel.buscarPorLogin((identificador || '').trim());
    if (!usuario) throw new Error('não encontrado');
    req.session.usuario = { id: usuario.id, matricula: usuario.matricula, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
    res.redirect(destinoPorPerfil(usuario.perfil));
  } catch (err) {
    res.render('login', { erro: 'CPF ou SIAPE não encontrado.' });
  }
});

router.post('/login-teste-admin', async (req, res) => {
  const usuarioTeste = {
    matricula: '000000001',
    nome: 'Admin de Teste',
    email: 'admin-teste@ufsm.br',
    perfil: 'admin',
  };
  try {
    const usuario = await usuarioModel.upsert(usuarioTeste);
    req.session.usuario = { id: usuario.id, matricula: usuario.matricula, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
    res.redirect(destinoPorPerfil(usuario.perfil));
  } catch (err) {
    res.render('login', { erro: 'Erro ao entrar como admin de teste.' });
  }
});

router.post('/login-teste', async (req, res) => {
  const usuarioTeste = {
    matricula: '000000000',
    nome: 'Usuário de Teste',
    email: 'teste@ufsm.br',
    perfil: 'cliente',
  };
  try {
    const usuario = await usuarioModel.upsert(usuarioTeste);
    req.session.usuario = { id: usuario.id, matricula: usuario.matricula, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
    res.redirect(destinoPorPerfil(usuario.perfil));
  } catch (err) {
    res.render('login', { erro: 'Erro ao entrar como usuário de teste.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
