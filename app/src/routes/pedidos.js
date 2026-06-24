const router = require('express').Router();
const { requireSession } = require('../middleware/auth');
const pedidoModel = require('../models/pedido');
const itemModel = require('../models/item');
const acabamentoModel = require('../models/acabamento');

router.use(requireSession);

router.get('/', async (req, res) => {
  const pedidos = await pedidoModel.listarPorUsuario(req.session.usuario.id);
  res.render('pedidos/lista', { pedidos });
});

router.get('/novo', (req, res) => {
  res.render('pedidos/novo', { erro: null });
});

// Salva rascunho com itens e acabamento recebidos do wizard (JSON no body)
router.post('/', async (req, res) => {
  const { titulo, observacao_cliente, itens, acabamento } = req.body;

  if (!titulo?.trim()) {
    return res.render('pedidos/novo', { erro: 'Título do pedido é obrigatório.' });
  }

  try {
    const pedido = await pedidoModel.criar({
      usuario_id: req.session.usuario.id,
      titulo,
      observacao_cliente,
    });

    // itens é array serializado como JSON string pelo formulário
    const listaItens = typeof itens === 'string' ? JSON.parse(itens) : (itens || []);
    for (const item of listaItens) {
      await itemModel.criar({ pedido_id: pedido.id, ...item });
    }

    if (acabamento) {
      const acab = typeof acabamento === 'string' ? JSON.parse(acabamento) : acabamento;
      await acabamentoModel.salvar({ pedido_id: pedido.id, ...acab });
    }

    res.redirect(`/pedidos/${pedido.id}`);
  } catch (err) {
    res.render('pedidos/novo', { erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  res.render('pedidos/detalhe', { pedido });
});

router.post('/:id/confirmar', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  const todosComArquivo = pedido.itens.every(i => i.arquivo_id);
  if (!todosComArquivo) {
    return res.render('pedidos/detalhe', { pedido, erro: 'Todos os itens precisam de arquivo de arte.' });
  }
  const { numero_transferencia } = req.body;
  if (!numero_transferencia?.trim()) {
    return res.render('pedidos/detalhe', { pedido, erro: 'Número de transferência é obrigatório.' });
  }
  await pedidoModel.atualizarStatus(pedido.id, {
    status: 'aguardando_analise',
    usuario_id: req.session.usuario.id,
    numero_transferencia,
    valor_total: pedido.itens.reduce((acc, i) => acc + Number(i.valor), 0),
  });
  res.redirect(`/pedidos/${pedido.id}`);
});

router.post('/:id/responder', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  await pedidoModel.atualizarStatus(pedido.id, {
    status: 'aguardando_analise',
    usuario_id: req.session.usuario.id,
    comentario: req.body.comentario,
  });
  res.redirect(`/pedidos/${pedido.id}`);
});

module.exports = router;
