const router = require('express').Router();
const { requireSession } = require('../middleware/auth');
const notificacaoModel = require('../models/notificacao');

router.use(requireSession);

router.get('/', async (req, res) => {
  const notificacoes = await notificacaoModel.listarPorUsuario(req.session.usuario.id);
  res.render('notificacoes/lista', { notificacoes });
});

router.post('/marcar-todas-lidas', async (req, res) => {
  await notificacaoModel.marcarTodasLidas(req.session.usuario.id);
  res.redirect('/notificacoes');
});

// Abre a notificação: marca como lida e vai direto ao pedido que a originou
router.get('/:id/abrir', async (req, res) => {
  const notificacao = await notificacaoModel.findById(req.params.id, req.session.usuario.id);
  if (!notificacao) return res.redirect('/notificacoes');
  await notificacaoModel.marcarLida(notificacao.id, req.session.usuario.id);
  if (!notificacao.pedido_id) return res.redirect('/notificacoes');
  const ehOperador = req.session.usuario.perfil === 'admin' || req.session.usuario.perfil === 'operador';
  res.redirect(ehOperador ? `/admin/pedidos/${notificacao.pedido_id}` : `/pedidos/${notificacao.pedido_id}`);
});

router.post('/:id/lida', async (req, res) => {
  await notificacaoModel.marcarLida(req.params.id, req.session.usuario.id);
  res.redirect('/notificacoes');
});

module.exports = router;
