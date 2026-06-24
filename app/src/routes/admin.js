const router = require('express').Router();
const { requireSession, requireOperador } = require('../middleware/auth');
const catalogo = require('../models/catalogo');
const arquivoModel = require('../models/arquivo');
const fs = require('fs');
const pedidoModel = require('../models/pedido');
const notificacaoModel = require('../models/notificacao');
const emailService = require('../services/email');
const pool = require('../config/db');

async function dispararNotificacoes(pedido, novoStatus, emailCliente) {
  const { rows: operadores } = await pool.query(
    "SELECT email FROM usuarios WHERE perfil IN ('operador','admin')"
  );

  if (novoStatus === 'aguardando_analise') {
    for (const op of operadores) {
      emailService.enviar({
        para: op.email,
        assunto: `[Gráfica UFSM] Novo pedido aguardando análise — ${pedido.numero}`,
        texto: `O pedido ${pedido.numero} (${pedido.titulo}) foi enviado pelo cliente e aguarda análise.\n\nAcesse: http://localhost:3000/admin/pedidos/${pedido.id}`,
      }).catch(e => console.error('Erro ao enviar e-mail:', e));
    }
  }

  if (novoStatus === 'em_producao') {
    await notificacaoModel.criar({
      usuario_id: pedido.usuario_id,
      pedido_id: pedido.id,
      titulo: 'Pedido em produção',
      mensagem: `Seu pedido ${pedido.numero} entrou em produção.`,
    });
  }

  if (novoStatus === 'pendencia') {
    await notificacaoModel.criar({
      usuario_id: pedido.usuario_id,
      pedido_id: pedido.id,
      titulo: 'Pendência no pedido',
      mensagem: `Seu pedido ${pedido.numero} tem uma pendência. Acesse o sistema para mais detalhes.`,
    });
    emailService.enviar({
      para: emailCliente,
      assunto: `[Gráfica UFSM] Pendência no pedido ${pedido.numero}`,
      texto: `Seu pedido ${pedido.numero} (${pedido.titulo}) tem uma pendência.\nAcesse o sistema: http://localhost:3000/pedidos/${pedido.id}`,
    }).catch(e => console.error('Erro ao enviar e-mail:', e));
  }

  if (novoStatus === 'pronto') {
    await notificacaoModel.criar({
      usuario_id: pedido.usuario_id,
      pedido_id: pedido.id,
      titulo: 'Pedido pronto para retirada',
      mensagem: `Seu pedido ${pedido.numero} está pronto para retirada na Gráfica UFSM.`,
    });
    emailService.enviar({
      para: emailCliente,
      assunto: `[Gráfica UFSM] Pedido ${pedido.numero} pronto`,
      texto: `Seu pedido ${pedido.numero} (${pedido.titulo}) está pronto para retirada na Gráfica UFSM.`,
    }).catch(e => console.error('Erro ao enviar e-mail:', e));
  }
}

const TRANSICOES = {
  aguardando_analise: ['em_producao', 'pendencia', 'cancelado'],
  pendencia:          ['em_producao', 'cancelado'],
  em_producao:        ['pronto', 'pendencia'],
  pronto:             ['retirado'],
};

router.use(requireSession, requireOperador);

// Catálogo
router.get('/catalogo', async (req, res) => {
  const itens = await catalogo.listar();
  res.render('admin/catalogo', { itens });
});

router.get('/catalogo/novo', (req, res) => {
  res.render('admin/catalogo-form', { item: null, erro: null });
});

router.post('/catalogo', async (req, res) => {
  try {
    await catalogo.criar(req.body);
    res.redirect('/admin/catalogo');
  } catch (err) {
    res.render('admin/catalogo-form', { item: null, erro: err.message });
  }
});

router.get('/catalogo/:id/editar', async (req, res) => {
  const item = await catalogo.findById(req.params.id);
  if (!item) return res.status(404).render('erro', { mensagem: 'Item não encontrado.' });
  res.render('admin/catalogo-form', { item, erro: null });
});

router.post('/catalogo/:id', async (req, res) => {
  await catalogo.atualizar(req.params.id, req.body);
  res.redirect('/admin/catalogo');
});

router.post('/catalogo/:id/suspender', async (req, res) => {
  await catalogo.suspender(req.params.id, req.body);
  res.redirect('/admin/catalogo');
});

router.post('/catalogo/:id/reativar', async (req, res) => {
  await catalogo.reativar(req.params.id);
  res.redirect('/admin/catalogo');
});

router.get('/pedidos', async (req, res) => {
  const { status } = req.query;
  const pedidos = await pedidoModel.listarTodos(status ? { status } : {});
  res.render('admin/pedidos', { pedidos, statusFiltro: status || 'todos' });
});

router.get('/pedidos/:id', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido) return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  const acoesPermitidas = TRANSICOES[pedido.status] || [];
  res.render('admin/pedido-detalhe', { pedido, acoesPermitidas });
});

router.post('/pedidos/:id/status', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido) return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });

  const { status, comentario, prazo_entrega } = req.body;
  const permitidos = TRANSICOES[pedido.status] || [];
  if (!permitidos.includes(status)) {
    return res.status(400).render('erro', { mensagem: 'Transição de status inválida.' });
  }
  if (status === 'pendencia' && !comentario) {
    return res.status(400).render('erro', { mensagem: 'Comentário obrigatório em pendências.' });
  }

  const pedidoAtualizado = await pedidoModel.atualizarStatus(pedido.id, {
    status,
    usuario_id: req.session.usuario.id,
    comentario: comentario || null,
    prazo_entrega: prazo_entrega || null,
  });

  await dispararNotificacoes(pedidoAtualizado, status, pedido.email_usuario);
  res.redirect(`/admin/pedidos/${pedido.id}`);
});

router.get('/pedidos/:id/itens/:itemId/arquivo/:arquivoId', async (req, res) => {
  try {
    const arquivo = await arquivoModel.findById(req.params.arquivoId);
    if (!arquivo) return res.status(404).render('erro', { mensagem: 'Arquivo não encontrado.' });
    res.download(arquivo.caminho, arquivo.nome_original);
  } catch (err) {
    res.status(500).render('erro', { mensagem: err.message });
  }
});

module.exports = router;
