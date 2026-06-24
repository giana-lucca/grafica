const router = require('express').Router();
const { requireSession } = require('../middleware/auth');
const notificacaoModel = require('../models/notificacao');

router.use(requireSession);

router.get('/', async (req, res) => {
  const notificacoes = await notificacaoModel.listarPorUsuario(req.session.usuario.id);
  res.render('notificacoes/lista', { notificacoes });
});

router.post('/:id/lida', async (req, res) => {
  await notificacaoModel.marcarLida(req.params.id, req.session.usuario.id);
  res.redirect('/notificacoes');
});

module.exports = router;
