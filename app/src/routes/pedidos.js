const router = require('express').Router();
const { requireSession } = require('../middleware/auth');
const pedidoModel = require('../models/pedido');
const emailService = require('../services/email');
const pool = require('../config/db');

async function notificarOperadoresEmail(pedido) {
  const { rows: operadores } = await pool.query(
    "SELECT email FROM usuarios WHERE perfil IN ('operador','admin')"
  );
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  for (const op of operadores) {
    emailService.enviar({
      para: op.email,
      assunto: `[Gráfica UFSM] Novo pedido aguardando análise — ${pedido.numero}`,
      texto: `O pedido ${pedido.numero} (${pedido.titulo}) foi enviado pelo cliente e aguarda análise.\n\nAcesse: ${baseUrl}/admin/pedidos/${pedido.id}`,
    }).catch(e => console.error('Erro ao enviar e-mail:', e));
  }
}
const itemModel = require('../models/item');
const acabamentoModel = require('../models/acabamento');
const catalogoModel = require('../models/catalogo');
const precoService = require('../services/preco');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const arquivoModel = require('../models/arquivo');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dir = path.join(process.env.UPLOAD_DIR || '/app/uploads',
      String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extsAceitos = ['.pdf', '.png', '.jpg', '.jpeg', '.ai', '.cdr'];
    if (extsAceitos.includes(ext)) return cb(null, true);
    cb(new Error('Formato não permitido. Use PDF, PNG, JPG, AI ou CDR.'));
  },
});

router.use(requireSession);

router.get('/', async (req, res) => {
  const { status } = req.query;
  const pedidos = await pedidoModel.listarPorUsuario(req.session.usuario.id, status ? { status } : {});
  res.render('pedidos/lista', { pedidos, statusFiltro: status || 'todos' });
});

router.get('/novo', (req, res) => {
  res.render('pedidos/novo', { erro: null });
});

// Salva rascunho com itens e acabamento recebidos do wizard (JSON no body)
router.post('/', async (req, res) => {
  const { titulo, observacao_cliente, itens, acabamento, cliente_id } = req.body;

  if (!titulo?.trim()) {
    return res.render('pedidos/novo', { erro: 'Título do pedido é obrigatório.' });
  }

  // Admin/operador cria o pedido em nome do cliente identificado; cliente cria para si.
  const ehOperador = req.session.usuario.perfil === 'admin' || req.session.usuario.perfil === 'operador';
  if (ehOperador && !cliente_id) {
    return res.render('pedidos/novo', { erro: 'Identifique o cliente (CPF ou SIAPE) antes de salvar.' });
  }
  const usuario_id = ehOperador ? cliente_id : req.session.usuario.id;

  try {
    const pedido = await pedidoModel.criar({
      usuario_id,
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

    const destino = ehOperador ? `/admin/pedidos/${pedido.id}?criado=1` : `/pedidos/${pedido.id}?criado=1`;
    res.redirect(destino);
  } catch (err) {
    res.render('pedidos/novo', { erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  const catalogo = await catalogoModel.listarAtivos();
  res.render('pedidos/detalhe', { pedido, erro: null, catalogo });
});

// Adiciona um item a um pedido existente (rascunho ou em pendência)
router.post('/:id/itens', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  if (!['rascunho', 'pendencia'].includes(pedido.status)) {
    return res.status(400).render('erro', { mensagem: 'Este pedido não pode ser editado.' });
  }
  try {
    const { catalogo_servico_id, quantidade, largura, altura } = req.body;
    const qtd = parseInt(quantidade);
    if (!Number.isInteger(qtd) || qtd <= 0) throw new Error('Quantidade inválida.');
    const servico = await catalogoModel.findById(catalogo_servico_id);
    if (!servico) throw new Error('Serviço não encontrado.');
    const opcoes = servico.tipo === 'banner'
      ? { largura: parseFloat(largura), altura: parseFloat(altura) } : {};
    const valor = await precoService.calcular({ catalogo_servico_id, quantidade: qtd, opcoes });
    await itemModel.criar({
      pedido_id: pedido.id, catalogo_servico_id, tipo: servico.tipo,
      papel: servico.papel, formato: servico.formato, quantidade: qtd, valor, opcoes,
    });
    res.redirect(`/pedidos/${pedido.id}`);
  } catch (err) {
    const catalogo = await catalogoModel.listarAtivos();
    res.render('pedidos/detalhe', { pedido, erro: err.message, catalogo });
  }
});

// Inativa um item (mantém no histórico)
router.post('/:id/itens/:itemId/inativar', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  if (!['rascunho', 'pendencia'].includes(pedido.status)) {
    return res.status(400).render('erro', { mensagem: 'Este pedido não pode ser editado.' });
  }
  await itemModel.inativar(req.params.itemId);
  res.redirect(`/pedidos/${pedido.id}`);
});

router.post('/:id/confirmar', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  const ativos = pedido.itens.filter(i => i.ativo);
  if (ativos.length === 0) {
    return res.render('pedidos/detalhe', { pedido, erro: 'Adicione ao menos um item ao pedido.', catalogo: await catalogoModel.listarAtivos() });
  }
  const todosComArquivo = ativos.every(i => i.arquivo_id);
  if (!todosComArquivo) {
    return res.render('pedidos/detalhe', { pedido, erro: 'Todos os itens precisam de arquivo de arte.', catalogo: await catalogoModel.listarAtivos() });
  }
  const { numero_transferencia } = req.body;
  if (!numero_transferencia?.trim()) {
    return res.render('pedidos/detalhe', { pedido, erro: 'Número de transferência é obrigatório.', catalogo: await catalogoModel.listarAtivos() });
  }
  const pedidoAtualizado = await pedidoModel.atualizarStatus(pedido.id, {
    status: 'aguardando_analise',
    usuario_id: req.session.usuario.id,
    numero_transferencia,
    valor_total: ativos.reduce((acc, i) => acc + Number(i.valor), 0),
  });
  await notificarOperadoresEmail(pedidoAtualizado);
  res.redirect(`/pedidos/${pedido.id}`);
});

router.post('/:id/responder', async (req, res) => {
  const pedido = await pedidoModel.findById(req.params.id);
  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return res.status(404).render('erro', { mensagem: 'Pedido não encontrado.' });
  }
  const pedidoRespondido = await pedidoModel.atualizarStatus(pedido.id, {
    status: 'aguardando_analise',
    usuario_id: req.session.usuario.id,
    comentario: req.body.comentario,
  });
  await notificarOperadoresEmail(pedidoRespondido);
  res.redirect(`/pedidos/${pedido.id}`);
});

router.post('/:id/itens/:itemId/arquivo', upload.single('arquivo'), async (req, res) => {
  try {
    const pedido = await pedidoModel.findById(req.params.id);
    if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const arquivo = await arquivoModel.criar({
      item_id: req.params.itemId,
      nome_original: req.file.originalname,
      nome_arquivo: req.file.filename,
      caminho: req.file.path,
      mime_type: req.file.mimetype,
      tamanho: req.file.size,
    });
    res.json({ arquivo_id: arquivo.id, nome_original: arquivo.nome_original, caminho: arquivo.caminho });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.delete('/:id/itens/:itemId/arquivo/:arquivoId', async (req, res) => {
  try {
    const pedido = await pedidoModel.findById(req.params.id);
    if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const arquivo = await arquivoModel.findById(req.params.arquivoId);
    if (arquivo) {
      fs.rmSync(arquivo.caminho, { force: true });
      await arquivoModel.deletar(arquivo.id);
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id/itens/:itemId/arquivo/:arquivoId', async (req, res) => {
  try {
    const pedido = await pedidoModel.findById(req.params.id);
    if (!pedido || pedido.usuario_id !== req.session.usuario.id) return res.status(403).send();
    const arquivo = await arquivoModel.findById(req.params.arquivoId);
    if (!arquivo) return res.status(404).send();
    res.setHeader('Content-Type', arquivo.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome_original)}"`);
    res.sendFile(path.resolve(arquivo.caminho));
  } catch (err) {
    res.status(500).send();
  }
});

module.exports = router;
